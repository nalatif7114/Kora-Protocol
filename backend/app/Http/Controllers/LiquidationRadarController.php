<?php

namespace App\Http\Controllers;

use App\Services\Liquidation\LiquidationRadarService;
use App\Models\LiquidationEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LiquidationRadarController
{
    public function __construct(
        protected LiquidationRadarService $radarService
    ) {}

    public function getRadar(Request $request): JsonResponse
    {
        $maxHF = (float) $request->query('max_hf', 1.10);
        $vulnerablePositions = $this->radarService->scanUnhealthyPositions($maxHF);

        return response()->json([
            'status' => 'success',
            'count'  => $vulnerablePositions->count(),
            'data'   => $vulnerablePositions,
        ]);
    }

    public function getRecentLiquidations(): JsonResponse
    {
        $events = LiquidationEvent::orderBy('executed_at', 'desc')->take(20)->get();

        return response()->json([
            'status' => 'success',
            'count'  => $events->count(),
            'data'   => $events,
        ]);
    }
}
