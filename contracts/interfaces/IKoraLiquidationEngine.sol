// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IKoraLiquidationEngine
 * @notice Interface for Kora Protocol liquidation operations, debt repayment, and collateral seizure.
 */
interface IKoraLiquidationEngine {
    event LiquidationCall(
        address indexed collateralAsset,
        address indexed debtAsset,
        address indexed borrower,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount,
        address liquidator,
        bool isExtreme
    );

    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address borrower,
        uint256 debtToCover,
        bool receiveNativeToken
    ) external returns (uint256 actualDebtRepaid, uint256 collateralSeized);

    function calculateLiquidationOpportunity(
        address collateralAsset,
        address debtAsset,
        address borrower,
        uint256 requestedDebtToCover
    )
        external
        view
        returns (
            uint256 actualDebtToCover,
            uint256 collateralToSeize,
            uint256 currentHealthFactor,
            uint256 applicableCloseFactor,
            uint256 liquidationBonus
        );
}
