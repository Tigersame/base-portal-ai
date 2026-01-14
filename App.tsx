
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Sector
} from 'recharts';
import { 
  ArrowLeftRight, 
  TrendingUp, 
  Rocket, 
  PieChart as PieChartIcon, 
  Zap,
  Info,
  RefreshCw,
  Plus,
  ShieldCheck,
  Globe,
  CheckCircle2,
  AlertCircle,
  ArrowDown,
  Settings2,
  Activity,
  Terminal,
  Share2,
  Eye,
  Lock,
  Coins,
  Clock,
  ArrowUpRight,
  Wallet,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Percent,
  Loader2,
  Image as ImageIcon,
  Upload,
  ArrowRight,
  TrendingDown,
  LayoutGrid,
  Layers,
  History,
  Flame,
  Key,
  X,
  Crosshair,
  Timer
} from 'lucide-react';
import { Tab, Token, YieldOpportunity, AIInsight, TokenLaunchConfig, MorphoVault, SentimentPoint, TokenCategory, TokenTemplate, OrderType, LimitOrder } from './types';
import { Card, Button, Modal, SearchableTokenSelector } from './components/UI';
import { getMarketInsights, generateTokenDescription, getSwapQuote, getHistoricalSentiment } from './services/geminiService';

const COLORS = ['#0052FF', '#00C49F', '#FFBB28', '#FF8042', '#8A2BE2'];

