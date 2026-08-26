// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title KoraDataTypes
 * @notice Data structures for Kora Protocol core lending and reserve accounting.
 */
library KoraDataTypes {
    /**
     * @notice Reserve configuration flags and parameters packed for gas efficiency.
     */
    struct ReserveConfiguration {
        bool isActive;               // If false, all interactions with reserve revert
        bool isFrozen;               // If true, supply and borrow are halted; withdraw and repay remain active
        bool isPaused;               // Emergency pause toggle for this individual asset
        uint8 decimals;              // Underlying asset decimals (e.g., 6 for USDC, 18 for WETH)
        uint256 supplyCap;           // Maximum aggregate supply allowed (0 = unlimited)
        uint256 borrowCap;           // Maximum aggregate borrow allowed (0 = unlimited)
        uint256 reserveFactor;       // Protocol cut of accrued interest in Wad (1e18 = 100%)
        uint256 ltv;                 // Loan to value ratio in Wad (e.g., 0.75e18 = 75%)
        uint256 liquidationThreshold;// Liquidation threshold in Wad (e.g., 0.80e18 = 80%)
        uint256 liquidationBonus;    // Liquidation bonus/penalty in Wad (e.g., 0.05e18 = 5%)
    }

    /**
     * @notice Global state of an individual asset reserve in Kora.
     */
    struct ReserveData {
        ReserveConfiguration configuration;
        // Cumulative indices (initialized to 1e27 RAY)
        uint128 liquidityIndex;      // Cumulative supply index in Ray
        uint128 currentLiquidityRate;// Current annual supply rate in Ray
        uint128 borrowIndex;         // Cumulative borrow index in Ray
        uint128 currentBorrowRate;   // Current annual borrow rate in Ray
        uint40 lastUpdateTimestamp;  // Timestamp of the last index accrual update
        // Aggregate accounting
        uint256 totalScaledSupply;   // Sum of all user scaled supply shares
        uint256 totalScaledDebt;     // Sum of all user scaled debt shares
        uint256 totalCash;           // Underlying token balance currently liquid in pool
        uint256 accruedToTreasury;   // Accumulated protocol revenue in underlying asset units
        // Token wrappers
        address depositTokenAddress; // Optional receipt token address (kToken)
        address debtTokenAddress;    // Optional variable debt token address (dToken)
    }

    /**
     * @notice Individual user position within an asset reserve.
     */
    struct UserReserveData {
        uint256 scaledSupplyBalance; // User's supply shares (raw balance = scaledSupplyBalance * liquidityIndex)
        uint256 scaledDebtBalance;   // User's debt shares (raw debt = scaledDebtBalance * borrowIndex)
        bool useAsCollateral;        // Whether user has enabled this asset as collateral
    }
}
