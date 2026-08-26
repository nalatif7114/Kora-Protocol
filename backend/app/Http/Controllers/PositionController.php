<?php

namespace App\Http\Controllers;

use App\Models\Position;
use App\Services\Risk\HealthFactorEvaluator;
use Illuminate\Http\JsonResponse;

class PositionController
{
    public function __construct(
        protected HealthFactorEvaluator $riskEvaluator
    ) {}

    public function getUserPortfolio(string $userAddress): JsonResponse
    {
        $userAddress = strtolower($userAddress);
        $positions = Position::where('user_address', $userAddress)->with('reserve')->get();
        $riskMetrics = $this->riskEvaluator->evaluateUserRisk($userAddress);

        return response()->json([
            'status'       => 'success',
            'user_address' => $userAddress,
            'risk_metrics' => $riskMetrics,
            'positions'    => $positions,
        ]);
    }
}
