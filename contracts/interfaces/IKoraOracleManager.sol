// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IKoraOracleManager
 * @notice Interface for Kora Protocol price feed aggregator and staleness validator.
 */
interface IKoraOracleManager {
    event AssetSourceUpdated(address indexed asset, address indexed source, uint256 maxStaleness);

    function getAssetPrice(address asset) external view returns (uint256 priceUsdWad);
    function setAssetSource(address asset, address source, uint256 maxStaleness) external;
    function getAssetSource(address asset) external view returns (address);
    function getAssetMaxStaleness(address asset) external view returns (uint256);
}
