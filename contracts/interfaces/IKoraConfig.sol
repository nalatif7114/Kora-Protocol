// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {KoraDataTypes} from "../libraries/KoraDataTypes.sol";

/**
 * @title IKoraConfig
 * @notice Interface for Kora Protocol configuration and access control management.
 */
interface IKoraConfig {
    event RiskParameterUpdated(string indexed parameterName, uint256 oldValue, uint256 newValue);
    event ReserveConfigUpdated(address indexed asset, KoraDataTypes.ReserveConfiguration config);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event ProtocolPaused(address indexed account);
    event ProtocolUnpaused(address indexed account);
    event AssetPaused(address indexed asset, address indexed account);
    event AssetUnpaused(address indexed asset, address indexed account);

    function isProtocolPaused() external view returns (bool);
    function isAssetPaused(address asset) external view returns (bool);
    function getTreasury() external view returns (address);
    function getReserveConfiguration(address asset) external view returns (KoraDataTypes.ReserveConfiguration memory);
    
    function closeFactorNormal() external view returns (uint256);
    function closeFactorExtreme() external view returns (uint256);
    function extremeHealthFactorThreshold() external view returns (uint256);
    function defaultLiquidationBonus() external view returns (uint256);
    function defaultLiquidationThreshold() external view returns (uint256);
}
