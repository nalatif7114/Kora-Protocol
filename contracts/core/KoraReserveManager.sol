// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IKoraReserveManager} from "../interfaces/IKoraReserveManager.sol";
import {IKoraInterestRateModel} from "../interfaces/IKoraInterestRateModel.sol";
import {KoraDataTypes} from "../libraries/KoraDataTypes.sol";
import {KoraMath} from "../libraries/KoraMath.sol";

/**
 * @title KoraReserveManager
 * @notice Manages reserve storage, scaled balance accounting, debt, and deterministic index progression.
 * @dev Enforces the Kora Protocol Rounding Matrix and accounting invariants.
 */
contract KoraReserveManager is IKoraReserveManager {
    using KoraMath for uint256;

    address public lendingPool;
    address public configAddress;

    mapping(address => KoraDataTypes.ReserveData) private _reserves;
    mapping(address => mapping(address => KoraDataTypes.UserReserveData)) private _userReserves;
    mapping(address => address) private _interestRateModels;
    address[] private _reservesList;

    error OnlyLendingPool();
    error ReserveAlreadyInitialized();
    error ReserveNotActive();
    error ReserveFrozen();
    error ZeroAmount();
    error ZeroSharesMinted();
    error InsufficientBalance();
    error InsufficientLiquidity();
    error SupplyCapExceeded();
    error BorrowCapExceeded();
    error NoDebt();
    error InvalidConfiguration();

    modifier onlyLendingPool() {
        if (msg.sender != lendingPool) revert OnlyLendingPool();
        _;
    }

    constructor(address _configAddress) {
        configAddress = _configAddress;
    }

    function setLendingPool(address _lendingPool) external {
        require(lendingPool == address(0), "PoolAlreadySet");
        lendingPool = _lendingPool;
    }

    /**
     * @notice Initializes a new asset reserve.
     */
    function initReserve(
        address asset,
        uint8 decimals,
        uint256 supplyCap,
        uint256 borrowCap,
        uint256 reserveFactor,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    ) external override onlyLendingPool {
        if (_reserves[asset].configuration.isActive) revert ReserveAlreadyInitialized();
        if (decimals == 0 || decimals > 18) revert InvalidConfiguration();

        _reserves[asset].configuration = KoraDataTypes.ReserveConfiguration({
            isActive: true,
            isFrozen: false,
            isPaused: false,
            decimals: decimals,
            supplyCap: supplyCap,
            borrowCap: borrowCap,
            reserveFactor: reserveFactor,
            ltv: ltv,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus
        });

        _reserves[asset].liquidityIndex = uint128(1e27); // 1e27 RAY
        _reserves[asset].borrowIndex = uint128(1e27);    // 1e27 RAY
        _reserves[asset].lastUpdateTimestamp = uint40(block.timestamp);

        _reservesList.push(asset);
        emit ReserveInitialized(asset, decimals);
    }

    /**
     * @notice Sets or updates the interest rate model for an asset reserve.
     */
    function setInterestRateModel(address asset, address rateModel) external override onlyLendingPool {
        if (!_reserves[asset].configuration.isActive) revert ReserveNotActive();
        updateCumulativeIndexes(asset);
        _interestRateModels[asset] = rateModel;
        _updateReserveRates(asset);
        emit InterestRateModelUpdated(asset, rateModel);
    }

    /**
     * @notice Updates cumulative liquidity and borrow indexes based on elapsed time.
     */
    function updateCumulativeIndexes(address asset) public override {
        KoraDataTypes.ReserveData storage reserve = _reserves[asset];
        if (!reserve.configuration.isActive) revert ReserveNotActive();

        uint40 currentTimestamp = uint40(block.timestamp);
        if (currentTimestamp == reserve.lastUpdateTimestamp) {
            return;
        }

        if (reserve.currentBorrowRate > 0) {
            uint256 borrowFactor = KoraMath.calculateLinearInterest(
                reserve.currentBorrowRate,
                reserve.lastUpdateTimestamp,
                currentTimestamp
            );
            // Borrow index rounds UP (Ceil)
            reserve.borrowIndex = uint128(uint256(reserve.borrowIndex).rayMulUp(borrowFactor));
        }

        if (reserve.currentLiquidityRate > 0) {
            uint256 liquidityFactor = KoraMath.calculateLinearInterest(
                reserve.currentLiquidityRate,
                reserve.lastUpdateTimestamp,
                currentTimestamp
            );
            // Liquidity index rounds DOWN (Floor)
            reserve.liquidityIndex = uint128(uint256(reserve.liquidityIndex).rayMul(liquidityFactor));
        }

        reserve.lastUpdateTimestamp = currentTimestamp;

        emit ReserveIndexesUpdated(
            asset,
            reserve.liquidityIndex,
            reserve.borrowIndex,
            reserve.currentLiquidityRate,
            reserve.currentBorrowRate
        );
    }

    /**
     * @notice Sets current reserve annual interest rates directly.
     */
    function setReserveRates(
        address asset,
        uint128 liquidityRate,
        uint128 borrowRate
    ) external override onlyLendingPool {
        updateCumulativeIndexes(asset);
        _reserves[asset].currentLiquidityRate = liquidityRate;
        _reserves[asset].currentBorrowRate = borrowRate;
    }

    /**
     * @notice Injects cash liquidity directly into reserve.
     */
    function addReserveLiquidity(
        address asset,
        uint256 amount
    ) external override onlyLendingPool {
        if (amount == 0) revert ZeroAmount();
        _reserves[asset].totalCash += amount;
        _updateReserveRates(asset);
    }

    /**
     * @notice Accrues interest and calculates scaled shares to mint for a deposit.
     * @dev Rounding: Shares minted round DOWN (Floor).
     */
    function mintSupply(
        address asset,
        address user,
        uint256 amount
    ) external override onlyLendingPool returns (uint256 scaledShares) {
        if (amount == 0) revert ZeroAmount();

        updateCumulativeIndexes(asset);
        KoraDataTypes.ReserveData storage reserve = _reserves[asset];
        if (reserve.configuration.isFrozen) revert ReserveFrozen();

        // Round DOWN: scaledShares = amount / liquidityIndex
        scaledShares = amount.rayDiv(reserve.liquidityIndex);
        if (scaledShares == 0) revert ZeroSharesMinted();

        reserve.totalScaledSupply += scaledShares;
        reserve.totalCash += amount;

        // Verify supply cap
        if (reserve.configuration.supplyCap > 0) {
            uint256 currentTotalSupply = reserve.totalScaledSupply.rayMul(reserve.liquidityIndex);
            if (currentTotalSupply > reserve.configuration.supplyCap) {
                revert SupplyCapExceeded();
            }
        }

        _userReserves[asset][user].scaledSupplyBalance += scaledShares;
        _updateReserveRates(asset);
    }

    /**
     * @notice Accrues interest and calculates scaled shares to burn for a withdrawal.
     * @dev Rounding: Shares burned round UP (Ceil) when specifying exact underlying amount.
     */
    function burnSupply(
        address asset,
        address user,
        uint256 amount
    ) external override onlyLendingPool returns (uint256 scaledSharesToBurn, uint256 actualAmountWithdrawn) {
        if (amount == 0) revert ZeroAmount();

        updateCumulativeIndexes(asset);
        KoraDataTypes.ReserveData storage reserve = _reserves[asset];
        KoraDataTypes.UserReserveData storage userReserve = _userReserves[asset][user];

        uint256 userScaledBalance = userReserve.scaledSupplyBalance;
        if (userScaledBalance == 0) revert InsufficientBalance();

        if (amount == type(uint256).max) {
            scaledSharesToBurn = userScaledBalance;
            actualAmountWithdrawn = scaledSharesToBurn.rayMul(reserve.liquidityIndex);
        } else {
            scaledSharesToBurn = amount.rayDivUp(reserve.liquidityIndex);
            if (scaledSharesToBurn > userScaledBalance) {
                uint256 maxUserAmount = userScaledBalance.rayMul(reserve.liquidityIndex);
                if (amount > maxUserAmount) revert InsufficientBalance();
                scaledSharesToBurn = userScaledBalance;
                actualAmountWithdrawn = maxUserAmount;
            } else {
                actualAmountWithdrawn = amount;
            }
        }

        if (actualAmountWithdrawn == 0) revert ZeroAmount();
        if (reserve.totalCash < actualAmountWithdrawn) revert InsufficientLiquidity();

        userReserve.scaledSupplyBalance -= scaledSharesToBurn;
        reserve.totalScaledSupply -= scaledSharesToBurn;
        reserve.totalCash -= actualAmountWithdrawn;
        _updateReserveRates(asset);
    }

    /**
     * @notice Mints scaled debt shares upon borrowing underlying asset.
     * @dev Rounding: Scaled debt shares round UP (Ceil).
     */
    function mintDebt(
        address asset,
        address user,
        uint256 amount
    ) external override onlyLendingPool returns (uint256 scaledDebt) {
        if (amount == 0) revert ZeroAmount();

        updateCumulativeIndexes(asset);
        KoraDataTypes.ReserveData storage reserve = _reserves[asset];
        if (reserve.configuration.isFrozen) revert ReserveFrozen();
        if (reserve.totalCash < amount) revert InsufficientLiquidity();

        // Round UP: scaledDebt = amount / borrowIndex
        scaledDebt = amount.rayDivUp(reserve.borrowIndex);
        if (scaledDebt == 0) revert ZeroSharesMinted();

        // Verify borrow cap
        if (reserve.configuration.borrowCap > 0) {
            uint256 currentTotalDebt = (reserve.totalScaledDebt + scaledDebt).rayMulUp(reserve.borrowIndex);
            if (currentTotalDebt > reserve.configuration.borrowCap) {
                revert BorrowCapExceeded();
            }
        }

        _userReserves[asset][user].scaledDebtBalance += scaledDebt;
        reserve.totalScaledDebt += scaledDebt;
        reserve.totalCash -= amount;

        _updateReserveRates(asset);
    }

    /**
     * @notice Burns scaled debt shares upon repayment of borrowed asset.
     * @dev Rounding: Scaled debt burned rounds DOWN (Floor) on partial repayments.
     */
    function burnDebt(
        address asset,
        address user,
        uint256 amount
    ) external override onlyLendingPool returns (uint256 scaledDebtToBurn, uint256 actualAmountRepaid) {
        if (amount == 0) revert ZeroAmount();

        updateCumulativeIndexes(asset);
        KoraDataTypes.ReserveData storage reserve = _reserves[asset];
        KoraDataTypes.UserReserveData storage userReserve = _userReserves[asset][user];

        uint256 userScaledDebt = userReserve.scaledDebtBalance;
        if (userScaledDebt == 0) revert NoDebt();

        uint256 currentDebt = userScaledDebt.rayMulUp(reserve.borrowIndex);

        if (amount >= currentDebt || amount == type(uint256).max) {
            // Full repayment
            scaledDebtToBurn = userScaledDebt;
            actualAmountRepaid = currentDebt;
        } else {
            // Partial repayment: round DOWN debt reduction to prevent over-crediting
            scaledDebtToBurn = amount.rayDiv(reserve.borrowIndex);
            actualAmountRepaid = amount;
        }

        userReserve.scaledDebtBalance -= scaledDebtToBurn;
        reserve.totalScaledDebt -= scaledDebtToBurn;
        reserve.totalCash += actualAmountRepaid;

        _updateReserveRates(asset);
    }

    // =============================================================
    //                       INTERNAL HELPERS
    // =============================================================

    function _updateReserveRates(address asset) internal {
        address rateModel = _interestRateModels[asset];
        if (rateModel != address(0)) {
            KoraDataTypes.ReserveData storage reserve = _reserves[asset];
            uint256 totalDebt = reserve.totalScaledDebt.rayMulUp(reserve.borrowIndex);
            (uint256 borrowRate, uint256 supplyRate) = IKoraInterestRateModel(rateModel).calculateInterestRates(
                reserve.totalCash,
                totalDebt,
                reserve.configuration.reserveFactor
            );
            reserve.currentBorrowRate = uint128(borrowRate);
            reserve.currentLiquidityRate = uint128(supplyRate);
        }
    }

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    function getReserveData(address asset) external view override returns (KoraDataTypes.ReserveData memory) {
        return _reserves[asset];
    }

    function getUserReserveData(
        address asset,
        address user
    ) external view override returns (KoraDataTypes.UserReserveData memory) {
        return _userReserves[asset][user];
    }

    function getSupplyBalance(address asset, address user) external view override returns (uint256) {
        KoraDataTypes.ReserveData memory reserve = _reserves[asset];
        KoraDataTypes.UserReserveData memory userReserve = _userReserves[asset][user];
        if (userReserve.scaledSupplyBalance == 0) return 0;
        return userReserve.scaledSupplyBalance.rayMul(reserve.liquidityIndex);
    }

    function getTotalSupply(address asset) external view override returns (uint256) {
        KoraDataTypes.ReserveData memory reserve = _reserves[asset];
        if (reserve.totalScaledSupply == 0) return 0;
        return reserve.totalScaledSupply.rayMul(reserve.liquidityIndex);
    }

    function getDebtBalance(address asset, address user) external view override returns (uint256) {
        KoraDataTypes.ReserveData memory reserve = _reserves[asset];
        KoraDataTypes.UserReserveData memory userReserve = _userReserves[asset][user];
        if (userReserve.scaledDebtBalance == 0) return 0;
        return userReserve.scaledDebtBalance.rayMulUp(reserve.borrowIndex);
    }

    function getTotalDebt(address asset) external view override returns (uint256) {
        KoraDataTypes.ReserveData memory reserve = _reserves[asset];
        if (reserve.totalScaledDebt == 0) return 0;
        return reserve.totalScaledDebt.rayMulUp(reserve.borrowIndex);
    }

    function getInterestRateModel(address asset) external view override returns (address) {
        return _interestRateModels[asset];
    }

    function getReservesList() external view override returns (address[] memory) {
        return _reservesList;
    }
}
