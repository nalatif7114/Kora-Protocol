<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reserve extends Model
{
    protected $fillable = [
        'asset_address',
        'symbol',
        'name',
        'decimals',
        'total_supplied',
        'total_borrowed',
        'available_liquidity',
        'utilization_rate',
        'supply_apy',
        'borrow_apr',
        'oracle_price_usd',
        'ltv',
        'liquidation_threshold',
        'liquidation_bonus',
        'reserve_factor',
        'is_active',
        'is_paused',
        'is_frozen',
        'last_index_update',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_paused' => 'boolean',
        'is_frozen' => 'boolean',
        'last_index_update' => 'datetime',
    ];

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class, 'asset_address', 'asset_address');
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(MarketSnapshot::class, 'asset_address', 'asset_address');
    }
}
