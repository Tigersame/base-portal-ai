
export enum Tab {
  SWAP = 'swap',
  EARN = 'earn',
  LAUNCH = 'launch',
  PORTFOLIO = 'portfolio'
}

export interface Token {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  balance: number;
  icon: string;
  iconUrl?: string;
  address?: string;
}

export interface MorphoVault {
  address: string;
  name: string;
  asset: {
    symbol: string;
    address: string;
    decimals: number;
  };
  totalApy: number;
  nativeApy: number;
  vaultFee: number;
  deposits: string;
  liquidity: string;
  rewards: Array<{
    asset: string;
    assetName: string;
    apy: number;
  }>;
  balance?: string;
  interestEarned?: string;
}

export interface YieldOpportunity {
  protocol: string;
  asset: string;
  apy: number;
  tvl: string;
  risk: 'Low' | 'Medium' | 'High';
  vaultAddress?: string;
}

export interface AIInsight {
  summary: string;
  recommendation: string;
  marketSentiment: string;
  alerts?: string[];
}

export interface TokenLaunchConfig {
  name: string;
  symbol: string;
  supply: string;
  initialLiquidity: string;
  description: string;
  image?: string;
}
