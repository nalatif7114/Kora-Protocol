// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {KoraDataTypes} from "../libraries/KoraDataTypes.sol";

/**
 * @title IKoraLendingPool
 * @notice Main user-facing interface for the Kora Lending & Borrowing Protocol.
 */
interface IKoraLendingPool {
    event Supply(
        address indexed asset,
        address indexed caller,
        address indexed onBehalfOf,
        uint256 amount,
        uint256 scaledShares
    );

    event Withdraw(
        address indexed asset,
        address indexed caller,
        address indexed to,
        uint256 amount,
        uint256 scaledSharesBurned
    );

    event Borrow(
        address indexed asset,
        address indexed caller,
        address indexed onBehalfOf,
        address recipient,
        uint256 amount,
        uint256 scaledDebt,
        uint256 borrowIndex
    );

    event Repay(
        address indexed asset,
        address indexed caller,
        address indexed onBehalfOf,
        uint256 amount,
        uint256 scaledDebtBurned
    );

    event LiquidationCall(
        address indexed collateralAsset,
        address indexed debtAsset,
        address indexed borrower,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount,
        address liquidator,
        bool isExtreme
    );

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external returns (uint256 scaledShares);

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256 actualAmountWithdrawn);

    function borrow(
        address asset,
        uint256 amount,
        address recipient
    ) external returns (uint256 scaledDebt);

    function repay(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external returns (uint256 actualAmountRepaid);

    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address borrower,
        uint256 debtToCover,
        address to
    ) external returns (uint256 actualDebtRepaid, uint256 collateralSeized);

    function setUserUseReserveAsCollateral(
        address asset,
        bool useAsCollateral
    ) external;

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

    function getReserveData(address asset) external view returns (KoraDataTypes.ReserveData memory);
    function getUserReserveData(address asset, address user) external view returns (KoraDataTypes.UserReserveData memory);
    function getSupplyBalance(address asset, address user) external view returns (uint256);
    function getTotalSupply(address asset) external view returns (uint256);
    function getDebtBalance(address asset, address user) external view returns (uint256);
    function getTotalDebt(address asset) external view returns (uint256);
    function getAvailableLiquidity(address asset) external view returns (uint256);
    function getReservesList() external view returns (address[] memory);
}
