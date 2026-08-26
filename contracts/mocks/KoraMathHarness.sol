// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {KoraMath} from "../libraries/KoraMath.sol";

/**
 * @title KoraMathHarness
 * @notice Test harness exposing all KoraMath internal library functions for unit testing.
 */
contract KoraMathHarness {
    function wadMul(uint256 a, uint256 b) external pure returns (uint256) {
        return KoraMath.wadMul(a, b);
    }

    function wadMulUp(uint256 a, uint256 b) external pure returns (uint256) {
        return KoraMath.wadMulUp(a, b);
    }

    function wadDiv(uint256 a, uint256 b) external pure returns (uint256) {
        return KoraMath.wadDiv(a, b);
    }

    function wadDivUp(uint256 a, uint256 b) external pure returns (uint256) {
        return KoraMath.wadDivUp(a, b);
    }

    function rayMul(uint256 a, uint256 b) external pure returns (uint256) {
        return KoraMath.rayMul(a, b);
    }

    function rayMulUp(uint256 a, uint256 b) external pure returns (uint256) {
        return KoraMath.rayMulUp(a, b);
    }

    function rayDiv(uint256 a, uint256 b) external pure returns (uint256) {
        return KoraMath.rayDiv(a, b);
    }

    function rayDivUp(uint256 a, uint256 b) external pure returns (uint256) {
        return KoraMath.rayDivUp(a, b);
    }

    function rayToWad(uint256 a) external pure returns (uint256) {
        return KoraMath.rayToWad(a);
    }

    function rayToWadUp(uint256 a) external pure returns (uint256) {
        return KoraMath.rayToWadUp(a);
    }

    function wadToRay(uint256 a) external pure returns (uint256) {
        return KoraMath.wadToRay(a);
    }

    function calculateLinearInterest(
        uint256 rateRay,
        uint40 lastUpdateTimestamp,
        uint256 currentTimestamp
    ) external pure returns (uint256) {
        return KoraMath.calculateLinearInterest(rateRay, lastUpdateTimestamp, currentTimestamp);
    }
}
