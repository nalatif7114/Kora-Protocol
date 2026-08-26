// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IKoraRiskEngine
 * @notice Interface for Kora Protocol risk management, collateral valuation, and health factor calculations.
 */
interface IKoraRiskEngine {
    event ReserveUsedAsCollateralEnabled(address indexed asset, address indexed user);
    event ReserveUsedAsCollateralDisabled(address indexed asset, address indexed user);

    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralUSD,
            uint256 totalDebtUSD,
            uint256 availableBorrowsUSD,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );

    function validateBorrow(
        address user,
        address asset,
        uint256 amount
    ) external view;

    function validateWithdraw(
        address user,
        address asset,
        uint256 amount
    ) external view;

    function setUserUseReserveAsCollateral(
        address asset,
        address user,
        bool useAsCollateral
    ) external;

    function isUserUsingReserveAsCollateral(
        address asset,
        address user
    ) external view returns (bool);
}
