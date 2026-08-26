// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title MockAggregatorV3
 * @notice Mock Chainlink AggregatorV3 for testing price feeds, staleness, and round data.
 */
contract MockAggregatorV3 {
    uint8 private _decimals;
    string private _description;
    uint80 private _roundId;
    int256 private _answer;
    uint256 private _startedAt;
    uint256 private _updatedAt;
    uint80 private _answeredInRound;

    constructor(
        uint8 decimals_,
        string memory description_,
        int256 initialAnswer
    ) {
        _decimals = decimals_;
        _description = description_;
        _roundId = 1;
        _answer = initialAnswer;
        _startedAt = block.timestamp;
        _updatedAt = block.timestamp;
        _answeredInRound = 1;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function description() external view returns (string memory) {
        return _description;
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _answer, _startedAt, _updatedAt, _answeredInRound);
    }

    function updateAnswer(int256 newAnswer) external {
        _roundId++;
        _answer = newAnswer;
        _updatedAt = block.timestamp;
        _answeredInRound = _roundId;
    }

    function updateRoundData(
        uint80 roundId,
        int256 answer,
        uint256 updatedAt,
        uint80 answeredInRound
    ) external {
        _roundId = roundId;
        _answer = answer;
        _updatedAt = updatedAt;
        _answeredInRound = answeredInRound;
    }
}