const INITIAL_TOKENS: Token[] = [
  { 
    symbol: 'ETH', 
    name: 'Ethereum', 
    price: 2842.12, 
    change24h: 3.2, 
    balance: 1.5, 
    icon: 'E',
    category: 'Mainnet',
    iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  },
  { 
    symbol: 'cbBTC', 
    name: 'Coinbase Wrapped BTC', 
    price: 94210.50, 
    change24h: 1.4, 
    balance: 0.02, 
    icon: 'B',
    category: 'Mainnet',
    iconUrl: 'https://assets.coingecko.com/coins/images/39535/small/cbbtc.png',
    address: '0xcbB7C00002968E65348665a53B821F644A81717c'
  },
  { 
    symbol: 'USDC', 
    name: 'USDC', 
    price: 1.00, 
    change24h: 0.01, 
    balance: 4263.18, 
    icon: 'U',
    category: 'Stables',
    iconUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  { 
    symbol: 'EURC', 
    name: 'EURC', 
    price: 1.05, 
    change24h: -0.2, 
    balance: 500, 
    icon: '€',
    category: 'Stables',
    iconUrl: 'https://assets.coingecko.com/coins/images/25484/small/eurc.png',
    address: '0x60a3E35Cc3022273409C1215f6545811c169d191'
  },
  { 
    symbol: 'DEGEN', 
    name: 'Degen Token', 
    price: 0.012, 
    change24h: -12.4, 
    balance: 500000, 
    icon: 'D',
    category: 'Ecosystem',
    iconUrl: 'https://assets.coingecko.com/coins/images/34515/small/degen.png',
    address: '0x4ed4E8615216599b5966f03441F2282aE651ed9d'
  },
  { 
    symbol: 'VIRTUAL', 
    name: 'Virtual', 
    price: 0.85, 
    change24h: 4.5, 
    balance: 1200, 
    icon: 'V',
    category: 'Ecosystem',
    iconUrl: 'https://assets.coingecko.com/coins/images/32298/small/virtual.png',
    address: '0x0b3e328455822222222222222222222222222222'
  },
];

const INITIAL_MORPHO_VAULTS: MorphoVault[] = [
  {
    address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    name: 'USDC MetaVault',
    asset: { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    totalApy: 12.45,
    nativeApy: 8.2,
    vaultFee: 0.01,
    deposits: '1.2M',
    liquidity: '850K',
    rewards: [{ asset: '0xmorpho', assetName: 'MORPHO', apy: 4.25 }],
    balance: '4263.18',
    interestEarned: '124.50'
  },
  {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    name: 'WETH MetaVault',
    asset: { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    totalApy: 4.82,
    nativeApy: 3.1,
    vaultFee: 0.02,
    deposits: '4.5M',
    liquidity: '1.2M',
    rewards: [{ asset: '0xop', assetName: 'OP', apy: 1.72 }],
    balance: '1.5',
    interestEarned: '0.042'
  }
];

const TEMPLATE_PRESETS: Record<TokenTemplate, Partial<TokenLaunchConfig>> = {
  Meme: { buyTax: '5', sellTax: '5', burnRate: '2', lockPeriod: '1 Year' },
  Utility: { buyTax: '0', sellTax: '0', burnRate: '0', lockPeriod: '6 Months' },
  DeFi: { buyTax: '1', sellTax: '2', burnRate: '0.5', lockPeriod: 'Forever' },
  Custom: { buyTax: '0', sellTax: '0', burnRate: '0', lockPeriod: 'None' },
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SWAP);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [historicalSentiment, setHistoricalSentiment] = useState<SentimentPoint[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Token[]>(INITIAL_TOKENS);
  const [activePieIndex, setActivePieIndex] = useState(0);
  
  const [vaults, setVaults] = useState<MorphoVault[]>(INITIAL_MORPHO_VAULTS);
  const [selectedVault, setSelectedVault] = useState<MorphoVault | null>(null);
  const [earnAction, setEarnAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [earnAmount, setEarnAmount] = useState('');
  const [isProcessingEarn, setIsProcessingEarn] = useState(false);
  const [isRefreshingVaults, setIsRefreshingVaults] = useState(false);
  const [lastEarnRefresh, setLastEarnRefresh] = useState<number>(Date.now());
  const [refreshCountdown, setRefreshCountdown] = useState<number>(60);
  const earnRefreshIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const [swapFrom, setSwapFrom] = useState(INITIAL_TOKENS[0]);
  const [swapTo, setSwapTo] = useState(INITIAL_TOKENS[2]);
  const [swapAmount, setSwapAmount] = useState('1.0');
  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [swapType, setSwapType] = useState<OrderType>('market');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [pendingOrders, setPendingOrders] = useState<LimitOrder[]>([]);
  
  const [isSwapping, setIsSwapping] = useState(false);
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [isRefreshingQuote, setIsRefreshingQuote] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [quotaError, setQuotaError] = useState(false);
  const quoteRefreshIntervalRef = useRef<number | null>(null);

  const [launchConfig, setLaunchConfig] = useState<TokenLaunchConfig>({
    name: '', symbol: '', supply: '1000000000', initialLiquidity: '1.0', description: '', image: '',
    template: 'Meme', buyTax: '5', sellTax: '5', burnRate: '2', lockPeriod: '1 Year'
  });
  const [launchStep, setLaunchStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentLog, setDeploymentLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aiFetchedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      try { await sdk.actions.ready(); } catch (err) { console.warn("Farcaster SDK not found."); }
    };
    init();
    
    if (!aiFetchedRef.current) {
      fetchAI();
      fetchSentimentTrend();
      aiFetchedRef.current = true;
    }
  }, []);

  const handleFetchQuote = useCallback(async (isSilent = false) => {
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || parseFloat(swapAmount) <= 0) {
      setSwapQuote(null); return;
    }
    if (!isSilent) setIsRefreshingQuote(true);
    setQuotaError(false);
    try {
      const quote = await getSwapQuote(swapFrom.symbol, swapTo.symbol, swapAmount);
      setSwapQuote(quote);
      if (swapType === 'limit' && !limitPrice) {
        const marketPrice = parseFloat(quote.outputAmount) / parseFloat(swapAmount);
        setLimitPrice(marketPrice.toFixed(6));
      }
    } catch (e: any) { 
      console.error(e); 
      if (e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED')) {
        setQuotaError(true);
      }
    } finally {
      setIsRefreshingQuote(false);
    }
  }, [swapFrom.symbol, swapTo.symbol, swapAmount, swapType, limitPrice]);

  const refreshLiveBalance = useCallback(async (tokenSymbol: string) => {
    if (activeTab !== Tab.SWAP) return;
    setIsRefreshingBalance(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setAvailableTokens(prev => prev.map(t => {
      if (t.symbol === tokenSymbol) {
        const jitter = (Math.random() - 0.5) * 0.0001;
        return { ...t, balance: parseFloat((t.balance + jitter).toFixed(6)) };
      }
      return t;
    }));
    setIsRefreshingBalance(false);
  }, [activeTab]);

  const refreshVaultData = useCallback(async () => {
    setIsRefreshingVaults(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setVaults(prev => prev.map(v => ({
      ...v,
      totalApy: parseFloat((v.totalApy + (Math.random() - 0.5) * 0.1).toFixed(2)),
      deposits: (parseFloat(v.deposits.replace('M', '')) + (Math.random() - 0.5) * 0.01).toFixed(2) + 'M',
      liquidity: (parseFloat(v.liquidity.replace('K', '')) + (Math.random() - 0.5) * 0.5).toFixed(0) + 'K',
      balance: v.balance ? (parseFloat(v.balance) + (Math.random() - 0.5) * 0.0005).toFixed(6) : v.balance,
    })));
    setIsRefreshingVaults(false);
    setLastEarnRefresh(Date.now());
    setRefreshCountdown(60);
  }, []);

  useEffect(() => {
    if (activeTab === Tab.SWAP) {
      refreshLiveBalance(swapFrom.symbol);
    } else if (activeTab === Tab.EARN) {
      refreshVaultData();
    }
  }, [swapFrom.symbol, activeTab, refreshLiveBalance, refreshVaultData]);

  useEffect(() => {
    if (activeTab !== Tab.EARN) {
      if (earnRefreshIntervalRef.current) clearInterval(earnRefreshIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }
    earnRefreshIntervalRef.current = window.setInterval(() => { refreshVaultData(); }, 60000);
    countdownIntervalRef.current = window.setInterval(() => { setRefreshCountdown(prev => (prev > 0 ? prev - 1 : 60)); }, 1000);
    return () => { 
      if (earnRefreshIntervalRef.current) clearInterval(earnRefreshIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [activeTab, refreshVaultData]);

  useEffect(() => {
    if (activeTab !== Tab.SWAP) return;
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || parseFloat(swapAmount) <= 0) {
      setSwapQuote(null); setIsDebouncing(false); return;
    }
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setIsDebouncing(false); handleFetchQuote();
    }, 1500); 
    return () => clearTimeout(timer);
  }, [swapAmount, swapFrom, swapTo, handleFetchQuote, activeTab]);

  useEffect(() => {
    if (activeTab !== Tab.SWAP) {
      if (quoteRefreshIntervalRef.current) clearInterval(quoteRefreshIntervalRef.current);
      return;
    }
    quoteRefreshIntervalRef.current = window.setInterval(() => {
      if (swapAmount && parseFloat(swapAmount) > 0) handleFetchQuote(true);
      refreshLiveBalance(swapFrom.symbol);
    }, 120000); 
    return () => { if (quoteRefreshIntervalRef.current) clearInterval(quoteRefreshIntervalRef.current); };
  }, [activeTab, swapAmount, handleFetchQuote, refreshLiveBalance, swapFrom.symbol]);

  const fetchAI = async () => {
    setLoadingAI(true);
    try {
      const insight = await getMarketInsights(availableTokens);
      setAiInsight(insight);
    } catch (e) { 
      console.error(e); 
      setQuotaError(true);
    } finally { 
      setLoadingAI(false); 
    }
  };

  const fetchSentimentTrend = async () => {
    try {
      const trend = await getHistoricalSentiment();
      setHistoricalSentiment(trend);
    } catch (e) { console.error(e); }
  };

  const handleExecuteSwap = () => {
    setIsSwapping(true);
    if (swapType === 'market') {
      setTimeout(() => {
        setIsSwapping(false); setShowSwapConfirm(false); setSwapSuccess(true);
        const amountNum = parseFloat(swapAmount);
        setAvailableTokens(prev => prev.map(t => {
          if (t.symbol === swapFrom.symbol) return { ...t, balance: t.balance - amountNum };
          if (t.symbol === swapTo.symbol) return { ...t, balance: t.balance + (parseFloat(swapQuote.outputAmount)) };
          return t;
        }));
      }, 2500);
    } else {
      setTimeout(() => {
        const newOrder: LimitOrder = {
          id: Math.random().toString(36).substr(2, 9),
          fromToken: swapFrom.symbol,
          toToken: swapTo.symbol,
          amount: swapAmount,
          targetPrice: limitPrice,
          status: 'pending',
          timestamp: Date.now()
        };
        setPendingOrders(prev => [newOrder, ...prev]);
        setIsSwapping(false);
        setShowSwapConfirm(false);
        setSwapAmount('');
        setLimitPrice('');
      }, 1500);
    }
  };

  const cancelOrder = (id: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== id));
  };

  const handleExecuteEarn = () => {
    setIsProcessingEarn(true);
    setTimeout(() => { setIsProcessingEarn(false); setEarnAmount(''); }, 1500);
  };

  const handleApplyTemplate = (template: TokenTemplate) => {
    setLaunchConfig(prev => ({
      ...prev,
      template,
      ...TEMPLATE_PRESETS[template]
    }));
  };

  const handleDeployToken = () => {
    setIsDeploying(true); setDeploymentLog([]);
    const logs = [
      "Agent initialized...", 
      `Applying ${launchConfig.template} blueprint...`,
      `Configuring tokenomics: Buy ${launchConfig.buyTax}%, Sell ${launchConfig.sellTax}%...`,
      `Initializing burn mechanism at ${launchConfig.burnRate}%...`,
      `Setting liquidity lock: ${launchConfig.lockPeriod}...`,
      "Verifying bytecode on Base Scan...", 
      "Injecting initial liquidity...", 
      "Token deployed successfully!"
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) { setDeploymentLog(prev => [...prev, logs[i]]); i++; }
      else { clearInterval(interval); setIsDeploying(false); setLaunchStep(3); }
    }, 600);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { alert("File size exceeds 1MB"); return; }
      const reader = new FileReader();
      reader.onloadend = () => { setLaunchConfig(prev => ({ ...prev, image: reader.result as string })); };
      reader.readAsDataURL(file);
    }
  };

  const portfolioTokens = useMemo(() => availableTokens.filter(t => t.balance > 0), [availableTokens]);
  
  const portfolioCategories = useMemo(() => {
    const groups: Record<TokenCategory, { tokens: Token[], totalValue: number }> = {
      'Mainnet': { tokens: [], totalValue: 0 },
      'Stables': { tokens: [], totalValue: 0 },
      'Ecosystem': { tokens: [], totalValue: 0 },
      'Governance': { tokens: [], totalValue: 0 }
    };
    
    portfolioTokens.forEach(t => {
      if (groups[t.category]) {
        groups[t.category].tokens.push(t);
        groups[t.category].totalValue += t.balance * t.price;
      }
    });

    return Object.entries(groups)
      .filter(([_, data]) => data.tokens.length > 0)
      .map(([name, data]) => ({ name, value: data.totalValue, tokens: data.tokens }));
  }, [portfolioTokens]);

  const activeCategory = useMemo(() => portfolioCategories[activePieIndex], [portfolioCategories, activePieIndex]);

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto pb-32 px-4 overflow-x-hidden selection:bg-blue-500/30">
      <header className="py-6 flex flex-col gap-4 border-b border-[#222222] mb-4">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0052FF] to-[#0022AA] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,82,255,0.4)]">
              <Globe className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none text-white uppercase italic">Base Portal</h1>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1">L2 Hub • AI Agent</p>
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-300">Base</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {activeTab === Tab.SWAP && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">SWAP</h2>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Optimal Routing via AERO</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {(isRefreshingQuote || isDebouncing) && (
                  <div className="text-[9px] text-blue-400 font-black uppercase tracking-widest animate-pulse flex items-center gap-1.5 bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/20">
                    <RefreshCw size={10} className="animate-spin" /> {isDebouncing ? 'Thinking...' : 'Live Quote'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex rounded-2xl bg-[#111] p-1 border border-[#222] max-w-[200px] mb-2">
              <button 
                onClick={() => setSwapType('market')}
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${swapType === 'market' ? 'bg-[#0052FF] text-white' : 'text-gray-500'}`}
              >
                Market
              </button>
              <button 
                onClick={() => setSwapType('limit')}
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${swapType === 'limit' ? 'bg-[#1A1A1A] border border-[#333] text-white' : 'text-gray-500'}`}
              >
                Limit
              </button>
            </div>

            <Card className="p-1 space-y-1 bg-[#0A0A0A] border-[#222] relative">
              <div className="bg-[#111] p-6 rounded-[24px] border border-transparent focus-within:border-blue-500/30 transition-all group">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">You Sell</span>
                  <div 
                    onClick={() => setSwapAmount(swapFrom.balance.toString())}
                    className="flex items-center gap-2 cursor-pointer bg-black/40 px-3 py-1.5 rounded-xl border border-[#222] hover:border-[#333] active:scale-95"
                  >
                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Balance</span>
                    <span className="text-xs text-white font-black tabular-nums">{swapFrom.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                    <span className="text-[10px] text-blue-500 font-black">MAX</span>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <input type="number" inputMode="decimal" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} placeholder="0.0" className="bg-transparent text-4xl sm:text-5xl outline-none font-black text-white w-full tabular-nums" />
                  <SearchableTokenSelector tokens={availableTokens} selectedToken={swapFrom} onSelect={(t) => setSwapFrom(t)} label="Sell" />
                </div>
              </div>

              {swapType === 'limit' && (
                <div className="bg-[#111] mx-4 p-4 rounded-2xl border border-blue-500/20 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Crosshair size={12} /> Target Execution Price
                    </span>
                    {swapQuote && (
                      <span className="text-[9px] font-bold text-gray-600 uppercase">
                        Current: {(parseFloat(swapQuote.outputAmount) / parseFloat(swapAmount)).toFixed(6)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <input 
                      type="number" 
                      placeholder="0.000000" 
                      value={limitPrice} 
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className="bg-transparent text-2xl font-black text-white outline-none w-full tabular-nums border-b border-[#222] pb-1 focus:border-blue-500 transition-all"
                    />
                    <span className="text-[10px] font-black text-gray-500 pb-2">{swapTo.symbol}/{swapFrom.symbol}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-center -my-6 relative z-10">
                <button onClick={() => { const temp = swapFrom; setSwapFrom(swapTo); setSwapTo(temp); setSwapQuote(null); }} className="bg-[#111] border-4 border-[#0A0A0A] p-3 rounded-2xl shadow-xl hover:rotate-180 hover:bg-[#1A1A1A] transition-all active:scale-90 group">
                  <ArrowDown size={22} className="text-[#0052FF] group-hover:text-blue-400" />
                </button>
              </div>

              <div className="bg-[#111] p-6 rounded-[24px] border border-transparent transition-all group">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">You Buy</span>
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-[#222]">
                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Balance</span>
                    <span className="text-xs text-gray-400 font-black tabular-nums">{swapTo.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1 relative">
                    <input readOnly value={swapType === 'market' ? (swapQuote?.outputAmount || '') : (limitPrice && swapAmount ? (parseFloat(limitPrice) * parseFloat(swapAmount)).toFixed(6) : '')} className={`bg-transparent text-4xl sm:text-5xl outline-none font-black text-white w-full tabular-nums cursor-default transition-opacity ${isDebouncing || isRefreshingQuote ? 'opacity-30' : 'opacity-100'}`} placeholder="0.0" />
                    {(isDebouncing || isRefreshingQuote) && <div className="absolute left-0 top-1/2 -translate-y-1/2"><Loader2 className="animate-spin text-blue-500 opacity-50" size={32} /></div>}
                  </div>
                  <SearchableTokenSelector tokens={availableTokens} selectedToken={swapTo} onSelect={(t) => setSwapTo(t)} label="Buy" />
                </div>
              </div>
            </Card>

            <Button 
              onClick={() => setShowSwapConfirm(true)} 
              className="w-full py-5 text-lg rounded-[28px]" 
              disabled={!swapAmount || parseFloat(swapAmount) <= 0 || isSwapping || (swapType === 'market' && !swapQuote) || (swapType === 'limit' && !limitPrice)}
            >
              {swapType === 'market' ? 'Review Swap' : 'Review Limit Order'}
            </Button>

            {pendingOrders.length > 0 && (
              <div className="space-y-4 pt-4 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 px-1">
                  <Timer size={16} className="text-blue-500" />
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Pending Limit Orders</h3>
                </div>
                {pendingOrders.map(order => (
                  <div key={order.id} className="bg-[#111] border border-[#222] p-4 rounded-2xl flex justify-between items-center group">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-white">{order.amount} {order.fromToken}</span>
                        <ArrowRight size={12} className="text-gray-600" />
                        <span className="text-sm font-black text-blue-500">{(parseFloat(order.amount) * parseFloat(order.targetPrice)).toFixed(4)} {order.toToken}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-500 uppercase bg-[#0A0A0A] px-2 py-0.5 rounded border border-[#222]">Target: {order.targetPrice}</span>
                      </div>
                    </div>
                    <button onClick={() => cancelOrder(order.id)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === Tab.EARN && (
          <div className="space-y-6 animate-in fade-in">
            {!selectedVault ? (
              <>
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">EARN</h2>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Yield Intelligence</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="bg-blue-900/20 text-blue-400 px-3 py-1.5 rounded-xl text-[10px] font-black border border-blue-800/30 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,82,255,0.1)]">
                      {isRefreshingVaults ? (
                        <Loader2 size={12} className="animate-spin text-blue-500" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                      )}
                      LIVE UPDATE
                    </div>
                    <div className="flex items-center gap-1.5">
                      <History size={10} className="text-gray-600" />
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest tabular-nums">
                        Refreshing in {refreshCountdown}s
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {vaults.map((vault) => (
                    <Card key={vault.address} className={`p-0 overflow-hidden cursor-pointer group active:scale-[0.98] transition-all relative ${isRefreshingVaults ? 'opacity-70 grayscale-[20%]' : ''}`} onClick={() => setSelectedVault(vault)}>
                      <div className="p-6 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center border border-[#333] group-hover:border-blue-500/50 shadow-inner">
                             <Wallet className="text-blue-500" size={28} />
                          </div>
                          <div>
                            <h3 className="font-black text-lg text-white group-hover:text-blue-400 transition-colors">{vault.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">{vault.asset.symbol} • MetaVault</p>
                              <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 text-[9px] font-black rounded border border-green-500/20 uppercase">Insured</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black text-green-400 tabular-nums tracking-tighter">{vault.totalApy}%</div>
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-[#0A0A0A] border-t border-[#222] grid grid-cols-2 gap-4">
                         <div>
                            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest block mb-0.5">Total Deposits</span>
                            <span className="text-xs font-black text-gray-300 tabular-nums">${vault.deposits}</span>
                         </div>
                         <div className="text-right">
                            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest block mb-0.5">Liquidity</span>
                            <span className="text-xs font-black text-gray-300 tabular-nums">${vault.liquidity}</span>
                         </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right-8">
                <button onClick={() => setSelectedVault(null)} className="flex items-center gap-2 text-[11px] font-black text-gray-500 hover:text-white uppercase tracking-widest bg-[#111] px-4 py-2 rounded-xl border border-[#222] transition-colors"><ChevronLeft size={16} /> Back</button>
                <Card className="p-8 space-y-8 rounded-[40px] border-[#333] relative overflow-hidden">
                   <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">{selectedVault.name}</h3>
                        <p className="text-[11px] text-gray-500 font-mono mt-1">{selectedVault.address}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-black text-green-400 tabular-nums">{selectedVault.totalApy}%</div>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex rounded-2xl bg-[#050505] p-1.5 border border-[#222]">
                         <button onClick={() => setEarnAction('deposit')} className={`flex-1 py-3.5 text-xs font-black rounded-xl transition-all ${earnAction === 'deposit' ? 'bg-[#0052FF] text-white shadow-lg' : 'text-gray-500'}`}>Deposit</button>
                         <button onClick={() => setEarnAction('withdraw')} className={`flex-1 py-3.5 text-xs font-black rounded-xl transition-all ${earnAction === 'withdraw' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'text-gray-500'}`}>Withdraw</button>
                      </div>
                      <div className="bg-[#050505] p-6 rounded-[32px] border border-[#222] focus-within:border-blue-500/50 transition-all">
                         <input type="number" placeholder="0.00" value={earnAmount} onChange={(e) => setEarnAmount(e.target.value)} className="bg-transparent text-4xl font-black text-white outline-none w-full tabular-nums placeholder:text-gray-800" />
                      </div>
                      <Button onClick={handleExecuteEarn} className="w-full py-6 text-xl rounded-[32px] shadow-[0_8px_30px_rgba(0,82,255,0.2)]" disabled={!earnAmount || isProcessingEarn}>
                        {isProcessingEarn ? <RefreshCw className="animate-spin" /> : `${earnAction} on Base`}
                      </Button>
                   </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === Tab.LAUNCH && (
          <div className="space-y-6 animate-in fade-in pb-12">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Launcher</h2>
                <p className="text-[11px] text-gray-500 font-bold uppercase mt-0.5 tracking-widest">Deploy Assets on Base</p>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 w-6 rounded-full transition-all duration-500 ${launchStep >= s ? 'bg-blue-500' : 'bg-[#222]'}`} />
                ))}
              </div>
            </div>

            {launchStep === 1 && (
              <Card className="p-8 space-y-8 rounded-[40px] animate-in slide-in-from-right-4 duration-500 border-[#222]">
                <div className="flex items-center gap-4">
                  <Rocket size={28} className="text-blue-500" />
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Step 1: Core Configuration</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Choose Template</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['Meme', 'Utility', 'DeFi', 'Custom'] as TokenTemplate[]).map(t => (
                        <button
                          key={t}
                          onClick={() => handleApplyTemplate(t)}
                          className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${
                            launchConfig.template === t 
                              ? 'bg-blue-500/10 border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(0,82,255,0.2)]' 
                              : 'bg-[#0A0A0A] border-[#222] text-gray-500 hover:border-[#333]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Token Name</label>
                      <input type="text" placeholder="e.g. Base Portal" className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 outline-none focus:border-blue-500 text-white font-black" value={launchConfig.name} onChange={(e) => setLaunchConfig({...launchConfig, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Ticker Symbol</label>
                      <input type="text" placeholder="BASE" className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 outline-none focus:border-blue-500 text-white font-black uppercase" value={launchConfig.symbol} onChange={(e) => setLaunchConfig({...launchConfig, symbol: e.target.value.toUpperCase()})} />
                    </div>
                  </div>

                  <Button onClick={() => setLaunchStep(2)} className="w-full py-5 text-xl rounded-[32px]" disabled={!launchConfig.name || !launchConfig.symbol}>Next: Tokenomics</Button>
                </div>
              </Card>
            )}

            {launchStep === 2 && (
              <Card className="p-8 space-y-8 rounded-[40px] animate-in slide-in-from-right-4 duration-500 border-[#222]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <ShieldCheck size={28} className="text-blue-500" />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Step 2: Economic Model</h3>
                  </div>
                  <span className="text-[9px] bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full font-black uppercase border border-blue-500/20">{launchConfig.template} PRESET</span>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Buy Tax (%)</label>
                      <input type="number" className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 outline-none focus:border-blue-500 text-white font-black" value={launchConfig.buyTax} onChange={(e) => setLaunchConfig({...launchConfig, buyTax: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Sell Tax (%)</label>
                      <input type="number" className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 outline-none focus:border-blue-500 text-white font-black" value={launchConfig.sellTax} onChange={(e) => setLaunchConfig({...launchConfig, sellTax: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-1.5"><Flame size={12} className="text-orange-500" /> Burn Rate (%)</label>
                      <input type="number" step="0.1" className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 outline-none focus:border-blue-500 text-white font-black" value={launchConfig.burnRate} onChange={(e) => setLaunchConfig({...launchConfig, burnRate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-1.5"><Lock size={12} className="text-blue-500" /> Liquidity Lock</label>
                      <select 
                        className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 outline-none focus:border-blue-500 text-white font-black appearance-none"
                        value={launchConfig.lockPeriod}
                        onChange={(e) => setLaunchConfig({...launchConfig, lockPeriod: e.target.value})}
                      >
                        <option value="None">None</option>
                        <option value="30 Days">30 Days</option>
                        <option value="6 Months">6 Months</option>
                        <option value="1 Year">1 Year</option>
                        <option value="Forever">Forever</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-[24px] space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                      <span>Economic Logic</span>
                      <Zap size={14} className="text-blue-500" />
                    </div>
                    <p className="text-xs text-blue-300/70 italic leading-relaxed">
                      "Launching ${launchConfig.symbol} using the {launchConfig.template.toLowerCase()} engine. Revenue from taxes will fund the treasury, while a {launchConfig.burnRate}% burn rate creates deflationary pressure. Liquidity will be secured for {launchConfig.lockPeriod}."
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <Button variant="secondary" onClick={() => setLaunchStep(1)} className="rounded-[24px]">Back</Button>
                    <Button onClick={handleDeployToken} className="rounded-[24px]" disabled={isDeploying}>
                      {isDeploying ? <Loader2 className="animate-spin" size={18} /> : 'Deploy Asset'}
                    </Button>
                  </div>
                </div>

                {isDeploying && (
                  <div className="space-y-2 mt-4 max-h-40 overflow-y-auto bg-black p-5 rounded-2xl border border-[#222] font-mono text-[10px] shadow-inner">
                    {deploymentLog.map((log, i) => (
                      <div key={i} className="text-green-500 flex items-center gap-2">
                        <span className="text-gray-700">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {launchStep === 3 && (
              <div className="animate-in zoom-in-95 duration-500 space-y-6">
                <Card className="p-10 text-center space-y-8 rounded-[48px] border-green-500/20 bg-gradient-to-b from-green-500/10 to-transparent">
                  <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto border-4 border-green-500/30">
                    <CheckCircle2 size={48} />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter">Deployment Live</h3>
                    <p className="text-sm text-gray-400 mt-4 leading-relaxed px-4">
                      The asset <span className="text-white font-black">${launchConfig.symbol}</span> is now active on Base with verified {launchConfig.template.toLowerCase()} tokenomics.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button onClick={() => setLaunchStep(1)} className="rounded-[24px] uppercase tracking-widest text-xs">New Launch</Button>
                    <Button variant="secondary" className="rounded-[24px] uppercase tracking-widest text-xs"><Share2 size={16} /> Broadcast</Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === Tab.PORTFOLIO && (
          <div className="space-y-6 animate-in fade-in pb-12">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Analytics</h2>
                <p className="text-[11px] text-gray-500 font-bold uppercase mt-0.5">Asset Allocation</p>
              </div>
              <span className="text-[10px] bg-blue-900/20 text-blue-500 px-3 py-1.5 rounded-xl border border-blue-900/30 font-black uppercase">Live Context</span>
            </div>
            
            <div className="space-y-4">
              <Card className="relative h-72 rounded-[40px] border-[#222] flex flex-col items-center justify-center overflow-hidden cursor-pointer bg-[#0A0A0A] shadow-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      activeIndex={activePieIndex}
                      activeShape={renderActiveShape}
                      data={portfolioCategories} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={65} 
                      outerRadius={85} 
                      paddingAngle={4} 
                      dataKey="value" 
                      stroke="none"
                      onClick={(_, index) => setActivePieIndex(index)}
                    >
                      {portfolioCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ display: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.3em] mb-1">Total Balance</span>
                  <span className="text-3xl font-black text-white tracking-tighter tabular-nums">
                    ${portfolioCategories.reduce((acc, curr) => acc + curr.value, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </Card>

              <div key={activePieIndex} className="animate-in slide-in-from-bottom-4 duration-500 space-y-4">
                <div className="flex items-center justify-between px-2 bg-[#111] p-3 rounded-2xl border border-[#222]">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[activePieIndex % COLORS.length] }} 
                    />
                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">
                      {activeCategory?.name} <span className="text-gray-500">Holdings</span>
                    </h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-white tabular-nums">
                      ${activeCategory?.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[8px] text-blue-500 font-bold uppercase">
                      {((activeCategory?.value / portfolioCategories.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}% of Wallet
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {activeCategory?.tokens.map((token, idx) => (
                    <div 
                      key={token.symbol} 
                      className="bg-[#0A0A0A] border border-[#222] rounded-[24px] p-5 shadow-xl group hover:bg-[#111] hover:border-blue-500/30 transition-all active:scale-[0.98] animate-in slide-in-from-right-2"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#151515] flex items-center justify-center border border-[#333] group-hover:border-blue-500/50">
                              {token.iconUrl ? (
                                <img src={token.iconUrl} className="w-6 h-6 rounded-full" />
                              ) : (
                                <div className="text-sm font-black text-blue-500 uppercase">{token.symbol[0]}</div>
                              )}
                            </div>
                            <div>
                               <h4 className="text-sm font-black text-white leading-none">{token.name}</h4>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-gray-400 font-bold">{token.symbol}</span>
                                  <div className={`flex items-center gap-0.5 text-[9px] font-black tabular-nums ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                     {token.change24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                     {Math.abs(token.change24h)}%
                                  </div>
                               </div>
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="text-lg font-black text-white tracking-tighter tabular-nums">
                                ${(token.balance * token.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </div>
                             <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest tabular-nums">
                                {token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 px-1">
                <Activity size={16} className="text-green-500" />
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Market Intelligence</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {aiInsight?.alerts?.map((alert, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-[#111] rounded-[24px] border border-[#222]">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] shrink-0" />
                    <p className="text-xs font-black text-gray-300 uppercase tracking-tight">{alert}</p>
                  </div>
                ))}
              </div>
              <Card className="p-6 rounded-[32px] h-64 bg-gradient-to-b from-[#111] to-[#0A0A0A] border-[#222]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalSentiment}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #222', borderRadius: '12px' }} 
                      itemStyle={{ color: '#0052FF', fontWeight: 'black', textTransform: 'uppercase', fontSize: '10px' }} 
                    />
                    <Line type="monotone" dataKey="score" stroke="#0052FF" strokeWidth={3} dot={{ r: 4, fill: '#0052FF', strokeWidth: 2, stroke: '#0A0A0A' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-[#222] px-4 pb-8 pt-4 flex justify-around items-center z-[90]">
        {[
          { id: Tab.SWAP, icon: ArrowLeftRight, label: 'Swap' },
          { id: Tab.EARN, icon: TrendingUp, label: 'Earn' },
          { id: Tab.LAUNCH, icon: Rocket, label: 'Launch' },
          { id: Tab.PORTFOLIO, icon: PieChartIcon, label: 'Stats' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-2 transition-all duration-300 ${activeTab === item.id ? 'text-[#0052FF] scale-105' : 'text-gray-600'}`}>
            <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">{item.label}</span>
          </button>
        ))}
      </nav>
      <style>{`
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .animate-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default App;
