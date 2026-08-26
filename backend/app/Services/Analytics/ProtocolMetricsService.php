<?php

namespace App\Services\Analytics;

use App\Models\Reserve;
use App\Models\Position;
use App\Models\LiquidationEvent;

class ProtocolMetricsService
{
    public function getProtocolSummary(): array
    {
        $reserves = Reserve::where('is_active', true)->get();

        $totalValueLockedUSD = 0.0;
        $totalBorrowedUSD = 0.0;
        $totalAvailableLiquidityUSD = 0.0;

        foreach ($reserves as $reserve) {
            $price = (float) $reserve->oracle_price_usd;
            $totalValueLockedUSD += ((float) $reserve->total_supplied) * $price;
            $totalBorrowedUSD += ((float) $reserve->total_borrowed) * $price;
            $totalAvailableLiquidityUSD += ((float) $reserve->available_liquidity) * $price;
        }

        $netUtilization = $totalValueLockedUSD > 0 ? ($totalBorrowedUSD / $totalValueLockedUSD) : 0;
        $totalLiquidations = LiquidationEvent::count();
        $totalVolumeLiquidatedUSD = (float) LiquidationEvent::sum('debt_repaid_usd');

        return [
            'total_value_locked_usd'      => round($totalValueLockedUSD, 2),
            'total_borrowed_usd'          => round($totalBorrowedUSD, 2),
            'total_available_liquidity_usd' => round($totalAvailableLiquidityUSD, 2),
            'protocol_utilization_rate'   => round($netUtilization, 4),
            'active_reserves_count'       => $reserves->count(),
            'total_liquidations_count'    => $totalLiquidations,
            'total_liquidated_volume_usd' => round($totalVolumeLiquidatedUSD, 2),
            'protocol_status'             => 'OPTIMAL_OPERATION',
        ];
    }
}
