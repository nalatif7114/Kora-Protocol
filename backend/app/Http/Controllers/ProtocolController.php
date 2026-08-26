<?php

namespace App\Http\Controllers;

use App\Services\Analytics\ProtocolMetricsService;
use Illuminate\Http\JsonResponse;

class ProtocolController
{
    public function __construct(
        protected ProtocolMetricsService $metricsService
    ) {}

    public function getSummary(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data'   => $this->metricsService->getProtocolSummary(),
        ]);
    }
}
