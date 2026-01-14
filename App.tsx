
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
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
  ArrowRight
} from 'lucide-react';
import { Tab, Token, YieldOpportunity, AIInsight, TokenLaunchConfig, MorphoVault } from './types';
import { Card, Button, Modal, SearchableTokenSelector } from './components/UI';
import { getMarketInsights, generateTokenDescription, getSwapQuote } from './services/geminiService';

const COLORS = ['#0052FF', '#FFBB28', '#FF8042', '#00C49F'];

const INITIAL_TOKENS: Token[] = [
  { 
    symbol: 'ETH', 
    name: 'Ethereum', 
    price: 2842.12, 
    change24h: 3.2, 
    balance: 1.5, 
    icon: 'E',
    iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  },
  { 
    symbol: 'USDC', 
    name: 'USDC', 
    price: 1.00, 
    change24h: 0.01, 
    balance: 4263.18, 
    icon: 'U',
    iconUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  { 
    symbol: 'DEGEN', 
    name: 'Degen Token', 
    price: 0.012, 
    change24h: -12.4, 
    balance: 500000, 
    icon: 'D',
    iconUrl: 'https://assets.coingecko.com/coins/images/34515/small/degen.png',
    address: '0x4ed4E8615216599b5966f03441F2282aE651ed9d'
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SWAP);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Token[]>(INITIAL_TOKENS);
  
  // Earn Portal States
  const [vaults, setVaults] = useState<MorphoVault[]>(INITIAL_MORPHO_VAULTS);
  const [selectedVault, setSelectedVault] = useState<MorphoVault | null>(null);
  const [earnAction, setEarnAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [earnAmount, setEarnAmount] = useState('');
  const [isProcessingEarn, setIsProcessingEarn] = useState(false);
  const [isRefreshingVaults, setIsRefreshingVaults] = useState(false);
  const earnRefreshIntervalRef = useRef<number | null>(null);

  // Network Stats
  const [blockNumber, setBlockNumber] = useState(25841092);
  const [networkStatus, setNetworkStatus] = useState<'Live' | 'Degraded' | 'Maintenance'>('Live');
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const blockUpdateRef = useRef<number | null>(null);

  // Swap States
  const [swapFrom, setSwapFrom] = useState(INITIAL_TOKENS[0]);
  const [swapTo, setSwapTo] = useState(INITIAL_TOKENS[1]);
  const [swapAmount, setSwapAmount] = useState('1.0');
  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [showSlippageInfo, setShowSlippageInfo] = useState(false);
  const [isRefreshingQuote, setIsRefreshingQuote] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [showPriceInverted, setShowPriceInverted] = useState(false);
  const [lastQuoteTime, setLastQuoteTime] = useState<number>(Date.now());
  const quoteRefreshIntervalRef = useRef<number | null>(null);

  // Launch States
  const [launchConfig, setLaunchConfig] = useState<TokenLaunchConfig>({
    name: '', symbol: '', supply: '1000000000', initialLiquidity: '1.0', description: '', image: ''
  });
  const [launchStep, setLaunchStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentLog, setDeploymentLog] = useState<string[]>([]);
  const [launchAIThinking, setLaunchAIThinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try { await sdk.actions.ready(); } catch (err) { console.warn("Farcaster SDK not found."); }
    };
    init();
    fetchAI();
    blockUpdateRef.current = window.setInterval(() => { setBlockNumber(prev => prev + 1); }, 2000);
    return () => { if (blockUpdateRef.current) clearInterval(blockUpdateRef.current); };
  }, []);

  const handleFetchQuote = useCallback(async (isSilent = false) => {
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || parseFloat(swapAmount) <= 0) {
      setSwapQuote(null); return;
    }
    if (!isSilent) setLoadingAI(true);
    setIsRefreshingQuote(true);
    try {
      const quote = await getSwapQuote(swapFrom.symbol, swapTo.symbol, swapAmount);
      setSwapQuote(quote);
      setLastQuoteTime(Date.now());
    } catch (e) { console.error(e); } finally {
      if (!isSilent) setLoadingAI(false);
      setIsRefreshingQuote(false);
    }
  }, [swapFrom.symbol, swapTo.symbol, swapAmount]);

  // Real-time balance refresh
  const refreshLiveBalance = useCallback(async (tokenSymbol: string) => {
    if (activeTab !== Tab.SWAP) return;
    setIsRefreshingBalance(true);
    // Simulate onchain balance fetch delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setAvailableTokens(prev => prev.map(t => {
      if (t.symbol === tokenSymbol) {
        // Simulate a minor change to show it's "live"
        const jitter = (Math.random() - 0.5) * 0.0001;
        return { ...t, balance: parseFloat((t.balance + jitter).toFixed(6)) };
      }
      return t;
    }));
    
    setIsRefreshingBalance(false);
  }, [activeTab]);

  // Vault data refresh
  const refreshVaultData = useCallback(async () => {
    if (activeTab !== Tab.EARN) return;
    setIsRefreshingVaults(true);
    
    // Simulate onchain fetch
    await new Promise(resolve => setTimeout(resolve, 1200));

    setVaults(prev => prev.map(v => {
      // Simulate live jitter for APY, deposits, liquidity and balance
      const apyJitter = (Math.random() - 0.5) * 0.1;
      const balanceJitter = (Math.random() - 0.5) * 0.0005;
      
      return {
        ...v,
        totalApy: parseFloat((v.totalApy + apyJitter).toFixed(2)),
        balance: v.balance ? (parseFloat(v.balance) + balanceJitter).toFixed(6) : v.balance,
      };
    }));

    setIsRefreshingVaults(false);
  }, [activeTab]);

  // Sync selected vault with state updates
  useEffect(() => {
    if (selectedVault) {
      const liveVault = vaults.find(v => v.address === selectedVault.address);
      if (liveVault && JSON.stringify(liveVault) !== JSON.stringify(selectedVault)) {
        setSelectedVault(liveVault);
      }
    }
  }, [vaults, selectedVault]);

  // Update swapFrom if underlying balance in availableTokens changes
  useEffect(() => {
    const liveToken = availableTokens.find(t => t.symbol === swapFrom.symbol);
    if (liveToken && liveToken.balance !== swapFrom.balance) {
      setSwapFrom(liveToken);
    }
  }, [availableTokens, swapFrom.symbol, swapFrom.balance]);

  useEffect(() => {
    if (activeTab === Tab.SWAP) {
      refreshLiveBalance(swapFrom.symbol);
    } else if (activeTab === Tab.EARN) {
      refreshVaultData();
    }
  }, [swapFrom.symbol, activeTab, refreshLiveBalance, refreshVaultData]);

  // Debounced Quote Logic
  useEffect(() => {
    if (activeTab !== Tab.SWAP) return;
    
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || parseFloat(swapAmount) <= 0) {
      setSwapQuote(null);
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setIsDebouncing(false);
      handleFetchQuote();
    }, 600);

    return () => clearTimeout(timer);
  }, [swapAmount, swapFrom, swapTo, handleFetchQuote, activeTab]);

  // Interval for Swap Tab Refresh
  useEffect(() => {
    if (activeTab !== Tab.SWAP) {
      if (quoteRefreshIntervalRef.current) clearInterval(quoteRefreshIntervalRef.current);
      return;
    }
    quoteRefreshIntervalRef.current = window.setInterval(() => {
      if (swapAmount && parseFloat(swapAmount) > 0) handleFetchQuote(true);
      refreshLiveBalance(swapFrom.symbol);
    }, 30000);
    return () => { if (quoteRefreshIntervalRef.current) clearInterval(quoteRefreshIntervalRef.current); };
  }, [activeTab, swapAmount, handleFetchQuote, refreshLiveBalance, swapFrom.symbol]);

  // Interval for Earn Tab Refresh (60s)
  useEffect(() => {
    if (activeTab !== Tab.EARN) {
      if (earnRefreshIntervalRef.current) clearInterval(earnRefreshIntervalRef.current);
      return;
    }
    earnRefreshIntervalRef.current = window.setInterval(() => {
      refreshVaultData();
    }, 60000);
    return () => { if (earnRefreshIntervalRef.current) clearInterval(earnRefreshIntervalRef.current); };
  }, [activeTab, refreshVaultData]);

  const refreshNetworkStats = () => {
    setIsRefreshingStats(true);
    setTimeout(() => {
      setBlockNumber(prev => prev + 5);
      setIsRefreshingStats(false);
    }, 800);
  };

  const fetchAI = async () => {
    setLoadingAI(true);
    try {
      const insight = await getMarketInsights(availableTokens);
      setAiInsight(insight);
    } catch (e) { console.error(e); } finally { setLoadingAI(false); }
  };

  const handleExecuteSwap = () => {
    setIsSwapping(true);
    setTimeout(() => {
      setIsSwapping(false);
      setShowSwapConfirm(false);
      setSwapSuccess(true);
      // Simulate balance update
      const amountNum = parseFloat(swapAmount);
      setAvailableTokens(prev => prev.map(t => {
        if (t.symbol === swapFrom.symbol) return { ...t, balance: t.balance - amountNum };
        if (t.symbol === swapTo.symbol) return { ...t, balance: t.balance + (parseFloat(swapQuote.outputAmount)) };
        return t;
      }));
    }, 2500);
  };

  const handleExecuteEarn = () => {
    setIsProcessingEarn(true);
    setTimeout(() => {
      setIsProcessingEarn(false);
      setEarnAmount('');
    }, 1500);
  };

  const handleImportToken = (token: Token) => { setAvailableTokens(prev => [...prev, token]); };

  const handleLaunchAI = async () => {
    if (!launchConfig.name || !launchConfig.symbol) return;
    setLaunchAIThinking(true);
    try {
      const desc = await generateTokenDescription(launchConfig.name, launchConfig.symbol);
      setLaunchConfig(prev => ({ ...prev, description: desc }));
    } catch (e) { console.error(e); } finally { setLaunchAIThinking(false); }
  };

  const handleDeployToken = () => {
    setIsDeploying(true);
    setDeploymentLog([]);
    const logs = ["Agent initialized...", "Validating contract...", "Broadcasting to Base...", "Success!"];
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) { setDeploymentLog(prev => [...prev, logs[i]]); i++; }
      else { clearInterval(interval); setIsDeploying(false); setLaunchStep(3); }
    }, 800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("File size exceeds 1MB");
        return;
      }
      if (!file.type.match('image/(png|jpeg|jpg)')) {
        alert("Only JPEG/PNG files are allowed");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLaunchConfig(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const portfolioData = availableTokens
    .filter(t => t.balance > 0)
    .map(t => ({ name: t.symbol, value: t.price * t.balance }));

  const priceRatio = useMemo(() => {
    if (!swapQuote?.outputAmount || !swapAmount || parseFloat(swapAmount) === 0) return null;
    const ratio = parseFloat(swapQuote.outputAmount) / parseFloat(swapAmount);
    if (showPriceInverted) {
      return `1 ${swapTo.symbol} = ${(1/ratio).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${swapFrom.symbol}`;
    }
    return `1 ${swapFrom.symbol} = ${ratio.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${swapTo.symbol}`;
  }, [swapQuote, swapAmount, swapFrom, swapTo, showPriceInverted]);

  const priceImpactColor = useMemo(() => {
    if (!swapQuote?.priceImpact) return 'text-gray-500';
    const impact = parseFloat(swapQuote.priceImpact.replace('%', ''));
    if (impact < 1) return 'text-green-500';
    if (impact < 3) return 'text-yellow-500';
    return 'text-red-500';
  }, [swapQuote]);

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto pb-32 px-4 overflow-x-hidden selection:bg-blue-500/30">
      {/* Header */}
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
          <div className="flex gap-2">
            <div className="bg-[#111] border border-[#222] rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-300">Base</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === Tab.SWAP && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-white">SWAP</h2>
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

            <Card className="p-1 space-y-1 bg-[#0A0A0A] border-[#222] relative">
              {/* Sell Section */}
              <div className="bg-[#111] p-6 rounded-[24px] border border-transparent focus-within:border-blue-500/30 focus-within:bg-[#141414] transition-all group">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">You Sell</span>
                    {isRefreshingBalance && <Loader2 size={10} className="animate-spin text-blue-500" />}
                  </div>
                  <div 
                    onClick={() => setSwapAmount(swapFrom.balance.toString())}
                    className="flex items-center gap-2 cursor-pointer group/bal bg-black/40 px-3 py-1.5 rounded-xl border border-[#222] hover:border-[#333] transition-all active:scale-95"
                  >
                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest group-hover/bal:text-blue-400 transition-colors">Balance</span>
                    <span className="text-xs text-white font-black tabular-nums">{swapFrom.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                    <span className="text-[10px] text-blue-500 font-black">MAX</span>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <input 
                    type="number" 
                    inputMode="decimal"
                    value={swapAmount} 
                    onChange={(e) => setSwapAmount(e.target.value)} 
                    placeholder="0.0"
                    className="bg-transparent text-4xl sm:text-5xl outline-none font-black text-white w-full placeholder:text-gray-800 tabular-nums" 
                  />
                  <SearchableTokenSelector tokens={availableTokens} selectedToken={swapFrom} onSelect={(t) => setSwapFrom(t)} label="Sell" />
                </div>
                <div className="mt-2 text-[11px] text-gray-600 font-bold tabular-nums">
                  ≈ ${(parseFloat(swapAmount || '0') * swapFrom.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Swap Switcher Button */}
              <div className="flex justify-center -my-6 relative z-10">
                <button 
                  onClick={() => {
                    const temp = swapFrom;
                    setSwapFrom(swapTo);
                    setSwapTo(temp);
                    setSwapQuote(null);
                  }}
                  className="bg-[#111] border-4 border-[#0A0A0A] p-3 rounded-2xl shadow-xl hover:rotate-180 hover:bg-[#1A1A1A] transition-all duration-500 active:scale-90 group"
                >
                  <ArrowDown size={22} className="text-[#0052FF] group-hover:text-blue-400 transition-colors" />
                </button>
              </div>

              {/* Buy Section */}
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
                    <input 
                      readOnly 
                      value={swapQuote?.outputAmount || ''} 
                      className={`bg-transparent text-4xl sm:text-5xl outline-none font-black text-white w-full placeholder:text-gray-800 tabular-nums cursor-default transition-opacity ${isDebouncing || isRefreshingQuote ? 'opacity-30' : 'opacity-100'}`} 
                      placeholder="0.0" 
                    />
                    {(isDebouncing || isRefreshingQuote) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-blue-500 opacity-50" size={32} />
                      </div>
                    )}
                  </div>
                  <SearchableTokenSelector tokens={availableTokens} selectedToken={swapTo} onSelect={(t) => setSwapTo(t)} label="Buy" />
                </div>
                <div className="mt-2 text-[11px] text-gray-600 font-bold tabular-nums flex justify-between items-center h-5">
                  {swapQuote ? (
                    <>
                      <span>≈ ${(parseFloat(swapQuote?.outputAmount || '0') * swapTo.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <div className="flex items-center gap-2">
                        {priceRatio && (
                          <button 
                            onClick={() => setShowPriceInverted(!showPriceInverted)}
                            className="text-[10px] text-gray-500 font-black hover:text-blue-400 transition-colors bg-[#111] px-2 py-0.5 rounded-md border border-[#222]"
                          >
                            {priceRatio}
                          </button>
                        )}
                        {swapQuote.priceImpact && (
                          <span className={`text-[10px] font-black uppercase tracking-tight ${priceImpactColor}`}>
                            Impact: {swapQuote.priceImpact}
                          </span>
                        )}
                      </div>
                    </>
                  ) : <span>&nbsp;</span>}
                </div>
              </div>
            </Card>

            {/* Quote & Settings Details */}
            <div className="space-y-3">
              <div className="bg-[#111] p-5 rounded-[24px] border border-[#222] space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setShowSlippageInfo(!showSlippageInfo)}>
                    <Settings2 size={14} className="text-gray-500" />
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-300">Slippage Tolerance</span>
                    <Info size={12} className="text-gray-600" />
                  </div>
                  <span className="text-sm font-black text-blue-500 tabular-nums">{slippage}%</span>
                </div>

                {showSlippageInfo && (
                  <div className="p-4 bg-[#0A0A0A] border border-[#222] rounded-2xl text-[10px] text-gray-400 leading-relaxed animate-in slide-in-from-top-2">
                    Slippage tolerance ensures your trade only executes if the price doesn't move more than this % before completion.
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {['0.1', '0.5', '1.0'].map((val) => (
                    <button
                      key={val}
                      onClick={() => setSlippage(val)}
                      className={`py-3 rounded-xl text-xs font-black transition-all border ${
                        slippage === val 
                          ? 'bg-blue-500/10 border-blue-500 text-blue-500' 
                          : 'bg-[#0A0A0A] border-[#222] text-gray-500 hover:border-[#333]'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                  <div className="relative">
                    <input 
                      type="number"
                      placeholder="Custom"
                      className="w-full h-full bg-[#0A0A0A] border border-[#222] rounded-xl py-2 px-3 text-xs font-black text-white outline-none focus:border-blue-500 transition-all placeholder:text-gray-700 tabular-nums"
                      onChange={(e) => setSlippage(e.target.value)}
                      onBlur={(e) => { if (!e.target.value) setSlippage('0.5'); }}
                    />
                  </div>
                </div>
              </div>

              {swapQuote && (
                <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-[24px] space-y-3 animate-in fade-in slide-in-from-top-2">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-blue-400/70">
                      <span>Routing Details</span>
                      <ShieldCheck size={12} />
                   </div>
                   <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500 font-bold uppercase">Optimal Route</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-mono font-bold">{swapQuote.route}</span>
                        <Zap size={10} className="text-blue-500" />
                      </div>
                   </div>
                   <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500 font-bold uppercase">Network Fee</span>
                      <span className="text-white font-bold">{swapQuote.fee}</span>
                   </div>
                </div>
              )}

              <Button 
                onClick={() => setShowSwapConfirm(true)} 
                className="w-full py-5 text-lg rounded-[28px] mt-4"
                disabled={!swapAmount || parseFloat(swapAmount) <= 0 || isSwapping || !swapQuote}
              >
                {isSwapping ? <RefreshCw className="animate-spin" /> : 'Review Swap'}
              </Button>
            </div>

            {/* Swap Confirm Modal */}
            <Modal isOpen={showSwapConfirm} onClose={() => setShowSwapConfirm(false)} title="Confirm Swap">
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center p-4 bg-[#111] rounded-2xl border border-[#222]">
                    <div className="flex items-center gap-3">
                      <img src={swapFrom.iconUrl} className="w-8 h-8 rounded-full" />
                      <span className="text-lg font-black text-white">{swapAmount} {swapFrom.symbol}</span>
                    </div>
                    <ArrowRight className="text-gray-600" />
                    <div className="flex items-center gap-3">
                      <img src={swapTo.iconUrl} className="w-8 h-8 rounded-full" />
                      <span className="text-lg font-black text-white">{swapQuote?.outputAmount} {swapTo.symbol}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 px-1">
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Exchange Rate</span>
                      <span className="text-white font-black tabular-nums">{priceRatio}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Price Impact</span>
                      <span className={`font-black tabular-nums ${priceImpactColor}`}>{swapQuote?.priceImpact}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Minimum Received</span>
                      <span className="text-white font-black tabular-nums">
                        {(parseFloat(swapQuote?.outputAmount || '0') * (1 - parseFloat(slippage)/100)).toLocaleString(undefined, { maximumFractionDigits: 6 })} {swapTo.symbol}
                      </span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Network Cost</span>
                      <span className="text-blue-500 font-black tabular-nums">{swapQuote?.fee}</span>
                   </div>
                </div>

                <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-yellow-500/80 leading-relaxed font-bold uppercase">
                    Trades are simulated. Always verify the transaction data in your wallet before confirming on the Base network.
                  </p>
                </div>

                <Button onClick={handleExecuteSwap} className="w-full py-5 rounded-2xl shadow-xl" disabled={isSwapping}>
                  {isSwapping ? <RefreshCw className="animate-spin" /> : 'Confirm Swap'}
                </Button>
              </div>
            </Modal>

            {/* Success Modal */}
            <Modal isOpen={swapSuccess} onClose={() => setSwapSuccess(false)} title="Swap Successful">
               <div className="text-center space-y-6 py-8">
                  <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/30">
                    <CheckCircle2 size={40} className="animate-in zoom-in-50 duration-500" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Broadcast Success</h4>
                    <p className="text-sm text-gray-500 mt-2 font-bold uppercase tracking-widest">Transaction finalized on Base</p>
                  </div>
                  <div className="p-4 bg-[#111] rounded-2xl border border-[#222] flex justify-between items-center">
                    <span className="text-[11px] text-gray-500 font-black uppercase">Tx Hash</span>
                    <span className="text-[11px] text-blue-500 font-mono font-bold">0x4a8f...9d2e <ExternalLink size={10} className="inline ml-1" /></span>
                  </div>
                  <Button onClick={() => setSwapSuccess(false)} className="w-full">Dismiss</Button>
               </div>
            </Modal>
          </div>
        )}

        {activeTab === Tab.EARN && (
          <div className="space-y-4 animate-in fade-in">
            {!selectedVault ? (
              <>
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase">EARN</h2>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Yield Intelligence</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRefreshingVaults && (
                      <div className="text-[9px] text-blue-400 font-black uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                        <RefreshCw size={10} className="animate-spin" /> Syncing
                      </div>
                    )}
                    <div className="bg-blue-900/20 text-blue-400 px-3 py-1.5 rounded-xl text-[10px] font-black border border-blue-800/30 flex items-center gap-1.5">
                      <TrendingUp size={12} /> Morpho
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {vaults.map((vault) => (
                    <Card key={vault.address} className="p-0 overflow-hidden hover:border-[#0052FF55] transition-all cursor-pointer group active:scale-[0.98]" onClick={() => setSelectedVault(vault)}>
                      <div className="p-5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#111] to-[#1a1a1a] flex items-center justify-center border border-[#333] group-hover:border-blue-500/50 transition-colors">
                             <Wallet className="text-blue-500" size={24} />
                          </div>
                          <div>
                            <h3 className="font-black text-base text-white leading-tight">{vault.name}</h3>
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">{vault.asset.symbol} • V2 MetaVault</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-green-400 tabular-nums">{vault.totalApy}%</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center justify-end gap-1">
                             Details <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#0A0A0A] px-5 py-3 flex justify-between items-center border-t border-[#222]">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">TVL: ${vault.deposits}</span>
                        <div className="flex gap-2">
                           {vault.rewards.map(r => (
                             <span key={r.assetName} className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/20 font-black tracking-widest">
                               +{r.apy}% {r.assetName}
                             </span>
                           ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="bg-gradient-to-r from-blue-500/10 to-transparent border-blue-500/20 p-6 rounded-[32px]">
                   <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20">
                        <Zap className="text-white" size={20} />
                      </div>
                      <div>
                         <h4 className="font-black text-sm text-white uppercase tracking-tight">Smart Suggestion</h4>
                         <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">Agent detected high relative APY in <span className="text-blue-400 font-bold">{vaults[0].name}</span>. Auto-compounding is active for this vault.</p>
                      </div>
                   </div>
                </Card>
              </>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between px-1">
                  <button onClick={() => setSelectedVault(null)} className="flex items-center gap-2 text-[11px] font-black text-gray-500 hover:text-white transition-colors uppercase tracking-widest bg-[#111] px-4 py-2 rounded-xl border border-[#222]">
                     <ChevronLeft size={16} /> Back
                  </button>
                  {isRefreshingVaults && (
                    <RefreshCw size={14} className="animate-spin text-blue-500" />
                  )}
                </div>

                <Card className="p-8 space-y-8 rounded-[40px] border-[#222] bg-gradient-to-b from-[#111] to-[#0A0A0A]">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-5">
                         <div className="w-16 h-16 bg-gradient-to-br from-[#0052FF22] to-transparent border border-blue-500/30 rounded-3xl flex items-center justify-center">
                            <Percent className="text-blue-500" size={32} />
                         </div>
                         <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter">{selectedVault.name}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                               <span className="text-[10px] bg-green-900/30 text-green-400 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-green-800/40">Verified</span>
                               <span className="text-[10px] text-gray-500 font-mono font-bold">0x...{selectedVault.address.slice(-4)}</span>
                            </div>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-4xl font-black text-green-400 tabular-nums">{selectedVault.totalApy}%</div>
                         <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Total APY</div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0A0A0A] p-4 rounded-3xl border border-[#222] group hover:border-[#333] transition-colors">
                         <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5">TVL</p>
                         <p className="text-lg font-black text-white tabular-nums">${selectedVault.deposits}</p>
                      </div>
                      <div className="bg-[#0A0A0A] p-4 rounded-3xl border border-[#222] group hover:border-[#333] transition-colors">
                         <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5">Available</p>
                         <p className="text-lg font-black text-white tabular-nums">${selectedVault.liquidity}</p>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex rounded-2xl bg-[#050505] p-1.5 border border-[#222]">
                         <button 
                            onClick={() => setEarnAction('deposit')}
                            className={`flex-1 py-3.5 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${earnAction === 'deposit' ? 'bg-[#0052FF] text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                         >
                            Deposit
                         </button>
                         <button 
                            onClick={() => setEarnAction('withdraw')}
                            className={`flex-1 py-3.5 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${earnAction === 'withdraw' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                         >
                            Withdraw
                         </button>
                      </div>

                      <div className="bg-[#050505] p-6 rounded-[32px] border border-[#222] focus-within:border-blue-500/30 transition-all">
                         <div className="flex justify-between items-center mb-4">
                            <span className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Amount</span>
                            <span className="text-[11px] text-gray-400 font-black tabular-nums bg-[#111] px-3 py-1 rounded-lg">
                               Bal: {selectedVault.asset.symbol === 'USDC' ? '4263.18' : '1.5'} {selectedVault.asset.symbol}
                            </span>
                         </div>
                         <div className="flex items-center gap-4">
                            <input 
                               type="number"
                               inputMode="decimal"
                               placeholder="0.00"
                               value={earnAmount}
                               onChange={(e) => setEarnAmount(e.target.value)}
                               className="bg-transparent text-4xl font-black text-white outline-none flex-1 placeholder:text-gray-800 tabular-nums"
                            />
                            <div className="text-sm font-black text-blue-500 uppercase tracking-widest">{selectedVault.asset.symbol}</div>
                         </div>
                      </div>

                      <Button 
                        onClick={handleExecuteEarn}
                        className="w-full py-6 text-xl rounded-[32px] mt-2"
                        disabled={!earnAmount || isProcessingEarn}
                      >
                         {isProcessingEarn ? <RefreshCw className="animate-spin" /> : `${earnAction} on Base`}
                      </Button>
                   </div>

                   <div className="pt-4 divide-y divide-[#222]">
                      <div className="flex justify-between py-4">
                         <span className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Vault Performance Fee</span>
                         <span className="text-xs text-gray-300 font-mono font-bold">{(selectedVault.vaultFee * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between py-4">
                         <span className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Your Position</span>
                         <span className="text-sm text-white font-black tabular-nums">{selectedVault.balance} {selectedVault.asset.symbol}</span>
                      </div>
                      <div className="flex justify-between py-4">
                         <span className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Accumulated Profit</span>
                         <span className="text-sm text-green-400 font-black tabular-nums">+{selectedVault.interestEarned} {selectedVault.asset.symbol}</span>
                      </div>
                   </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === Tab.LAUNCH && (
          <div className="space-y-4 animate-in fade-in pb-12">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-white uppercase">Launcher</h2>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Agent-Powered Deployment</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <Terminal size={14} className="text-blue-500" />
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">V2 Agent</span>
              </div>
            </div>
            
            <div className="flex gap-2 mb-4 px-1">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-700 ${launchStep >= s ? 'bg-blue-500 shadow-[0_0_12px_rgba(0,82,255,0.5)]' : 'bg-[#222]'}`} />
              ))}
            </div>

            {launchStep === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <Card className="p-8 space-y-8 rounded-[40px] border-[#222] bg-[#0A0A0A]">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#111] border border-[#222] rounded-2xl flex items-center justify-center">
                      <Rocket size={28} className="text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white leading-none">Initialize Asset</h3>
                      <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-2">Base Mainnet L2</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 block">Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="e.g. Base Banana" 
                        className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 outline-none focus:border-blue-500/50 transition-all text-white font-black text-lg placeholder:text-gray-800"
                        value={launchConfig.name}
                        onChange={(e) => setLaunchConfig({...launchConfig, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 block">Symbol <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-gray-500">$</span>
                        <input 
                          type="text" 
                          placeholder="BANANA" 
                          className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 pl-10 outline-none focus:border-blue-500/50 transition-all text-white font-black text-lg uppercase placeholder:text-gray-800"
                          value={launchConfig.symbol}
                          onChange={(e) => setLaunchConfig({...launchConfig, symbol: e.target.value.toUpperCase()})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 block">Image <span className="text-red-500">*</span></label>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/png, image/jpeg"
                        onChange={handleFileChange}
                      />
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full bg-[#111] border-2 border-dashed ${launchConfig.image ? 'border-blue-500/50' : 'border-[#333]'} rounded-[24px] p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#161616] transition-all overflow-hidden relative`}
                      >
                        {launchConfig.image ? (
                          <div className="absolute inset-0">
                            <img src={launchConfig.image} alt="Preview" className="w-full h-full object-cover opacity-40" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
                          </div>
                        ) : null}
                        
                        <div className="relative z-10 flex flex-col items-center text-center">
                          <Upload className={launchConfig.image ? 'text-white' : 'text-gray-500'} size={32} />
                          <p className="text-xs font-black text-white mt-2">Select file</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">JPEG / PNG, 1MB max</p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => setLaunchStep(2)} 
                      className="w-full py-5 text-xl rounded-[32px] mt-4" 
                      variant={launchConfig.name && launchConfig.symbol && launchConfig.image ? 'primary' : 'secondary'}
                      disabled={!launchConfig.name || !launchConfig.symbol || !launchConfig.image}
                    >
                      Next Step
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {launchStep === 2 && (
               <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                <Card className="p-8 space-y-8 rounded-[40px] border-[#222] bg-[#0A0A0A]">
                   <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#111] border border-[#222] rounded-2xl flex items-center justify-center">
                      <TrendingUp size={28} className="text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white leading-none">Tokenomics</h3>
                      <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-2">Gemini AI Engine</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 block">Supply</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#111] border border-[#222] rounded-2xl p-4 outline-none text-white font-mono font-bold text-sm tabular-nums"
                          value={launchConfig.supply}
                          onChange={(e) => setLaunchConfig({...launchConfig, supply: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 block">Liquidity (ETH)</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#111] border border-[#222] rounded-2xl p-4 outline-none text-white font-mono font-bold text-sm tabular-nums"
                          value={launchConfig.initialLiquidity}
                          onChange={(e) => setLaunchConfig({...launchConfig, initialLiquidity: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">AI Description</label>
                        <button 
                          onClick={handleLaunchAI} 
                          disabled={launchAIThinking}
                          className="text-[10px] text-blue-500 font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {launchAIThinking ? <RefreshCw size={10} className="animate-spin" /> : <Zap size={10} />}
                          Regenerate
                        </button>
                      </div>
                      <textarea 
                        className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 outline-none text-sm italic text-gray-300 h-32 resize-none focus:border-blue-500/50 transition-all leading-relaxed"
                        placeholder="Generating vision statement..."
                        value={launchAIThinking ? 'AI Agent is thinking...' : launchConfig.description}
                        onChange={(e) => setLaunchConfig({...launchConfig, description: e.target.value})}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => setLaunchStep(1)} className="flex-1 rounded-[24px]">Back</Button>
                      <Button onClick={handleDeployToken} className="flex-[2] py-5 rounded-[24px]"> Deploy </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {isDeploying && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
                <div className="relative w-full max-sm space-y-8 flex flex-col items-center">
                  <div className="w-24 h-24 relative">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Rocket size={32} className="text-blue-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-[#111] border border-[#222] rounded-[32px] p-6 font-mono text-[10px] w-full h-64 overflow-y-auto space-y-2 custom-scrollbar shadow-2xl">
                     {deploymentLog.map((log, i) => (
                       <div key={i} className="flex gap-3 animate-in slide-in-from-left-2">
                         <span className="text-blue-500 font-bold">{'>'}</span>
                         <span className="text-gray-400">{log}</span>
                       </div>
                     ))}
                     <div className="animate-pulse text-blue-500">_</div>
                  </div>
                </div>
              </div>
            )}

            {launchStep === 3 && (
              <div className="animate-in zoom-in-95 duration-500 space-y-6">
                <Card className="p-10 text-center space-y-8 rounded-[48px] border-green-500/20 bg-gradient-to-b from-green-500/10 to-transparent">
                  <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto border-4 border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                    <CheckCircle2 size={48} />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">Complete</h3>
                    <p className="text-sm text-gray-400 mt-4 leading-relaxed px-4">
                      Asset <span className="text-white font-black">${launchConfig.symbol}</span> is officially broadcasting on Base Mainnet.
                    </p>
                  </div>
                  <Button onClick={() => setLaunchStep(1)} className="w-full rounded-[32px]">New Mission</Button>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === Tab.PORTFOLIO && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-white uppercase">Intelligence</h2>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Nansen-Grade Analytics</p>
              </div>
              <span className="text-[10px] bg-yellow-900/20 text-yellow-500 px-3 py-1.5 rounded-xl border border-yellow-900/30 font-black uppercase tracking-widest">Elite Agent</span>
            </div>
            
            <Card className="relative h-72 rounded-[40px] border-[#222] flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={portfolioData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={75} 
                    outerRadius={95} 
                    paddingAngle={8} 
                    dataKey="value" 
                    stroke="none"
                    animationDuration={1500}
                  >
                    {portfolioData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #222', borderRadius: '24px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.3em] mb-1">Portfolio</span>
                <span className="text-4xl font-black text-white tracking-tighter">$7,214.50</span>
              </div>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <AlertCircle size={16} className="text-blue-500" />
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Smart Alerts</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {aiInsight?.alerts?.map((alert, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-[#111] rounded-[24px] border border-[#222] transition-all hover:border-[#333] animate-in slide-in-from-left-4" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] shrink-0" />
                    <p className="text-xs font-black text-gray-300 leading-relaxed uppercase tracking-tight">{alert}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile-Optimized Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-[#222] px-4 pb-8 pt-4 flex justify-around items-center z-[90] shadow-[0_-20px_40px_rgba(0,0,0,0.8)]">
        {[
          { id: Tab.SWAP, icon: ArrowLeftRight, label: 'Swap' },
          { id: Tab.EARN, icon: TrendingUp, label: 'Earn' },
          { id: Tab.LAUNCH, icon: Rocket, label: 'Launch' },
          { id: Tab.PORTFOLIO, icon: PieChartIcon, label: 'Stats' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`relative flex flex-col items-center gap-2 transition-all duration-300 group ${activeTab === item.id ? 'text-[#0052FF] scale-110' : 'text-gray-600 hover:text-gray-400'}`}
          >
            {activeTab === item.id && (
              <div className="absolute -top-4 w-10 h-1 bg-[#0052FF] rounded-full shadow-[0_0_15px_#0052FF] animate-pulse" />
            )}
            <div className={`p-2.5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-blue-500/10' : 'bg-transparent'}`}>
              <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">{item.label}</span>
          </button>
        ))}
      </nav>
      
      {/* Visual Enhancements */}
      <style>{`
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default App;
