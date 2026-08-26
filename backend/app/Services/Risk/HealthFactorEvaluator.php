<?php

namespace App\Services\Risk;

use App\Models\Position;
use App\Models\Reserve;

class HealthFactorEvaluator
{
    /**
     * Evaluate user health factor, total collateral USD, total debt USD, and max borrow capacity.
     */
    public function evaluateUserRisk(string $userAddress): array
    {
        $positions = Position::where('user_address', strtolower($userAddress))->with('reserve')->get();
        
        $totalCollateralUSD = 0.0;
        $weightedLTVUSD = 0.0;
        $weightedThresholdUSD = 0.0;
        $totalDebtUSD = 0.0;

        foreach ($positions as $pos) {
            $reserve = $pos->reserve;
            if (!$reserve) continue;

            $price = (float) $reserve->oracle_price_usd;

            // Collateral evaluation
            if ($pos->use_as_collateral && $pos->current_supply_balance > 0) {
                $collateralUSD = $pos->current_supply_balance * $price;
                $totalCollateralUSD += $collateralUSD;
                $weightedLTVUSD += $collateralUSD * ((float) $reserve->ltv);
                $weightedThresholdUSD += $collateralUSD * ((float) $reserve->liquidation_threshold);
            }

            // Debt evaluation
            if ($pos->current_debt_balance > 0) {
                $debtUSD = $pos->current_debt_balance * $price;
                $totalDebtUSD += $debtUSD;
            }
        }

        $availableBorrowsUSD = max(0.0, $weightedLTVUSD - $totalDebtUSD);

        if ($totalDebtUSD <= 0.0) {
            $healthFactor = 999.0; // Infinite / completely safe
            $isLiquidatable = false;
        } else {
            $healthFactor = $weightedThresholdUSD / $totalDebtUSD;
            $isLiquidatable = $healthFactor < 1.0;
        }

        return [
            'user_address'            => $userAddress,
            'total_collateral_usd'    => round($totalCollateralUSD, 2),
            'total_debt_usd'          => round($totalDebtUSD, 2),
            'available_borrows_usd'   => round($availableBorrowsUSD, 2),
            'current_ltv'             => $totalCollateralUSD > 0 ? round($weightedLTVUSD / $totalCollateralUSD, 4) : 0,
            'liquidation_threshold'   => $totalCollateralUSD > 0 ? round($weightedThresholdUSD / $totalCollateralUSD, 4) : 0,
            'health_factor'           => round($healthFactor, 4),
            'is_liquidatable'         => $isLiquidatable,
            'risk_status'             => $healthFactor >= 1.5 ? 'HEALTHY' : ($healthFactor >= 1.0 ? 'MODERATE' : 'LIQUIDATABLE'),
        ];
    }
}
