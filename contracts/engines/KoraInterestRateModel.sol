// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IKoraInterestRateModel} from "../interfaces/IKoraInterestRateModel.sol";
import {KoraMath} from "../libraries/KoraMath.sol";

/**
 * @title KoraInterestRateModel
 * @notice Two-kink utilization-based interest rate model for Kora Protocol.
 * @dev Computes continuous annual borrow and supply rates in Ray (10^27).
 */
contract KoraInterestRateModel is IKoraInterestRateModel {
    using KoraMath for uint256;

    uint256 public immutable override optimalUtilization; // In Wad (e.g., 0.80e18 = 80%)
    uint256 public immutable override baseBorrowRate;     // In Ray (e.g., 0.02e27 = 2% APR)
    uint256 public immutable override slope1;             // In Ray (e.g., 0.04e27 = 4% APR)
    uint256 public immutable override slope2;             // In Ray (e.g., 0.75e27 = 75% APR)

    error InvalidModelParameters();

    constructor(
        uint256 _optimalUtilization,
        uint256 _baseBorrowRate,
        uint256 _slope1,
        uint256 _slope2
    ) {
        if (_optimalUtilization == 0 || _optimalUtilization >= KoraMath.WAD) {
            revert InvalidModelParameters();
        }
        optimalUtilization = _optimalUtilization;
        baseBorrowRate = _baseBorrowRate;
        slope1 = _slope1;
        slope2 = _slope2;
    }

    /**
     * @notice Calculates the asset pool utilization rate in Wad (1e18).
     * @param totalCash Liquid cash currently in pool
     * @param totalDebt Total borrowed principal + accrued debt
     * @return utilizationWad Utilization ratio [0, 1e18]
     */
    function getUtilizationRate(
        uint256 totalCash,
        uint256 totalDebt
    ) public pure override returns (uint256 utilizationWad) {
        uint256 totalLiquidity = totalCash + totalDebt;
        if (totalLiquidity == 0) return 0;
        return (totalDebt * KoraMath.WAD) / totalLiquidity;
    }

    /**
     * @notice Computes dynamic borrow and supply APRs based on current pool utilization.
     * @param totalCash Liquid cash currently in pool
     * @param totalDebt Total borrowed debt in pool
     * @param reserveFactor Fraction of interest allocated to protocol treasury (in Wad)
     * @return borrowRateRay Annual borrow APR in Ray (10^27)
     * @return supplyRateRay Annual supply APY in Ray (10^27)
     */
    function calculateInterestRates(
        uint256 totalCash,
        uint256 totalDebt,
        uint256 reserveFactor
    ) external view override returns (uint256 borrowRateRay, uint256 supplyRateRay) {
        uint256 utilization = getUtilizationRate(totalCash, totalDebt);

        if (utilization <= optimalUtilization) {
            // Below or at optimal kink: Gentle slope
            // borrowRate = baseBorrowRate + (utilization / optimalUtilization) * slope1
            uint256 excessRate = (slope1 * utilization) / optimalUtilization;
            borrowRateRay = baseBorrowRate + excessRate;
        } else {
            // Above optimal kink: Steep jump slope
            // borrowRate = baseBorrowRate + slope1 + ((utilization - optimalUtilization) / (1 - optimalUtilization)) * slope2
            uint256 excessUtilization = utilization - optimalUtilization;
            uint256 maxExcessUtilization = KoraMath.WAD - optimalUtilization;
            uint256 jumpRate = (slope2 * excessUtilization) / maxExcessUtilization;
            borrowRateRay = baseBorrowRate + slope1 + jumpRate;
        }

        // Supply APY = borrowRate * utilization * (1 - reserveFactor)
        // Convert to Ray precision:
        uint256 grossSupplyRate = (borrowRateRay * utilization) / KoraMath.WAD;
        if (reserveFactor >= KoraMath.WAD) {
            supplyRateRay = 0;
        } else {
            uint256 factor = KoraMath.WAD - reserveFactor;
            supplyRateRay = (grossSupplyRate * factor) / KoraMath.WAD;
        }
    }
}
