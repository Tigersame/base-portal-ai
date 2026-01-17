const DEXSCREENER_API_BASE = 'https://api.dexscreener.com/latest/dex';

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd?: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap?: number;
  pairs: DexScreenerPair[];
}

export async function getTokenData(tokenAddress: string): Promise<TokenInfo | null> {
  try {
    const response = await fetch(`${DEXSCREENER_API_BASE}/tokens/${tokenAddress}`);
    
    if (!response.ok) {
      console.error('DexScreener API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      return null;
    }

    const basePairs = data.pairs.filter((p: DexScreenerPair) => p.chainId === 'base');
    
    if (basePairs.length === 0) {
      return null;
    }

    const mainPair = basePairs.sort((a: DexScreenerPair, b: DexScreenerPair) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];

    return {
      address: tokenAddress,
      symbol: mainPair.baseToken.symbol,
      name: mainPair.baseToken.name,
      priceUsd: parseFloat(mainPair.priceUsd || '0'),
      priceChange24h: mainPair.priceChange?.h24 || 0,
      volume24h: mainPair.volume?.h24 || 0,
      liquidity: mainPair.liquidity?.usd || 0,
      marketCap: mainPair.marketCap,
      pairs: basePairs,
    };
  } catch (error) {
    console.error('DexScreener fetch error:', error);
    return null;
  }
}

export async function searchTokens(query: string): Promise<DexScreenerPair[]> {
  try {
    const response = await fetch(`${DEXSCREENER_API_BASE}/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.pairs?.filter((p: DexScreenerPair) => p.chainId === 'base') || [];
  } catch (error) {
    console.error('DexScreener search error:', error);
    return [];
  }
}

export async function getTrendingTokens(): Promise<DexScreenerPair[]> {
  try {
    const response = await fetch(`${DEXSCREENER_API_BASE}/tokens/base`);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const pairs = data.pairs || [];
    
    return pairs
      .filter((p: DexScreenerPair) => p.liquidity?.usd && p.liquidity.usd > 10000)
      .sort((a: DexScreenerPair, b: DexScreenerPair) => 
        (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
      )
      .slice(0, 20);
  } catch (error) {
    console.error('DexScreener trending error:', error);
    return [];
  }
}
