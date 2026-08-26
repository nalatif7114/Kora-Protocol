<?php

namespace App\Http\Controllers;

use App\Models\Reserve;
use App\Services\Lending\ReserveService;
use Illuminate\Http\JsonResponse;

class ReserveController
{
    public function __construct(
        protected ReserveService $reserveService
    ) {}

    public function index(): JsonResponse
    {
        $reserves = $this->reserveService->getAllReserves();

        return response()->json([
            'status' => 'success',
            'count'  => $reserves->count(),
            'data'   => $reserves,
        ]);
    }

    public function show(string $assetAddress): JsonResponse
    {
        $reserve = Reserve::where('asset_address', strtolower($assetAddress))->first();

        if (!$reserve) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Reserve not found for asset address',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $reserve,
        ]);
    }
}
