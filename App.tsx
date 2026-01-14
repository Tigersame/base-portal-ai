
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
  const [quotaError, setQuotaError] = useState(false);
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
    setQuotaError(false);
    try {
      const quote = await getSwapQuote(swapFrom.symbol, swapTo.symbol, swapAmount);
      setSwapQuote(quote);
      setLastQuoteTime(Date.now());
    } catch (e: any) { 
      console.error(e); 
      if (e.message?.includes('429')) setQuotaError(true);
    } finally {
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

  // Update swapFrom if underlying balance changes
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

  // Debounced Quote Logic - increased to 1000ms to reduce quota usage
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
    }, 1000);

    return () => clearTimeout(timer);
  }, [swapAmount, swapFrom, swapTo, handleFetchQuote, activeTab]);

  // Throttled background refreshes
  useEffect(() => {
    if (activeTab !== Tab.SWAP) {
      if (quoteRefreshIntervalRef.current) clearInterval(quoteRefreshIntervalRef.current);
      return;
    }
    // Refresh every 60s instead of 30s to save quota
    quoteRefreshIntervalRef.current = window.setInterval(() => {
      if (swapAmount && parseFloat(swapAmount) > 0) handleFetchQuote(true);
      refreshLiveBalance(swapFrom.symbol);
    }, 60000);
    return () => { if (quoteRefreshIntervalRef.current) clearInterval(quoteRefreshIntervalRef.current); };
  }, [activeTab, swapAmount, handleFetchQuote, refreshLiveBalance, swapFrom.symbol]);

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
      if (file.size > 1024 * 1024) { alert("File size exceeds 1MB"); return; }
      if (!file.type.match('image/(png|jpeg|jpg)')) { alert("Only JPEG/PNG files are allowed"); return; }
      const reader = new FileReader();
      reader.onloadend = () => { setLaunchConfig(prev => ({ ...prev, image: reader.result as string })); };
      reader.readAsDataURL(file);
    }
  };

  const portfolioData = useMemo(() => availableTokens
    .filter(t => t.balance > 0)
    .map(t => ({ name: t.symbol, value: t.price * t.balance })), [availableTokens]);

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
          <div className="bg-[#111] border border-[#222] rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-300">Base</span>
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
                {quotaError && (
                  <div className="text-[9px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1.5 bg-red-500/5 px-2 py-0.5 rounded-full border border-red-500/20">
                    <AlertCircle size={10} /> Quota Warning
                  </div>
                )}
              </div>
            </div>

            <Card className="p-1 space-y-1 bg-[#0A0A0A] border-[#222] relative">
              <div className="bg-[#111] p-6 rounded-[24px] border border-transparent focus-within:border-blue-500/30 transition-all group">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">You Sell</span>
                    {isRefreshingBalance && <Loader2 size={10} className="animate-spin text-blue-500" />}
                  </div>
                  <div 
                    onClick={() => setSwapAmount(swapFrom.balance.toString())}
                    className="flex items-center gap-2 cursor-pointer bg-black/40 px-3 py-1.5 rounded-xl border border-[#222] hover:border-[#333] transition-all active:scale-95"
                  >
                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Balance</span>
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
              </div>

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
                  <div className="p-4 bg-[#0A0A0A] border border-[#222] rounded-2xl text-[10px] text-gray-400 leading-relaxed">
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
                  <input 
                    type="number"
                    placeholder="Custom"
                    className="w-full h-full bg-[#0A0A0A] border border-[#222] rounded-xl py-2 px-3 text-xs font-black text-white outline-none focus:border-blue-500 transition-all placeholder:text-gray-700"
                    onChange={(e) => setSlippage(e.target.value)}
                  />
                </div>
              </div>

              {swapQuote && (
                <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-[24px] space-y-3">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-blue-400/70">
                      <span>Routing Details</span>
                      <ShieldCheck size={12} />
                   </div>
                   <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500 font-bold uppercase">Optimal Route</span>
                      <span className="text-white font-mono font-bold">{swapQuote.route}</span>
                   </div>
                   <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500 font-bold uppercase">Estimated Fee</span>
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

            <Modal isOpen={showSwapConfirm} onClose={() => setShowSwapConfirm(false)} title="Confirm Swap">
              <div className="space-y-6">
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

                <div className="space-y-4 px-1">
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-bold uppercase text-[10px]">Exchange Rate</span>
                      <span className="text-white font-black tabular-nums">{priceRatio}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-bold uppercase text-[10px]">Price Impact</span>
                      <span className={`font-black tabular-nums ${priceImpactColor}`}>{swapQuote?.priceImpact}</span>
                   </div>
                </div>

                <Button onClick={handleExecuteSwap} className="w-full py-5 rounded-2xl" disabled={isSwapping}>
                  {isSwapping ? <RefreshCw className="animate-spin" /> : 'Confirm Swap'}
                </Button>
              </div>
            </Modal>

            <Modal isOpen={swapSuccess} onClose={() => setSwapSuccess(false)} title="Swap Successful">
               <div className="text-center space-y-6 py-8">
                  <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/30">
                    <CheckCircle2 size={40} className="animate-in zoom-in-50 duration-500" />
                  </div>
                  <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Broadcast Success</h4>
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
                  <div className="bg-blue-900/20 text-blue-400 px-3 py-1.5 rounded-xl text-[10px] font-black border border-blue-800/30 flex items-center gap-1.5">
                    <TrendingUp size={12} /> Morpho
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {vaults.map((vault) => (
                    <Card key={vault.address} className="p-0 overflow-hidden hover:border-[#0052FF55] transition-all cursor-pointer group active:scale-[0.98]" onClick={() => setSelectedVault(vault)}>
                      <div className="p-5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#111] to-[#1a1a1a] flex items-center justify-center border border-[#333]">
                             <Wallet className="text-blue-500" size={24} />
                          </div>
                          <div>
                            <h3 className="font-black text-base text-white leading-tight">{vault.name}</h3>
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">{vault.asset.symbol} • V2 MetaVault</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-green-400 tabular-nums">{vault.totalApy}%</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Details <ChevronRight size={12} className="inline ml-1" /></div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                <button onClick={() => setSelectedVault(null)} className="flex items-center gap-2 text-[11px] font-black text-gray-500 hover:text-white uppercase tracking-widest bg-[#111] px-4 py-2 rounded-xl border border-[#222]">
                   <ChevronLeft size={16} /> Back
                </button>
                <Card className="p-8 space-y-8 rounded-[40px]">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-5">
                         <div className="w-16 h-16 bg-gradient-to-br from-[#0052FF22] to-transparent border border-blue-500/30 rounded-3xl flex items-center justify-center">
                            <Percent className="text-blue-500" size={32} />
                         </div>
                         <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter">{selectedVault.name}</h3>
                            <span className="text-[10px] text-gray-500 font-mono font-bold">0x...{selectedVault.address.slice(-4)}</span>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-4xl font-black text-green-400 tabular-nums">{selectedVault.totalApy}%</div>
                         <div className="text-[10px] text-gray-500 font-black uppercase mt-1">Total APY</div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex rounded-2xl bg-[#050505] p-1.5 border border-[#222]">
                         <button 
                            onClick={() => setEarnAction('deposit')}
                            className={`flex-1 py-3.5 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${earnAction === 'deposit' ? 'bg-[#0052FF] text-white' : 'text-gray-500'}`}
                         >
                            Deposit
                         </button>
                         <button 
                            onClick={() => setEarnAction('withdraw')}
                            className={`flex-1 py-3.5 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${earnAction === 'withdraw' ? 'bg-[#1A1A1A] text-white' : 'text-gray-500'}`}
                         >
                            Withdraw
                         </button>
                      </div>

                      <div className="bg-[#050505] p-6 rounded-[32px] border border-[#222]">
                         <input 
                            type="number"
                            placeholder="0.00"
                            value={earnAmount}
                            onChange={(e) => setEarnAmount(e.target.value)}
                            className="bg-transparent text-4xl font-black text-white outline-none w-full tabular-nums"
                         />
                      </div>

                      <Button 
                        onClick={handleExecuteEarn}
                        className="w-full py-6 text-xl rounded-[32px]"
                        disabled={!earnAmount || isProcessingEarn}
                      >
                         {isProcessingEarn ? <RefreshCw className="animate-spin" /> : `${earnAction} on Base`}
                      </Button>
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
                <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-700 ${launchStep >= s ? 'bg-blue-500' : 'bg-[#222]'}`} />
              ))}
            </div>

            {launchStep === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <Card className="p-8 space-y-8 rounded-[40px]">
                  <div className="flex items-center gap-4">
                    <Rocket size={28} className="text-blue-500" />
                    <h3 className="text-xl font-black text-white">Initialize Asset</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase ml-2 block">Name *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Base Banana" 
                        className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 outline-none focus:border-blue-500 transition-all text-white font-black"
                        value={launchConfig.name}
                        onChange={(e) => setLaunchConfig({...launchConfig, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase ml-2 block">Symbol *</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-gray-500">$</span>
                        <input 
                          type="text" 
                          placeholder="BANANA" 
                          className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 pl-10 outline-none focus:border-blue-500 transition-all text-white font-black uppercase"
                          value={launchConfig.symbol}
                          onChange={(e) => setLaunchConfig({...launchConfig, symbol: e.target.value.toUpperCase()})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase ml-2 block">Image *</label>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/png, image/jpeg"
                        onChange={handleFileChange}
                      />
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full bg-[#111] border-2 border-dashed ${launchConfig.image ? 'border-blue-500/50' : 'border-[#333]'} rounded-[24px] p-8 flex flex-col items-center justify-center gap-3 cursor-pointer overflow-hidden relative`}
                      >
                        {launchConfig.image && (
                          <img src={launchConfig.image} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                        )}
                        <Upload className="text-gray-500" size={32} />
                        <p className="text-xs font-black text-white">Select file</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">JPEG / PNG, 1MB max</p>
                      </div>
                    </div>

                    <Button 
                      onClick={() => setLaunchStep(2)} 
                      className="w-full py-5 text-xl rounded-[32px]" 
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
                <Card className="p-8 space-y-8 rounded-[40px]">
                   <div className="flex items-center gap-4">
                    <TrendingUp size={28} className="text-blue-500" />
                    <h3 className="text-xl font-black text-white">Tokenomics</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-2 block">Supply</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#111] border border-[#222] rounded-2xl p-4 outline-none text-white font-mono"
                          value={launchConfig.supply}
                          onChange={(e) => setLaunchConfig({...launchConfig, supply: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-2 block">Liquidity (ETH)</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#111] border border-[#222] rounded-2xl p-4 outline-none text-white font-mono"
                          value={launchConfig.initialLiquidity}
                          onChange={(e) => setLaunchConfig({...launchConfig, initialLiquidity: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase block">AI Description</label>
                        <button 
                          onClick={handleLaunchAI} 
                          disabled={launchAIThinking}
                          className="text-[10px] text-blue-500 font-black flex items-center gap-1.5"
                        >
                          {launchAIThinking ? <RefreshCw size={10} className="animate-spin" /> : <Zap size={10} />}
                          Regenerate
                        </button>
                      </div>
                      <textarea 
                        className="w-full bg-[#111] border border-[#222] rounded-[24px] p-5 outline-none text-sm italic text-gray-300 h-32 resize-none"
                        value={launchAIThinking ? 'AI Agent is thinking...' : launchConfig.description}
                        onChange={(e) => setLaunchConfig({...launchConfig, description: e.target.value})}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => setLaunchStep(1)} className="flex-1">Back</Button>
                      <Button onClick={handleDeployToken} className="flex-[2] py-5"> Deploy </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {launchStep === 3 && (
              <div className="animate-in zoom-in-95 duration-500 space-y-6">
                <Card className="p-10 text-center space-y-8 rounded-[48px] border-green-500/20 bg-gradient-to-b from-green-500/10 to-transparent">
                  <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto border-4 border-green-500/30">
                    <CheckCircle2 size={48} />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-white uppercase italic">Complete</h3>
                    <p className="text-sm text-gray-400 mt-4">
                      Asset <span className="text-white font-black">${launchConfig.symbol}</span> is officially broadcasting on Base.
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
                <p className="text-[11px] text-gray-500 font-bold uppercase mt-0.5">Nansen-Grade Analytics</p>
              </div>
              <span className="text-[10px] bg-yellow-900/20 text-yellow-500 px-3 py-1.5 rounded-xl border border-yellow-900/30 font-black uppercase">Elite Agent</span>
            </div>
            
            <Card className="relative h-72 rounded-[40px] border-[#222] flex flex-col items-center justify-center overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={portfolioData} cx="50%" cy="50%" innerRadius={75} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none">
                    {portfolioData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #222', borderRadius: '24px' }} />
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
                  <div key={i} className="flex items-center gap-4 p-5 bg-[#111] rounded-[24px] border border-[#222] transition-all hover:border-[#333]">
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
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-[#222] px-4 pb-8 pt-4 flex justify-around items-center z-[90]">
        {[
          { id: Tab.SWAP, icon: ArrowLeftRight, label: 'Swap' },
          { id: Tab.EARN, icon: TrendingUp, label: 'Earn' },
          { id: Tab.LAUNCH, icon: Rocket, label: 'Launch' },
          { id: Tab.PORTFOLIO, icon: PieChartIcon, label: 'Stats' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-2 transition-all duration-300 ${activeTab === item.id ? 'text-[#0052FF]' : 'text-gray-600'}`}
          >
            <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <style>{`
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
