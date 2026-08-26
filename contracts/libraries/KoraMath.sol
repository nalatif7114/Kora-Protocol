// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title KoraMath
 * @notice Fixed-point math library implementing Wad (18 decimals) and Ray (27 decimals) arithmetic
 *         with explicit directional rounding support to enforce protocol solvency invariants.
 * @dev Rounding modes strictly comply with the Kora Protocol Rounding Matrix:
 *      - Floor (round down): standard multiplications and divisions
 *      - Ceil (round up): used for debt accrual, liability accounting, and share conversions where protocol protection is mandatory.
 */
library KoraMath {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant HALF_WAD = 0.5e18;
    uint256 internal constant RAY = 1e27;
    uint256 internal constant HALF_RAY = 0.5e27;
    uint256 internal constant WAD_RAY_RATIO = 1e9;
    uint256 internal constant SECONDS_PER_YEAR = 31536000; // 365 days * 86400 seconds
    uint256 internal constant INITIAL_INDEX = 1e27;

    error MathOverflow();
    error DivisionByZero();

    // =============================================================
    //                      WAD ARITHMETIC (10^18)
    // =============================================================

    /**
     * @notice Multiplies two Wad values, rounding DOWN (Floor).
     */
    function wadMul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0 || b == 0) return 0;
        return (a * b) / WAD;
    }

    /**
     * @notice Multiplies two Wad values, rounding UP (Ceil).
     */
    function wadMulUp(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0 || b == 0) return 0;
        return (a * b + WAD - 1) / WAD;
    }

    /**
     * @notice Divides two Wad values, rounding DOWN (Floor).
     */
    function wadDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b == 0) revert DivisionByZero();
        if (a == 0) return 0;
        return (a * WAD) / b;
    }

    /**
     * @notice Divides two Wad values, rounding UP (Ceil).
     */
    function wadDivUp(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b == 0) revert DivisionByZero();
        if (a == 0) return 0;
        return (a * WAD + b - 1) / b;
    }

    // =============================================================
    //                      RAY ARITHMETIC (10^27)
    // =============================================================

    /**
     * @notice Multiplies two Ray values, rounding DOWN (Floor).
     */
    function rayMul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0 || b == 0) return 0;
        return (a * b) / RAY;
    }

    /**
     * @notice Multiplies two Ray values, rounding UP (Ceil).
     */
    function rayMulUp(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0 || b == 0) return 0;
        return (a * b + RAY - 1) / RAY;
    }

    /**
     * @notice Divides two Ray values, rounding DOWN (Floor).
     */
    function rayDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b == 0) revert DivisionByZero();
        if (a == 0) return 0;
        return (a * RAY) / b;
    }

    /**
     * @notice Divides two Ray values, rounding UP (Ceil).
     */
    function rayDivUp(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b == 0) revert DivisionByZero();
        if (a == 0) return 0;
        return (a * RAY + b - 1) / b;
    }

    // =============================================================
    //                 CONVERSIONS & COMPOUNDING
    // =============================================================

    /**
     * @notice Converts Ray (10^27) to Wad (10^18) rounding DOWN.
     */
    function rayToWad(uint256 a) internal pure returns (uint256) {
        return a / WAD_RAY_RATIO;
    }

    /**
     * @notice Converts Ray (10^27) to Wad (10^18) rounding UP.
     */
    function rayToWadUp(uint256 a) internal pure returns (uint256) {
        if (a == 0) return 0;
        return (a + WAD_RAY_RATIO - 1) / WAD_RAY_RATIO;
    }

    /**
     * @notice Converts Wad (10^18) to Ray (10^27).
     */
    function wadToRay(uint256 a) internal pure returns (uint256) {
        return a * WAD_RAY_RATIO;
    }

    /**
     * @notice Computes linear interest accumulation factor over delta time:
     *         Factor = RAY + (ratePerYearRay * timeDelta) / SECONDS_PER_YEAR
     * @param rateRay Annual interest rate expressed in Ray (1e27)
     * @param lastUpdateTimestamp Timestamp of previous index update
     * @param currentTimestamp Current block timestamp
     * @return Interest factor in Ray
     */
    function calculateLinearInterest(
        uint256 rateRay,
        uint40 lastUpdateTimestamp,
        uint256 currentTimestamp
    ) internal pure returns (uint256) {
        if (currentTimestamp <= lastUpdateTimestamp || rateRay == 0) {
            return RAY;
        }
        uint256 timeDelta = currentTimestamp - uint256(lastUpdateTimestamp);
        return RAY + (rateRay * timeDelta) / SECONDS_PER_YEAR;
    }
}
