<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Position extends Model
{
    protected $fillable = [
        'user_address',
        'asset_address',
        'scaled_supply_balance',
        'current_supply_balance',
        'scaled_debt_balance',
        'current_debt_balance',
        'use_as_collateral',
        'last_action_timestamp',
    ];

    protected $casts = [
        'use_as_collateral' => 'boolean',
        'last_action_timestamp' => 'datetime',
    ];

    public function reserve(): BelongsTo
    {
        return $this->belongsTo(Reserve::class, 'asset_address', 'asset_address');
    }
}
