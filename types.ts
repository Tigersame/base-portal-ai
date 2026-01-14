
export enum Tab {
  SWAP = 'swap',
  EARN = 'earn',
  LAUNCH = 'launch',
  PORTFOLIO = 'portfolio'
}

export type TokenCategory = 'Mainnet' | 'Stables' | 'Ecosystem' | 'Governance';
export type TokenTemplate = 'Meme' | 'Utility' | 'DeFi' | 'Custom';
export type OrderType = 'market' | 'limit';

export interface Token {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  balance: number;
  icon: string;
  category: TokenCategory;
  iconUrl?: string;
  address?: string;
}

export interface LimitOrder {
  id: string;
  fromToken: string;
  toToken: string;
  amount: string;
  targetPrice: string;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: number;
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

export interface SentimentPoint {
  date: string;
  score: number;
}

export interface TokenLaunchConfig {
  name: string;
  symbol: string;
  supply: string;
  initialLiquidity: string;
  description: string;
  image?: string;
  template: TokenTemplate;
  buyTax: string;
  sellTax: string;
  burnRate: string;
  lockPeriod: string;
}
