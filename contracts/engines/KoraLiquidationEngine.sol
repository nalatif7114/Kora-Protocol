// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IKoraLiquidationEngine} from "../interfaces/IKoraLiquidationEngine.sol";
import {IKoraReserveManager} from "../interfaces/IKoraReserveManager.sol";
import {IKoraOracleManager} from "../interfaces/IKoraOracleManager.sol";
import {IKoraRiskEngine} from "../interfaces/IKoraRiskEngine.sol";
import {IKoraConfig} from "../interfaces/IKoraConfig.sol";
import {KoraDataTypes} from "../libraries/KoraDataTypes.sol";
import {KoraMath} from "../libraries/KoraMath.sol";

/**
 * @title KoraLiquidationEngine
 * @notice Pure risk calculation engine for evaluating liquidation viability, dynamic close factors, and collateral seizure.
 * @dev Enforces protocol directional rounding and solvency guarantees.
 */
contract KoraLiquidationEngine is IKoraLiquidationEngine {
    using KoraMath for uint256;

    IKoraReserveManager public immutable reserveManager;
    IKoraOracleManager public immutable oracleManager;
    IKoraRiskEngine public immutable riskEngine;
    IKoraConfig public immutable config;

    struct LiqParams {
        uint256 debtPrice;
        uint256 collPrice;
        uint256 debtDecimals;
        uint256 collDecimals;
        uint256 bonus;
    }

    error ZeroAddress();
    error HealthFactorNotLiquidatable();
    error NoDebtToLiquidate();
    error NoCollateralToSeize();
    error ZeroRepayAmount();

    constructor(
        address _reserveManager,
        address _oracleManager,
        address _riskEngine,
        address _config
    ) {
        if (
            _reserveManager == address(0) ||
            _oracleManager == address(0) ||
            _riskEngine == address(0) ||
            _config == address(0)
        ) {
            revert ZeroAddress();
        }
        reserveManager = IKoraReserveManager(_reserveManager);
        oracleManager = IKoraOracleManager(_oracleManager);
        riskEngine = IKoraRiskEngine(_riskEngine);
        config = IKoraConfig(_config);
    }

    /**
     * @notice Computes exact debt repayable, collateral seized, applicable close factor, and bonus for an unhealthy position.
     */
    function calculateLiquidationOpportunity(
        address collateralAsset,
        address debtAsset,
        address borrower,
        uint256 requestedDebtToCover
    )
        public
        view
        override
        returns (
            uint256 actualDebtToCover,
            uint256 collateralToSeize,
            uint256 currentHealthFactor,
            uint256 applicableCloseFactor,
            uint256 liquidationBonus
        )
    {
        (, , , , , uint256 hf) = riskEngine.getUserAccountData(borrower);
        if (hf >= KoraMath.WAD) {
            revert HealthFactorNotLiquidatable();
        }
        currentHealthFactor = hf;

        // 1. Dynamic Close Factor
        uint256 extremeThreshold = config.extremeHealthFactorThreshold();
        if (hf < extremeThreshold) {
            applicableCloseFactor = config.closeFactorExtreme(); // 100%
        } else {
            applicableCloseFactor = config.closeFactorNormal();  // 50%
        }

        // 2. Maximum Repayable Debt
        uint256 userDebt = reserveManager.getDebtBalance(debtAsset, borrower);
        if (userDebt == 0) revert NoDebtToLiquidate();

        uint256 maxRepayable = (userDebt * applicableCloseFactor) / KoraMath.WAD;
        if (requestedDebtToCover == 0 || requestedDebtToCover > maxRepayable || requestedDebtToCover == type(uint256).max) {
            actualDebtToCover = maxRepayable;
        } else {
            actualDebtToCover = requestedDebtToCover;
        }

        if (actualDebtToCover == 0) revert ZeroRepayAmount();

        // 3. Collateral Seizure Calculation
        LiqParams memory params;
        params.debtPrice = oracleManager.getAssetPrice(debtAsset);
        params.collPrice = oracleManager.getAssetPrice(collateralAsset);

        KoraDataTypes.ReserveData memory collRes = reserveManager.getReserveData(collateralAsset);
        KoraDataTypes.ReserveData memory debtRes = reserveManager.getReserveData(debtAsset);

        params.bonus = collRes.configuration.liquidationBonus;
        liquidationBonus = params.bonus;

        params.debtDecimals = 10 ** debtRes.configuration.decimals;
        params.collDecimals = 10 ** collRes.configuration.decimals;

        // Debt value in USD
        uint256 debtValueUSD = (actualDebtToCover * params.debtPrice) / params.debtDecimals;
        // Total seized USD value including bonus
        uint256 seizeValueUSD = (debtValueUSD * (KoraMath.WAD + params.bonus)) / KoraMath.WAD;

        // Convert USD seize value to collateral token units (Floor)
        collateralToSeize = (seizeValueUSD * params.collDecimals) / params.collPrice;

        // Cap seizure at user's actual available collateral balance
        uint256 userCollateralBal = reserveManager.getSupplyBalance(collateralAsset, borrower);
        if (userCollateralBal == 0) revert NoCollateralToSeize();

        if (collateralToSeize > userCollateralBal) {
            collateralToSeize = userCollateralBal;
        }
    }

    function liquidationCall(
        address,
        address,
        address,
        uint256,
        bool
    ) external pure override returns (uint256, uint256) {
        revert("Use LendingPool.liquidationCall");
    }
}
