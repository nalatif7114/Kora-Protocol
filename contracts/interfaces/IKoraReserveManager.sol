// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {KoraDataTypes} from "../libraries/KoraDataTypes.sol";

/**
 * @title IKoraReserveManager
 * @notice Interface for Kora Protocol reserve state, scaled accounting, and debt lifecycle.
 */
interface IKoraReserveManager {
    event ReserveInitialized(address indexed asset, uint8 decimals);
    event ReserveIndexesUpdated(
        address indexed asset,
        uint256 liquidityIndex,
        uint256 borrowIndex,
        uint256 liquidityRate,
        uint256 borrowRate
    );
    event InterestRateModelUpdated(address indexed asset, address indexed rateModel);

    function initReserve(
        address asset,
        uint8 decimals,
        uint256 supplyCap,
        uint256 borrowCap,
        uint256 reserveFactor,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    ) external;

    function setInterestRateModel(address asset, address rateModel) external;

    function updateCumulativeIndexes(address asset) external;

    function setReserveRates(
        address asset,
        uint128 liquidityRate,
        uint128 borrowRate
    ) external;

    function addReserveLiquidity(
        address asset,
        uint256 amount
    ) external;

    function mintSupply(
        address asset,
        address user,
        uint256 amount
    ) external returns (uint256 scaledShares);

    function burnSupply(
        address asset,
        address user,
        uint256 amount
    ) external returns (uint256 scaledSharesToBurn, uint256 actualAmountWithdrawn);

    function mintDebt(
        address asset,
        address user,
        uint256 amount
    ) external returns (uint256 scaledDebt);

    function burnDebt(
        address asset,
        address user,
        uint256 amount
    ) external returns (uint256 scaledDebtToBurn, uint256 actualAmountRepaid);

    function getReserveData(address asset) external view returns (KoraDataTypes.ReserveData memory);
    function getUserReserveData(address asset, address user) external view returns (KoraDataTypes.UserReserveData memory);
    function getSupplyBalance(address asset, address user) external view returns (uint256);
    function getTotalSupply(address asset) external view returns (uint256);
    function getDebtBalance(address asset, address user) external view returns (uint256);
    function getTotalDebt(address asset) external view returns (uint256);
    function getInterestRateModel(address asset) external view returns (address);
    function getReservesList() external view returns (address[] memory);
}
