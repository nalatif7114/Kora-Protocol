<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reserves', function (Blueprint $table) {
            $table->id();
            $table->string('asset_address')->unique();
            $table->string('symbol', 32);
            $table->string('name', 64);
            $table->unsignedTinyInteger('decimals')->default(18);
            $table->decimal('total_supplied', 28, 8)->default(0);
            $table->decimal('total_borrowed', 28, 8)->default(0);
            $table->decimal('available_liquidity', 28, 8)->default(0);
            $table->decimal('utilization_rate', 8, 6)->default(0);
            $table->decimal('supply_apy', 8, 6)->default(0);
            $table->decimal('borrow_apr', 8, 6)->default(0);
            $table->decimal('oracle_price_usd', 18, 8)->default(1.0);
            $table->decimal('ltv', 8, 6)->default(0.75);
            $table->decimal('liquidation_threshold', 8, 6)->default(0.80);
            $table->decimal('liquidation_bonus', 8, 6)->default(0.05);
            $table->decimal('reserve_factor', 8, 6)->default(0.10);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_paused')->default(false);
            $table->boolean('is_frozen')->default(false);
            $table->timestamp('last_index_update')->nullable();
            $table->timestamps();
        });

        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('user_address');
            $table->string('asset_address');
            $table->decimal('scaled_supply_balance', 28, 8)->default(0);
            $table->decimal('current_supply_balance', 28, 8)->default(0);
            $table->decimal('scaled_debt_balance', 28, 8)->default(0);
            $table->decimal('current_debt_balance', 28, 8)->default(0);
            $table->boolean('use_as_collateral')->default(true);
            $table->timestamp('last_action_timestamp')->nullable();
            $table->timestamps();

            $table->unique(['user_address', 'asset_address']);
        });

        Schema::create('liquidation_events', function (Blueprint $table) {
            $table->id();
            $table->string('tx_hash');
            $table->unsignedBigInteger('block_number');
            $table->string('collateral_asset');
            $table->string('debt_asset');
            $table->string('borrower_address');
            $table->string('liquidator_address');
            $table->decimal('debt_repaid_amount', 28, 8);
            $table->decimal('debt_repaid_usd', 18, 2);
            $table->decimal('collateral_seized_amount', 28, 8);
            $table->decimal('collateral_seized_usd', 18, 2);
            $table->boolean('is_extreme')->default(false);
            $table->timestamp('executed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('liquidation_events');
        Schema::dropIfExists('positions');
        Schema::dropIfExists('reserves');
    }
};
