// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IKoraOracleManager} from "../interfaces/IKoraOracleManager.sol";
import {IKoraConfig} from "../interfaces/IKoraConfig.sol";

interface IChainlinkAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title KoraOracleManager
 * @notice Centralized price feed aggregator and decimal normalizer with multi-tier staleness guards.
 * @dev Normalizes all asset prices to 18-decimal USD base units (WAD).
 */
contract KoraOracleManager is IKoraOracleManager {
    IKoraConfig public immutable config;

    struct FeedInfo {
        address source;
        uint256 maxStaleness; // Max allowable seconds since last oracle update
        uint8 decimals;
    }

    mapping(address => FeedInfo) private _assetFeeds;

    error ZeroAddress();
    error Unauthorized();
    error FeedNotConfigured();
    error InvalidPrice();
    error InvalidTimestamp();
    error StalePrice();
    error StaleRound();
    error InvalidStalenessWindow();

    constructor(address _config) {
        if (_config == address(0)) revert ZeroAddress();
        config = IKoraConfig(_config);
    }

    /**
     * @notice Registers or updates a Chainlink price feed source for an asset.
     */
    function setAssetSource(
        address asset,
        address source,
        uint256 maxStaleness
    ) external override {
        bytes32 adminRole = 0x00; // DEFAULT_ADMIN_ROLE
        (bool success, bytes memory data) = address(config).staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", adminRole, msg.sender)
        );
        if (!success || !abi.decode(data, (bool))) revert Unauthorized();

        if (asset == address(0) || source == address(0)) revert ZeroAddress();
        if (maxStaleness == 0 || maxStaleness > 86400 * 7) revert InvalidStalenessWindow();

        uint8 feedDecimals = IChainlinkAggregatorV3(source).decimals();

        _assetFeeds[asset] = FeedInfo({
            source: source,
            maxStaleness: maxStaleness,
            decimals: feedDecimals
        });

        emit AssetSourceUpdated(asset, source, maxStaleness);
    }

    /**
     * @notice Fetches and normalizes the current price of an asset in 18-decimal USD units.
     * @param asset The address of the token
     * @return priceUsdWad The asset price in 18-decimal USD base units
     */
    function getAssetPrice(address asset) external view override returns (uint256 priceUsdWad) {
        FeedInfo memory feed = _assetFeeds[asset];
        if (feed.source == address(0)) revert FeedNotConfigured();

        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = IChainlinkAggregatorV3(feed.source).latestRoundData();

        // 1. Sanity & Bounds Checks
        if (answer <= 0) revert InvalidPrice();
        if (updatedAt == 0 || block.timestamp < updatedAt) revert InvalidTimestamp();
        if (block.timestamp - updatedAt > feed.maxStaleness) revert StalePrice();
        if (answeredInRound < roundId) revert StaleRound();

        uint256 rawPrice = uint256(answer);

        // 2. Decimal Normalization to 18 decimals (WAD)
        if (feed.decimals == 18) {
            priceUsdWad = rawPrice;
        } else if (feed.decimals < 18) {
            priceUsdWad = rawPrice * (10 ** (18 - feed.decimals));
        } else {
            priceUsdWad = rawPrice / (10 ** (feed.decimals - 18));
        }
    }

    function getAssetSource(address asset) external view override returns (address) {
        return _assetFeeds[asset].source;
    }

    function getAssetMaxStaleness(address asset) external view override returns (uint256) {
        return _assetFeeds[asset].maxStaleness;
    }
}
