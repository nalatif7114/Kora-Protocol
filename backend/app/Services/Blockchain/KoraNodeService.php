<?php

namespace App\Services\Blockchain;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class KoraNodeService
{
    protected Client $client;
    protected string $rpcUrl;

    public function __construct()
    {
        $this->rpcUrl = env('ETHEREUM_RPC_URL', 'http://127.0.0.1:8545');
        $this->client = new Client([
            'base_uri' => $this->rpcUrl,
            'timeout'  => 10.0,
        ]);
    }

    public function callRpc(string $method, array $params = []): mixed
    {
        try {
            $response = $this->client->post('', [
                'json' => [
                    'jsonrpc' => '2.0',
                    'id'      => time(),
                    'method'  => $method,
                    'params'  => $params,
                ],
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            if (isset($data['error'])) {
                Log::error('RPC Error', ['error' => $data['error']]);
                return null;
            }

            return $data['result'] ?? null;
        } catch (\Exception $e) {
            Log::error('RPC Connection Failure', ['message' => $e->getMessage()]);
            return null;
        }
    }

    public function getLatestBlockNumber(): int
    {
        $hex = $this->callRpc('eth_blockNumber');
        return $hex ? hexdec($hex) : 0;
    }

    public function getLogs(string $address, array $topics, int $fromBlock, int $toBlock): array
    {
        return $this->callRpc('eth_getLogs', [[
            'address'   => $address,
            'topics'    => $topics,
            'fromBlock' => '0x' . dechex($fromBlock),
            'toBlock'   => '0x' . dechex($toBlock),
        ]]) ?? [];
    }
}
