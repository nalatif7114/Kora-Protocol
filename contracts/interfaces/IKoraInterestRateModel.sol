// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IKoraInterestRateModel
 * @notice Interface for Kora Protocol dynamic interest rate calculations.
 */
interface IKoraInterestRateModel {
    function calculateInterestRates(
        uint256 totalCash,
        uint256 totalDebt,
        uint256 reserveFactor
    ) external view returns (uint256 borrowRateRay, uint256 supplyRateRay);

    function getUtilizationRate(
        uint256 totalCash,
        uint256 totalDebt
    ) external pure returns (uint256 utilizationWad);

    function optimalUtilization() external view returns (uint256);
    function baseBorrowRate() external view returns (uint256);
    function slope1() external view returns (uint256);
    function slope2() external view returns (uint256);
}
