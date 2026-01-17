import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { Token } from '../types';

const UNI_V3_BASE = {
  chainId: 8453,
  factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  router02: '0x2626664c2603336E57B271c5C0b26F421741e481',
} as const;

const WETH = '0x4200000000000000000000000000000000000006';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const FEE_TIERS = [500, 3000, 10000] as const;

const factoryAbi = [
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const;

const quoterAbi = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

const swapRouterAbi = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'multicall',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'deadline', type: 'uint256' },
      { name: 'data', type: 'bytes[]' },
    ],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
  {
    name: 'unwrapWETH9',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountMinimum', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
  },
] as const;

const getClient = () => {
  const alchemyKey = typeof window !== 'undefined' 
    ? import.meta.env.VITE_ALCHEMY_API_KEY 
    : undefined;
  
  const rpcUrl = alchemyKey 
    ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : 'https://mainnet.base.org';

  return createPublicClient({
    chain: base,
    transport: http(rpcUrl, { timeout: 15000 }),
  });
};

export type UniswapQuote = {
  outputAmount: string;
  outputAmountRaw: bigint;
  priceImpact: string;
  route: string;
  fee: string;
  feeTier: number;
  slippage: string;
  networkFeeUsd: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  amountOutMinimum: bigint;
};

async function findPool(
  client: ReturnType<typeof getClient>,
  tokenA: `0x${string}`,
  tokenB: `0x${string}`
): Promise<{ pool: `0x${string}`; fee: number } | null> {
  for (const fee of FEE_TIERS) {
    try {
      const pool = await client.readContract({
        address: UNI_V3_BASE.factory,
        abi: factoryAbi,
        functionName: 'getPool',
        args: [tokenA, tokenB, fee],
      });

      if (pool && pool !== ZERO_ADDRESS) {
        console.log(`[Uniswap] Pool found: ${pool} (fee: ${fee})`);
        return { pool, fee };
      }
    } catch (e) {
      console.log(`[Uniswap] getPool failed for fee ${fee}`);
    }
  }
  return null;
}

async function quoteExactIn(
  client: ReturnType<typeof getClient>,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint,
  fee: number
): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const result = await client.readContract({
    address: UNI_V3_BASE.quoterV2,
    abi: quoterAbi,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn,
        tokenOut,
        amountIn,
        fee,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

  return {
    amountOut: result[0],
    gasEstimate: result[3],
  };
}

export async function getUniswapQuote(
  from: Token,
  to: Token,
  amount: string,
  takerAddress?: string | null,
  slippagePercent: number = 3
): Promise<UniswapQuote | null> {
  if (!amount || Number(amount) <= 0) return null;

  const client = getClient();
  
  const tokenIn = (from.isNative ? WETH : from.address!) as `0x${string}`;
  const tokenOut = (to.isNative ? WETH : to.address!) as `0x${string}`;
  
  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
    throw new Error('Cannot swap a token for itself');
  }

  const amountIn = parseUnits(amount, from.decimals ?? 18);

  console.log('[Uniswap] Quoting:', { tokenIn, tokenOut, amountIn: amountIn.toString() });

  const poolData = await findPool(client, tokenIn, tokenOut);
  
  if (!poolData) {
    throw new Error('No Uniswap V3 pool found. Try a different token pair.');
  }

  const { fee } = poolData;
  const quote = await quoteExactIn(client, tokenIn, tokenOut, amountIn, fee);

  console.log(`[Uniswap] Quote: amountOut=${quote.amountOut.toString()}`);

  const outputAmount = formatUnits(quote.amountOut, to.decimals ?? 18);
  const slippageBps = BigInt(Math.round(slippagePercent * 100));
  const amountOutMinimum = (quote.amountOut * (10000n - slippageBps)) / 10000n;

  const recipient = to.isNative ? UNI_V3_BASE.router02 : (takerAddress || UNI_V3_BASE.router02);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

  const swapParams = {
    tokenIn,
    tokenOut,
    fee,
    recipient: recipient as `0x${string}`,
    amountIn,
    amountOutMinimum,
    sqrtPriceLimitX96: 0n,
  };

  let callData: `0x${string}`;
  
  if (to.isNative && takerAddress) {
    const swapCallData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: 'exactInputSingle',
      args: [swapParams],
    });
    
    const unwrapCallData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: 'unwrapWETH9',
      args: [amountOutMinimum, takerAddress as `0x${string}`],
    });
    
    callData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: 'multicall',
      args: [deadline, [swapCallData, unwrapCallData]],
    });
  } else {
    const finalRecipient = takerAddress || UNI_V3_BASE.router02;
    const swapCallData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: 'exactInputSingle',
      args: [{ ...swapParams, recipient: finalRecipient as `0x${string}` }],
    });
    
    callData = encodeFunctionData({
      abi: swapRouterAbi,
      functionName: 'multicall',
      args: [deadline, [swapCallData]],
    });
  }

  const feeLabel = fee === 500 ? '0.05%' : fee === 3000 ? '0.3%' : '1%';

  return {
    outputAmount,
    outputAmountRaw: quote.amountOut,
    priceImpact: '< 0.5%',
    route: `Uniswap V3 (${feeLabel})`,
    fee: feeLabel,
    feeTier: fee,
    slippage: `${slippagePercent}%`,
    networkFeeUsd: '~$0.01',
    to: UNI_V3_BASE.router02,
    data: callData,
    value: from.isNative ? amountIn.toString() : '0',
    gas: (quote.gasEstimate + 50000n).toString(),
    amountOutMinimum,
  };
}

export const SWAP_ROUTER_02 = UNI_V3_BASE.router02;
export { WETH, swapRouterAbi };
