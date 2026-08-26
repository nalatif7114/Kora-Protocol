<?php

namespace App\Services\Liquidation;

use App\Models\Position;
use App\Services\Risk\HealthFactorEvaluator;
use Illuminate\Support\Collection;

class LiquidationRadarService
{
    public function __construct(
        protected HealthFactorEvaluator $riskEvaluator
    ) {}

    /**
     * Scan all active borrowers and identify positions near or below liquidation threshold.
     */
    public function scanUnhealthyPositions(float $maxHealthFactor = 1.10): Collection
    {
        $uniqueBorrowers = Position::where('current_debt_balance', '>', 0)
            ->distinct()
            ->pluck('user_address');

        $radar = collect();

        foreach ($uniqueBorrowers as $borrower) {
            $risk = $this->riskEvaluator->evaluateUserRisk($borrower);

            if ($risk['health_factor'] <= $maxHealthFactor) {
                // Calculate estimated liquidation opportunity
                $isExtreme = $risk['health_factor'] < 0.95;
                $closeFactor = $isExtreme ? 1.0 : 0.50;
                $maxRepayableUSD = $risk['total_debt_usd'] * $closeFactor;
                $estimatedSeizedCollateralUSD = $maxRepayableUSD * 1.05; // 5% bonus assumption

                $radar->push(array_merge($risk, [
                    'close_factor'                   => $closeFactor,
                    'is_extreme_liquidation'         => $isExtreme,
                    'max_repayable_debt_usd'         => round($maxRepayableUSD, 2),
                    'estimated_seizable_usd'         => round($estimatedSeizedCollateralUSD, 2),
                    'potential_liquidator_profit_usd' => round($estimatedSeizedCollateralUSD - $maxRepayableUSD, 2),
                ]));
            }
        }

        return $radar->sortBy('health_factor')->values();
    }
}
