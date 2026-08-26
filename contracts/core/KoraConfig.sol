// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IKoraConfig} from "../interfaces/IKoraConfig.sol";
import {KoraDataTypes} from "../libraries/KoraDataTypes.sol";
import {KoraMath} from "../libraries/KoraMath.sol";

/**
 * @title KoraConfig
 * @notice Centralized protocol parameter registry, access control, and emergency controls for Kora.
 */
contract KoraConfig is AccessControl, IKoraConfig {
    using KoraMath for uint256;

    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN_ROLE");

    bool private _protocolPaused;
    address private _treasury;

    // Configurable Risk & Liquidation Parameters (in WAD: 1e18)
    uint256 public override closeFactorNormal;
    uint256 public override closeFactorExtreme;
    uint256 public override extremeHealthFactorThreshold;
    uint256 public override defaultLiquidationBonus;
    uint256 public override defaultLiquidationThreshold;
    uint256 public defaultLtv;
    uint256 public defaultReserveFactor;

    // Per-asset reserve configurations
    mapping(address => KoraDataTypes.ReserveConfiguration) private _reserveConfigs;

    error ZeroAddress();
    error InvalidParameterValue(string paramName, uint256 value);
    error ReserveNotActive();

    constructor(address admin, address treasury) {
        if (admin == address(0) || treasury == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RISK_ADMIN_ROLE, admin);
        _grantRole(EMERGENCY_ADMIN_ROLE, admin);

        _treasury = treasury;

        // Default Risk Parameters
        closeFactorNormal = 0.50e18;              // 50%
        closeFactorExtreme = 1.00e18;             // 100%
        extremeHealthFactorThreshold = 0.95e18;   // 0.95
        defaultLiquidationBonus = 0.05e18;        // 5%
        defaultLiquidationThreshold = 0.80e18;    // 80%
        defaultLtv = 0.75e18;                     // 75%
        defaultReserveFactor = 0.10e18;           // 10%
    }

    // =============================================================
    //                       PAUSE CONTROLS
    // =============================================================

    function isProtocolPaused() external view override returns (bool) {
        return _protocolPaused;
    }

    function isAssetPaused(address asset) external view override returns (bool) {
        return _protocolPaused || _reserveConfigs[asset].isPaused;
    }

    function pauseProtocol() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        _protocolPaused = true;
        emit ProtocolPaused(msg.sender);
    }

    function unpauseProtocol() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _protocolPaused = false;
        emit ProtocolUnpaused(msg.sender);
    }

    function setAssetPaused(address asset, bool paused) external onlyRole(EMERGENCY_ADMIN_ROLE) {
        if (asset == address(0)) revert ZeroAddress();
        _reserveConfigs[asset].isPaused = paused;
        if (paused) {
            emit AssetPaused(asset, msg.sender);
        } else {
            emit AssetUnpaused(asset, msg.sender);
        }
    }

    // =============================================================
    //                    TREASURY MANAGEMENT
    // =============================================================

    function getTreasury() external view override returns (address) {
        return _treasury;
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = _treasury;
        _treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    // =============================================================
    //                 RISK PARAMETER SETTERS
    // =============================================================

    function setCloseFactorNormal(uint256 newCloseFactor) external onlyRole(RISK_ADMIN_ROLE) {
        if (newCloseFactor < 0.10e18 || newCloseFactor > 0.50e18) {
            revert InvalidParameterValue("closeFactorNormal", newCloseFactor);
        }
        uint256 old = closeFactorNormal;
        closeFactorNormal = newCloseFactor;
        emit RiskParameterUpdated("closeFactorNormal", old, newCloseFactor);
    }

    function setCloseFactorExtreme(uint256 newCloseFactor) external onlyRole(RISK_ADMIN_ROLE) {
        if (newCloseFactor < 0.50e18 || newCloseFactor > 1.00e18) {
            revert InvalidParameterValue("closeFactorExtreme", newCloseFactor);
        }
        uint256 old = closeFactorExtreme;
        closeFactorExtreme = newCloseFactor;
        emit RiskParameterUpdated("closeFactorExtreme", old, newCloseFactor);
    }

    function setExtremeHealthFactorThreshold(uint256 newThreshold) external onlyRole(RISK_ADMIN_ROLE) {
        if (newThreshold < 0.80e18 || newThreshold >= 1.00e18) {
            revert InvalidParameterValue("extremeHealthFactorThreshold", newThreshold);
        }
        uint256 old = extremeHealthFactorThreshold;
        extremeHealthFactorThreshold = newThreshold;
        emit RiskParameterUpdated("extremeHealthFactorThreshold", old, newThreshold);
    }

    function setDefaultLiquidationBonus(uint256 newBonus) external onlyRole(RISK_ADMIN_ROLE) {
        if (newBonus < 0.01e18 || newBonus > 0.15e18) {
            revert InvalidParameterValue("defaultLiquidationBonus", newBonus);
        }
        uint256 old = defaultLiquidationBonus;
        defaultLiquidationBonus = newBonus;
        emit RiskParameterUpdated("defaultLiquidationBonus", old, newBonus);
    }

    function setDefaultLiquidationThreshold(uint256 newThreshold) external onlyRole(RISK_ADMIN_ROLE) {
        if (newThreshold < 0.50e18 || newThreshold > 0.95e18) {
            revert InvalidParameterValue("defaultLiquidationThreshold", newThreshold);
        }
        uint256 old = defaultLiquidationThreshold;
        defaultLiquidationThreshold = newThreshold;
        emit RiskParameterUpdated("defaultLiquidationThreshold", old, newThreshold);
    }

    // =============================================================
    //                 RESERVE CONFIGURATIONS
    // =============================================================

    function getReserveConfiguration(address asset)
        external
        view
        override
        returns (KoraDataTypes.ReserveConfiguration memory)
    {
        return _reserveConfigs[asset];
    }

    function setReserveConfiguration(
        address asset,
        KoraDataTypes.ReserveConfiguration calldata config
    ) external onlyRole(RISK_ADMIN_ROLE) {
        if (asset == address(0)) revert ZeroAddress();
        if (config.ltv > config.liquidationThreshold) {
            revert InvalidParameterValue("ltvGreaterThanThreshold", config.ltv);
        }
        if (config.reserveFactor > 0.35e18) {
            revert InvalidParameterValue("reserveFactorTooHigh", config.reserveFactor);
        }

        _reserveConfigs[asset] = config;
        emit ReserveConfigUpdated(asset, config);
    }
}
