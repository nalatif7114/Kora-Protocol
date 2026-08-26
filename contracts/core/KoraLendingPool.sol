// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IKoraLendingPool} from "../interfaces/IKoraLendingPool.sol";
import {IKoraReserveManager} from "../interfaces/IKoraReserveManager.sol";
import {IKoraRiskEngine} from "../interfaces/IKoraRiskEngine.sol";
import {IKoraLiquidationEngine} from "../interfaces/IKoraLiquidationEngine.sol";
import {IKoraConfig} from "../interfaces/IKoraConfig.sol";
import {KoraDataTypes} from "../libraries/KoraDataTypes.sol";

/**
 * @title KoraLendingPool
 * @notice Core entrypoint for Kora Protocol supply, withdrawal, borrowing, debt repayment, and liquidations.
 * @dev Coordinates token transfers, reserve accounting, risk validation, and paused state checks.
 */
contract KoraLendingPool is IKoraLendingPool, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IKoraConfig public immutable config;
    IKoraReserveManager public immutable reserveManager;
    IKoraRiskEngine public riskEngine;
    IKoraLiquidationEngine public liquidationEngine;

    error ZeroAddress();
    error ZeroAmount();
    error ProtocolOrAssetPaused();
    error Unauthorized();

    modifier notPaused(address asset) {
        if (config.isAssetPaused(asset)) revert ProtocolOrAssetPaused();
        _;
    }

    constructor(address _config, address _reserveManager) {
        if (_config == address(0) || _reserveManager == address(0)) revert ZeroAddress();
        config = IKoraConfig(_config);
        reserveManager = IKoraReserveManager(_reserveManager);
    }

    // =============================================================
    //                       ADMIN CONFIGURATION
    // =============================================================

    function setRiskEngine(address _riskEngine) external {
        bytes32 adminRole = 0x00; // DEFAULT_ADMIN_ROLE
        (bool success, bytes memory data) = address(config).staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", adminRole, msg.sender)
        );
        if (!success || !abi.decode(data, (bool))) revert Unauthorized();

        riskEngine = IKoraRiskEngine(_riskEngine);
    }

    function setLiquidationEngine(address _liquidationEngine) external {
        bytes32 adminRole = 0x00; // DEFAULT_ADMIN_ROLE
        (bool success, bytes memory data) = address(config).staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", adminRole, msg.sender)
        );
        if (!success || !abi.decode(data, (bool))) revert Unauthorized();

        liquidationEngine = IKoraLiquidationEngine(_liquidationEngine);
    }

    function initReserve(
        address asset,
        uint8 decimals,
        uint256 supplyCap,
        uint256 borrowCap,
        uint256 reserveFactor,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    ) external {
        bytes32 adminRole = 0x00; // DEFAULT_ADMIN_ROLE
        (bool success, bytes memory data) = address(config).staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", adminRole, msg.sender)
        );
        if (!success || !abi.decode(data, (bool))) revert Unauthorized();

        reserveManager.initReserve(
            asset,
            decimals,
            supplyCap,
            borrowCap,
            reserveFactor,
            ltv,
            liquidationThreshold,
            liquidationBonus
        );
    }

    function setInterestRateModel(address asset, address rateModel) external {
        bytes32 adminRole = 0x00; // DEFAULT_ADMIN_ROLE
        (bool success, bytes memory data) = address(config).staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", adminRole, msg.sender)
        );
        if (!success || !abi.decode(data, (bool))) revert Unauthorized();

        reserveManager.setInterestRateModel(asset, rateModel);
    }

    function setReserveRates(
        address asset,
        uint128 liquidityRate,
        uint128 borrowRate
    ) external {
        bytes32 adminRole = 0x00; // DEFAULT_ADMIN_ROLE
        (bool success, bytes memory data) = address(config).staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", adminRole, msg.sender)
        );
        if (!success || !abi.decode(data, (bool))) revert Unauthorized();

        reserveManager.setReserveRates(asset, liquidityRate, borrowRate);
    }

    function addReserveLiquidity(address asset, uint256 amount) external {
        bytes32 adminRole = 0x00; // DEFAULT_ADMIN_ROLE
        (bool success, bytes memory data) = address(config).staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", adminRole, msg.sender)
        );
        if (!success || !abi.decode(data, (bool))) revert Unauthorized();

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        reserveManager.addReserveLiquidity(asset, amount);
    }

    // =============================================================
    //                      CORE USER ACTIONS
    // =============================================================

    /**
     * @notice Supplies underlying assets into the protocol on behalf of an address.
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external override nonReentrant notPaused(asset) returns (uint256 scaledShares) {
        if (amount == 0) revert ZeroAmount();
        if (onBehalfOf == address(0)) revert ZeroAddress();

        // 1. Update accounting and calculate shares to mint
        scaledShares = reserveManager.mintSupply(asset, onBehalfOf, amount);

        // 2. Transfer underlying asset from user to pool
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // 3. Emit event
        emit Supply(asset, msg.sender, onBehalfOf, amount, scaledShares);
    }

    /**
     * @notice Withdraws underlying assets from the protocol.
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override nonReentrant notPaused(asset) returns (uint256 actualAmountWithdrawn) {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        // 1. Update accounting and calculate shares to burn
        (uint256 scaledSharesBurned, uint256 withdrawn) = reserveManager.burnSupply(asset, msg.sender, amount);
        actualAmountWithdrawn = withdrawn;

        // 2. Risk Engine validation (collateral health factor preservation)
        if (address(riskEngine) != address(0)) {
            riskEngine.validateWithdraw(msg.sender, asset, actualAmountWithdrawn);
        }

        // 3. Transfer underlying asset from pool to recipient
        IERC20(asset).safeTransfer(to, actualAmountWithdrawn);

        // 4. Emit event
        emit Withdraw(asset, msg.sender, to, actualAmountWithdrawn, scaledSharesBurned);
    }

    /**
     * @notice Borrows underlying assets from the protocol.
     */
    function borrow(
        address asset,
        uint256 amount,
        address recipient
    ) external override nonReentrant notPaused(asset) returns (uint256 scaledDebt) {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();

        // 1. Risk Engine validation (collateral and borrowing power check)
        if (address(riskEngine) != address(0)) {
            riskEngine.validateBorrow(msg.sender, asset, amount);
        }

        // 2. Update accounting and mint scaled debt shares
        scaledDebt = reserveManager.mintDebt(asset, msg.sender, amount);

        // 3. Transfer borrowed asset from pool to recipient
        IERC20(asset).safeTransfer(recipient, amount);

        // 4. Emit event
        KoraDataTypes.ReserveData memory reserve = reserveManager.getReserveData(asset);
        emit Borrow(asset, msg.sender, msg.sender, recipient, amount, scaledDebt, reserve.borrowIndex);
    }

    /**
     * @notice Repays borrowed underlying assets on behalf of a borrower.
     */
    function repay(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external override nonReentrant notPaused(asset) returns (uint256 actualAmountRepaid) {
        if (amount == 0) revert ZeroAmount();
        if (onBehalfOf == address(0)) revert ZeroAddress();

        // 1. Update accounting and burn scaled debt shares
        (uint256 scaledDebtBurned, uint256 repaid) = reserveManager.burnDebt(asset, onBehalfOf, amount);
        actualAmountRepaid = repaid;

        // 2. Transfer repaid tokens from caller to pool
        IERC20(asset).safeTransferFrom(msg.sender, address(this), actualAmountRepaid);

        // 3. Emit event
        emit Repay(asset, msg.sender, onBehalfOf, actualAmountRepaid, scaledDebtBurned);
    }

    /**
     * @notice Liquidates an unhealthy borrower position, repaying debt and seizing collateral + bonus.
     */
    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address borrower,
        uint256 debtToCover,
        address to
    )
        external
        override
        nonReentrant
        notPaused(collateralAsset)
        notPaused(debtAsset)
        returns (uint256 actualDebtRepaid, uint256 collateralSeized)
    {
        if (to == address(0)) revert ZeroAddress();
        require(address(liquidationEngine) != address(0), "LiquidationEngineNotSet");

        // 1. Calculate liquidation opportunity and validation via Liquidation Engine
        (
            uint256 actualDebt,
            uint256 seizedCollateral,
            uint256 currentHF,
            ,
            
        ) = liquidationEngine.calculateLiquidationOpportunity(
            collateralAsset,
            debtAsset,
            borrower,
            debtToCover
        );

        actualDebtRepaid = actualDebt;
        collateralSeized = seizedCollateral;

        // 2. Transfer debt asset from liquidator to pool
        IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), actualDebtRepaid);

        // 3. Burn borrower debt in reserve manager
        reserveManager.burnDebt(debtAsset, borrower, actualDebtRepaid);

        // 4. Burn borrower collateral in reserve manager
        reserveManager.burnSupply(collateralAsset, borrower, collateralSeized);

        // 5. Transfer seized collateral from pool to liquidator
        IERC20(collateralAsset).safeTransfer(to, collateralSeized);

        // 6. Emit event
        emit LiquidationCall(
            collateralAsset,
            debtAsset,
            borrower,
            actualDebtRepaid,
            collateralSeized,
            msg.sender,
            currentHF < config.extremeHealthFactorThreshold()
        );
    }

    /**
     * @notice Enables or disables an asset as collateral for the caller.
     */
    function setUserUseReserveAsCollateral(
        address asset,
        bool useAsCollateral
    ) external override {
        require(address(riskEngine) != address(0), "RiskEngineNotSet");
        riskEngine.setUserUseReserveAsCollateral(asset, msg.sender, useAsCollateral);
    }

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    function getUserAccountData(address user)
        external
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
        if (address(riskEngine) == address(0)) {
            return (0, 0, 0, 0, 0, type(uint256).max);
        }
        return riskEngine.getUserAccountData(user);
    }

    function getReserveData(address asset) external view override returns (KoraDataTypes.ReserveData memory) {
        return reserveManager.getReserveData(asset);
    }

    function getUserReserveData(
        address asset,
        address user
    ) external view override returns (KoraDataTypes.UserReserveData memory) {
        return reserveManager.getUserReserveData(asset, user);
    }

    function getSupplyBalance(address asset, address user) external view override returns (uint256) {
        return reserveManager.getSupplyBalance(asset, user);
    }

    function getTotalSupply(address asset) external view override returns (uint256) {
        return reserveManager.getTotalSupply(asset);
    }

    function getDebtBalance(address asset, address user) external view override returns (uint256) {
        return reserveManager.getDebtBalance(asset, user);
    }

    function getTotalDebt(address asset) external view override returns (uint256) {
        return reserveManager.getTotalDebt(asset);
    }

    function getAvailableLiquidity(address asset) external view override returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }

    function getReservesList() external view override returns (address[] memory) {
        return reserveManager.getReservesList();
    }
}
