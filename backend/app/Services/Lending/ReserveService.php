<?php

namespace App\Services\Lending;

use App\Models\Reserve;
use App\Services\Blockchain\KoraNodeService;
use Illuminate\Support\Collection;

class ReserveService
{
    public function __construct(
        protected KoraNodeService $nodeService
    ) {}

    public function getAllReserves(): Collection
    {
        return Reserve::where('is_active', true)->get();
    }

    public function calculateUtilization(float $supplied, float $borrowed): float
    {
        if ($supplied <= 0.0) {
            return 0.0;
        }
        return min(1.0, $borrowed / $supplied);
    }

    public function syncReserveState(string $assetAddress, array $onChainData): Reserve
    {
        return Reserve::updateOrCreate(
            ['asset_address' => strtolower($assetAddress)],
            [
                'symbol'              => $onChainData['symbol'] ?? 'UNKNOWN',
                'name'                => $onChainData['name'] ?? 'Unknown Asset',
                'decimals'            => $onChainData['decimals'] ?? 18,
                'total_supplied'      => $onChainData['total_supplied'] ?? 0,
                'total_borrowed'      => $onChainData['total_borrowed'] ?? 0,
                'available_liquidity' => $onChainData['available_liquidity'] ?? 0,
                'utilization_rate'    => $onChainData['utilization_rate'] ?? 0,
                'supply_apy'          => $onChainData['supply_apy'] ?? 0,
                'borrow_apr'          => $onChainData['borrow_apr'] ?? 0,
                'oracle_price_usd'    => $onChainData['oracle_price_usd'] ?? 1.0,
                'ltv'                 => $onChainData['ltv'] ?? 0.75,
                'liquidation_threshold' => $onChainData['liquidation_threshold'] ?? 0.80,
                'liquidation_bonus'   => $onChainData['liquidation_bonus'] ?? 0.05,
                'reserve_factor'      => $onChainData['reserve_factor'] ?? 0.10,
                'is_active'           => true,
                'is_paused'           => $onChainData['is_paused'] ?? false,
                'last_index_update'   => now(),
            ]
        );
    }
}
