<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProtocolController;
use App\Http\Controllers\ReserveController;
use App\Http\Controllers\PositionController;
use App\Http\Controllers\LiquidationRadarController;

Route::prefix('v1')->group(function () {
    // Protocol summary & global TVL
    Route::get('/protocol/summary', [ProtocolController::class, 'getSummary']);

    // Market Reserves
    Route::get('/reserves', [ReserveController::class, 'index']);
    Route::get('/reserves/{assetAddress}', [ReserveController::class, 'show']);

    // User Portfolio & Risk Evaluation
    Route::get('/positions/{userAddress}', [PositionController::class, 'getUserPortfolio']);

    // Liquidation Radar & Historical Liquidations
    Route::get('/liquidation/radar', [LiquidationRadarController::class, 'getRadar']);
    Route::get('/liquidation/events', [LiquidationRadarController::class, 'getRecentLiquidations']);
});
