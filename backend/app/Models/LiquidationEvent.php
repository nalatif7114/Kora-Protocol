<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LiquidationEvent extends Model
{
    protected $fillable = [
        'tx_hash',
        'block_number',
        'collateral_asset',
        'debt_asset',
        'borrower_address',
        'liquidator_address',
        'debt_repaid_amount',
        'debt_repaid_usd',
        'collateral_seized_amount',
        'collateral_seized_usd',
        'is_extreme',
        'executed_at',
    ];

    protected $casts = [
        'is_extreme' => 'boolean',
        'executed_at' => 'datetime',
    ];
}
