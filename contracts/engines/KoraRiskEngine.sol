// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IKoraRiskEngine} from "../interfaces/IKoraRiskEngine.sol";
import {IKoraReserveManager} from "../interfaces/IKoraReserveManager.sol";
import {IKoraOracleManager} from "../interfaces/IKoraOracleManager.sol";
import {IKoraConfig} from "../interfaces/IKoraConfig.sol";
import {KoraDataTypes} from "../libraries/KoraDataTypes.sol";
import {KoraMath} from "../libraries/KoraMath.sol";

/**
 * @title KoraRiskEngine
 * @notice Central risk evaluation engine responsible for collateral valuation, borrowing power, and Health Factor calculations.
 * @dev Employs strict directional rounding to protect protocol solvency.
 */
contract KoraRiskEngine is IKoraRiskEngine {
    using KoraMath for uint256;

    IKoraReserveManager public immutable reserveManager;
    IKoraOracleManager public immutable oracleManager;
    IKoraConfig public immutable config;
    address public lendingPool;

    struct AccountVars {
        uint256 totalCollateralUSD;
        uint256 totalDebtUSD;
        uint256 weightedLTVUSD;
        uint256 weightedThresholdUSD;
    }

    // Track user collateral preferences per asset
    mapping(address => mapping(address => bool)) private _userCollateralEnabled;

    error ZeroAddress();
    error InsufficientCollateral();
    error HealthFactorBelowOne();
    error CannotDisableCollateral();
    error OnlyLendingPool();

    modifier onlyPoolOrUser(address user) {
        if (msg.sender != lendingPool && msg.sender != user) revert OnlyLendingPool();
        _;
    }

    constructor(
        address _reserveManager,
        address _oracleManager,
        address _config
    ) {
        if (_reserveManager == address(0) || _oracleManager == address(0) || _config == address(0)) {
            revert ZeroAddress();
        }
        reserveManager = IKoraReserveManager(_reserveManager);
        oracleManager = IKoraOracleManager(_oracleManager);
        config = IKoraConfig(_config);
    }

    function setLendingPool(address _lendingPool) external {
        require(lendingPool == address(0), "PoolAlreadySet");
        lendingPool = _lendingPool;
    }

    function _calculateAccountData(address user) internal view returns (AccountVars memory vars) {
        address[] memory reserves = reserveManager.getReservesList();

        for (uint256 i = 0; i < reserves.length; i++) {
            address asset = reserves[i];
            KoraDataTypes.ReserveData memory reserve = reserveManager.getReserveData(asset);
            KoraDataTypes.UserReserveData memory userReserve = reserveManager.getUserReserveData(asset, user);
            uint256 unitDecimals = 10 ** reserve.configuration.decimals;

            // 1. Collateral Calculation (Floor)
            if (userReserve.scaledSupplyBalance > 0 && _userCollateralEnabled[asset][user]) {
                uint256 supplyBalance = userReserve.scaledSupplyBalance.rayMul(reserve.liquidityIndex);
                uint256 price = oracleManager.getAssetPrice(asset);
                uint256 assetUSD = (supplyBalance * price) / unitDecimals;

                vars.totalCollateralUSD += assetUSD;
                vars.weightedLTVUSD += (assetUSD * reserve.configuration.ltv) / KoraMath.WAD;
                vars.weightedThresholdUSD += (assetUSD * reserve.configuration.liquidationThreshold) / KoraMath.WAD;
            }

            // 2. Debt Calculation (Ceil)
            if (userReserve.scaledDebtBalance > 0) {
                uint256 debtBalance = userReserve.scaledDebtBalance.rayMulUp(reserve.borrowIndex);
                uint256 price = oracleManager.getAssetPrice(asset);
                uint256 debtUSD = (debtBalance * price + unitDecimals - 1) / unitDecimals;
                vars.totalDebtUSD += debtUSD;
            }
        }
    }

    /**
     * @notice Computes comprehensive account liquidity, USD collateral, debt, and Health Factor.
     */
    function getUserAccountData(address user)
        public
        view
        override
        returns (
            uint256 totalCollateralUSD,
            uint256 totalDebtUSD,
            uint256 availableBorrowsUSD,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        AccountVars memory vars = _calculateAccountData(user);

        totalCollateralUSD = vars.totalCollateralUSD;
        totalDebtUSD = vars.totalDebtUSD;

        if (vars.weightedLTVUSD > vars.totalDebtUSD) {
            availableBorrowsUSD = vars.weightedLTVUSD - vars.totalDebtUSD;
        } else {
            availableBorrowsUSD = 0;
        }

        if (vars.totalCollateralUSD > 0) {
            ltv = (vars.weightedLTVUSD * KoraMath.WAD) / vars.totalCollateralUSD;
            currentLiquidationThreshold = (vars.weightedThresholdUSD * KoraMath.WAD) / vars.totalCollateralUSD;
        }

        if (vars.totalDebtUSD == 0) {
            healthFactor = type(uint256).max;
        } else {
            // Health Factor = weightedThresholdUSD / totalDebtUSD (Round DOWN)
            healthFactor = (vars.weightedThresholdUSD * KoraMath.WAD) / vars.totalDebtUSD;
        }
    }

    /**
     * @notice Validates whether a proposed borrow operation meets collateralization requirements.
     */
    function validateBorrow(
        address user,
        address asset,
        uint256 amount
    ) external view override {
        KoraDataTypes.ReserveData memory reserve = reserveManager.getReserveData(asset);
        uint256 assetPrice = oracleManager.getAssetPrice(asset);
        uint256 unitDecimals = 10 ** reserve.configuration.decimals;

        // New debt in USD (Ceil)
        uint256 newDebtUSD = (amount * assetPrice + unitDecimals - 1) / unitDecimals;

        AccountVars memory vars = _calculateAccountData(user);

        uint256 availableBorrowsUSD = vars.weightedLTVUSD > vars.totalDebtUSD
            ? vars.weightedLTVUSD - vars.totalDebtUSD
            : 0;

        if (newDebtUSD > availableBorrowsUSD) {
            revert InsufficientCollateral();
        }

        uint256 postTotalDebt = vars.totalDebtUSD + newDebtUSD;
        uint256 postHF = (vars.weightedThresholdUSD * KoraMath.WAD) / postTotalDebt;

        if (postHF < KoraMath.WAD) {
            revert HealthFactorBelowOne();
        }
    }

    /**
     * @notice Validates whether a proposed collateral withdrawal preserves the Health Factor >= 1.0.
     */
    function validateWithdraw(
        address user,
        address asset,
        uint256 amount
    ) external view override {
        AccountVars memory vars = _calculateAccountData(user);

        // If user has no debt or asset is not enabled as collateral, withdrawal is unconditionally permitted
        if (vars.totalDebtUSD == 0 || !_userCollateralEnabled[asset][user]) {
            return;
        }

        KoraDataTypes.ReserveData memory reserve = reserveManager.getReserveData(asset);
        uint256 assetPrice = oracleManager.getAssetPrice(asset);
        uint256 unitDecimals = 10 ** reserve.configuration.decimals;

        uint256 withdrawUSD = (amount * assetPrice) / unitDecimals;
        uint256 withdrawThresholdLoss = (withdrawUSD * reserve.configuration.liquidationThreshold) / KoraMath.WAD;

        if (vars.weightedThresholdUSD <= withdrawThresholdLoss) {
            revert HealthFactorBelowOne();
        }

        uint256 postThresholdUSD = vars.weightedThresholdUSD - withdrawThresholdLoss;
        uint256 postHF = (postThresholdUSD * KoraMath.WAD) / vars.totalDebtUSD;

        if (postHF < KoraMath.WAD) {
            revert HealthFactorBelowOne();
        }
    }

    /**
     * @notice Enables or disables an asset as collateral for a specified user.
     */
    function setUserUseReserveAsCollateral(
        address asset,
        address user,
        bool useAsCollateral
    ) external override onlyPoolOrUser(user) {
        if (!useAsCollateral) {
            AccountVars memory vars = _calculateAccountData(user);

            if (vars.totalDebtUSD > 0 && _userCollateralEnabled[asset][user]) {
                _userCollateralEnabled[asset][user] = false;
                AccountVars memory postVars = _calculateAccountData(user);
                _userCollateralEnabled[asset][user] = true;

                uint256 postHF = (postVars.weightedThresholdUSD * KoraMath.WAD) / vars.totalDebtUSD;
                if (postHF < KoraMath.WAD) {
                    revert CannotDisableCollateral();
                }
            }
        }

        _userCollateralEnabled[asset][user] = useAsCollateral;

        if (useAsCollateral) {
            emit ReserveUsedAsCollateralEnabled(asset, user);
        } else {
            emit ReserveUsedAsCollateralDisabled(asset, user);
        }
    }

    function isUserUsingReserveAsCollateral(
        address asset,
        address user
    ) external view override returns (bool) {
        return _userCollateralEnabled[asset][user];
    }
}
