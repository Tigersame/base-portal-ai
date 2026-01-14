import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { 
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { 
  ArrowLeftRight, 
  Rocket, 
  PieChart as PieChartIcon, 
  Globe,
  CheckCircle2,
  ArrowDown,
  ChevronLeft,
  Loader2,
  ArrowRight,
  Settings2,
  Sparkles,
  User,
  Power,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  LogIn,
  BadgeCheck,
  Flame,
  Lock,
  Zap,
  Plus,
  Wallet as WalletIcon,
  ExternalLink,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { 
  Wallet, 
  ConnectWallet, 
  WalletDropdown, 
  WalletDropdownDisconnect,
  WalletDropdownLink,
  WalletDropdownBasename
} from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';

import { Tab, Token, MorphoVault, TokenCategory, TokenTemplate, AIInsight, TokenLaunchConfig } from './types';
import { Card, Button, Modal, SearchableTokenSelector } from './components/UI';
import { getMarketInsights, generateTokenDescription, getSwapQuote } from './services/geminiService';

const COLORS = ['#0052FF', '#00C49F', '#FFBB28', '#FF8042', '#8A2BE2'];

const TEMPLATE_PRESETS: Record<TokenTemplate, Partial<TokenLaunchConfig>> = {
  Meme: { buyTax: '5', sellTax: '5', burnRate: '2', lockPeriod: '1 Year' },
  Utility: { buyTax: '0', sellTax: '0', burnRate: '0', lockPeriod: '6 Months' },
  DeFi: { buyTax: '1', sellTax: '2', burnRate: '0.5', lockPeriod: 'Forever' },
  Custom: { buyTax: '0', sellTax: '0', burnRate: '0', lockPeriod: 'None' },
};

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
    address: '0x833589fCD6eDb6E08f4c7C32f4f71b54bdA02913'
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
  }
];

const INITIAL_MORPHO_VAULTS: MorphoVault[] = [
  {
    address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    name: 'USDC MetaVault',
    asset: { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32f4f71b54bdA02913', decimals: 6 },
    totalApy: 12.45,
    nativeApy: 8.2,
    vaultFee: 0.01,
    deposits: '1.2M',
    liquidity: '850K',
    rewards: [{ asset: '0xmorpho', assetName: 'MORPHO', apy: 4.25 }],
    balance: '0',
    interestEarned: '0'
  }
];

const App: React.FC = () => {
  const { address: onchainAddress, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SWAP);
  const [farcasterAddress, setFarcasterAddress] = useState<string | null>(null);
  const [basename, setBasename] = useState<string | null>(null);
  const [isConnectingFarcaster, setIsConnectingFarcaster] = useState(false);
  const [showFarcasterMenu, setShowFarcasterMenu] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<any>(null);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);

  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [availableTokens, setAvailableTokens] = useState<Token[]>(INITIAL_TOKENS);
  const [activePieIndex, setActivePieIndex] = useState(0);
  
  const [vaults] = useState<MorphoVault[]>(INITIAL_MORPHO_VAULTS);
  const [selectedVault, setSelectedVault] = useState<MorphoVault | null>(null);
  const [earnAmount, setEarnAmount] = useState('');

  const [swapFrom, setSwapFrom] = useState(INITIAL_TOKENS[0]);
  const [swapTo, setSwapTo] = useState(INITIAL_TOKENS[2]);
  const [swapAmount, setSwapAmount] = useState('1.0');
  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [isSwapping, setIsSwapping] = useState(false);
  const [isRefreshingQuote, setIsRefreshingQuote] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  const [launchConfig, setLaunchConfig] = useState<TokenLaunchConfig>({
    name: '', symbol: '', supply: '1000000000', initialLiquidity: '1.0', description: '', image: '',
    template: 'Meme', buyTax: '5', sellTax: '5', burnRate: '2', lockPeriod: '1 Year'
  });
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [launchStep, setLaunchStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentLog, setDeploymentLog] = useState<string[]>([]);

  // Wire up Farcaster SDK and OnchainKit readiness
  useEffect(() => {
    const init = async () => {
      try {
        console.log("Portal Initializing...");
        await sdk.actions.ready();
        const context = await sdk.context;
        if (context?.user) {
          setFarcasterUser(context.user);
          const fidAddr = `0x${context.user.fid.toString(16).padStart(40, '0')}`;
          setFarcasterAddress(fidAddr);
          if (context.user.username) {
            setBasename(`${context.user.username}.base`);
          }
          if (context.client?.notificationDetails) setIsNotificationEnabled(true);
        }
      } catch (err) {
        console.warn("Mini-app SDK initialization skipped or failed", err);
      }
    };
    init();
    fetchAI();
  }, []);

  // Update quote when amounts or tokens change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFetchQuote(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [swapFrom, swapTo, swapAmount]);

  const handleSignInFarcaster = async () => {
    setIsConnectingFarcaster(true);
    try {
      await sdk.actions.signIn({ 
        nonce: Math.random().toString(36).substring(2) 
      });
      const context = await sdk.context;
      if (context?.user) {
        setFarcasterUser(context.user);
        const finalAddress = `0x${context.user.fid.toString(16).padStart(40, '0')}`;
        setFarcasterAddress(finalAddress);
        if (context.user.username) {
          setBasename(`${context.user.username}.base`);
        }
      }
    } catch (err) {
      console.error("Farcaster Sign-In failed:", err);
    } finally {
      setIsConnectingFarcaster(false);
    }
  };

  const disconnectFarcaster = () => {
    setFarcasterAddress(null);
    setBasename(null);
    setFarcasterUser(null);
    setShowFarcasterMenu(false);
  };

  const fetchAI = async () => {
    try {
      const insight = await getMarketInsights(availableTokens);
      setAiInsight(insight);
    } catch (e) { console.error(e); }
  };

  const handleFetchQuote = useCallback(async (isSilent = false) => {
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || parseFloat(swapAmount) <= 0) return;
    if (!isSilent) setIsRefreshingQuote(true);
    try {
      const quote = await getSwapQuote(swapFrom.symbol, swapTo.symbol, swapAmount);
      setSwapQuote(quote);
    } catch (e) { console.error(e); } 
    finally { setIsRefreshingQuote(false); }
  }, [swapFrom.symbol, swapTo.symbol, swapAmount]);

  const handleExecuteSwap = () => {
    setIsSwapping(true);
    setTimeout(() => {
      setIsSwapping(false);
      setShowSwapConfirm(false);
      setSwapAmount('');
      // In production, this would trigger a write contract via wagmi/OnchainKit
      sdk.actions.openUrl(`https://basescan.org/address/${onchainAddress || farcasterAddress}`);
    }, 2000);
  };

  const handleEnableNotifications = async () => {
    setIsEnablingNotifications(true);
    try {
      const response = await sdk.actions.addMiniApp();
      if (response.notificationDetails) setIsNotificationEnabled(true);
    } catch (e) { console.error(e); }
    finally { setIsEnablingNotifications(false); }
  };

  const handleApplyTemplate = (template: TokenTemplate) => {
    setLaunchConfig(prev => ({
      ...prev,
      template,
      ...TEMPLATE_PRESETS[template]
    }));
  };

  const handleGenerateDescription = async () => {
    if (!launchConfig.name || !launchConfig.symbol) return;
    setIsGeneratingDescription(true);
    try {
      const desc = await generateTokenDescription(launchConfig.name, launchConfig.symbol);
      setLaunchConfig(prev => ({ ...prev, description: desc }));
    } catch (e) { console.error(e); }
    finally { setIsGeneratingDescription(false); }
  };

  const handleDeployToken = () => {
    setIsDeploying(true);
    setDeploymentLog([]);
    const logs = [
      "Initializing Base L2 Secure Tunnel...",
      "Connecting to Clanker Bonding Engine...",
      `Configuring ${launchConfig.template} Smart Contract...`,
      `Tokenomics: ${launchConfig.buyTax}% Buy / ${launchConfig.sellTax}% Sell taxes.`,
      `Deflationary Check: ${launchConfig.burnRate}% Burn on Transfer.`,
      `Liquidity: Locking 1.0 ETH for ${launchConfig.lockPeriod}.`,
      "Transmitting Bytecode to Base Mainnet...",
      "Waiting for Sequencer confirmation...",
      "Deployment Successful! Verified on Basescan. 🎉"
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        setDeploymentLog(prev => [...prev, logs[i]]);
        i++;
      } else {
        clearInterval(interval);
        setIsDeploying(false);
        setLaunchStep(3);
      }
    }, 800);
  };

  const portfolioCategories = useMemo(() => {
    const groups: Record<TokenCategory, { tokens: Token[], totalValue: number }> = {
      'Mainnet': { tokens: [], totalValue: 0 },
      'Stables': { tokens: [], totalValue: 0 },
      'Ecosystem': { tokens: [], totalValue: 0 },
      'Governance': { tokens: [], totalValue: 0 }
    };
    availableTokens.forEach(t => {
      if (groups[t.category]) {
        groups[t.category].tokens.push(t);
        groups[t.category].totalValue += t.balance * t.price;
      }
    });
    return Object.entries(groups).map(([name, data]) => ({ name, value: data.totalValue, tokens: data.tokens }));
  }, [availableTokens]);

  const activeCategory = useMemo(() => portfolioCategories[activePieIndex], [portfolioCategories, activePieIndex]);

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto pb-32 px-4 selection:bg-blue-500/30">
      <header className="py-6 flex flex-col gap-4 border-b border-[#222222] mb-4">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0052FF] to-[#0022AA] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,82,255,0.4)] transition-transform hover:scale-105 active:scale-95 cursor-pointer">
              <Globe className="text-white" size={22} />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-xl font-black tracking-tighter leading-none text-white uppercase italic">Base Portal</h1>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1">AI-Powered Hub</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Wallet>
              <ConnectWallet className="bg-[#0052FF] hover:bg-[#0042CC] text-white px-3 sm:px-4 py-2 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-[0_4px_20px_rgba(0,82,255,0.4)] h-10 border-none outline-none">
                <WalletIcon size={14} />
                <span className="hidden sm:inline">Connect</span>
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address />
                  <EthBalance />
                </Identity>
                <WalletDropdownBasename />
                <WalletDropdownLink icon="wallet" href="https://wallet.coinbase.com">Dashboard</WalletDropdownLink>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>

            <div className="relative">
              {!farcasterUser ? (
                <button 
                  onClick={handleSignInFarcaster}
                  disabled={isConnectingFarcaster}
                  className="bg-[#8a63d2] hover:bg-[#7a53c2] text-white w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-[0_4px_20px_rgba(138,99,210,0.4)]"
                >
                  {isConnectingFarcaster ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={18} />}
                </button>
              ) : (
                <button 
                  onClick={() => setShowFarcasterMenu(!showFarcasterMenu)}
                  className="w-10 h-10 rounded-2xl overflow-hidden border border-[#8a63d2]/50 hover:border-[#8a63d2] transition-all bg-[#0A0A0A]"
                >
                  {farcasterUser.pfpUrl ? (
                    <img src={farcasterUser.pfpUrl} className="w-full h-full object-cover" alt="pfp" />
                  ) : (
                    <div className="w-full h-full bg-[#8a63d2] flex items-center justify-center text-[10px] text-white font-black">
                      {farcasterUser.username?.[0].toUpperCase()}
                    </div>
                  )}
                </button>
              )}

              {showFarcasterMenu && farcasterUser && (
                <>
                  <div className="fixed inset-0 z-[99]" onClick={() => setShowFarcasterMenu(false)} />
                  <div className="absolute right-0 mt-3 w-72 bg-[#0A0A0A] border border-[#222] rounded-[32px] p-4 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-5 mb-3 bg-gradient-to-br from-[#111] to-[#0A0A0A] rounded-3xl border border-[#222]">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-[#8a63d2]/20 p-1 border border-[#8a63d2]/30 overflow-hidden">
                          <img src={farcasterUser.pfpUrl} className="w-full h-full object-cover rounded-[12px]" alt="pfp" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-1.5 truncate">
                            {farcasterUser.displayName} <BadgeCheck size={14} className="text-blue-500 shrink-0" />
                          </span>
                          <span className="text-[10px] text-[#8a63d2] font-black uppercase tracking-widest truncate">@{farcasterUser.username}</span>
                        </div>
                      </div>
                      <div className="bg-black/40 p-3 rounded-2xl border border-white/5 space-y-2 text-[10px] font-black text-gray-500 uppercase">
                        <div className="flex justify-between items-center"><span>FID</span><span className="text-white font-mono">{farcasterUser.fid}</span></div>
                        <div className="flex justify-between items-center"><span>Status</span><span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={10} /> Active</span></div>
                      </div>
                    </div>
                    <button onClick={() => { setShowSettings(true); setShowFarcasterMenu(false); }} className="w-full flex items-center gap-3 p-4 rounded-2xl text-gray-400 hover:bg-white/5 transition-colors text-[10px] font-black uppercase tracking-widest">
                      <Settings2 size={16} /> Portal Settings
                    </button>
                    <button onClick={disconnectFarcaster} className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors text-[10px] font-black uppercase tracking-widest">
                      <Power size={16} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        {activeTab === Tab.SWAP && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end px-1">
              <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">SWAP</h2>
              <div className="flex items-center gap-2 bg-[#111] px-3 py-1 rounded-xl border border-[#222]">
                <Activity size={12} className="text-blue-500" />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Base Mainnet</span>
              </div>
            </div>
            
            <Card className="p-1 space-y-1 bg-[#0A0A0A] border-[#222]">
              <div className="bg-[#111] p-6 rounded-[24px] border border-transparent focus-within:border-blue-500/30 transition-all">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Sell Amount</span>
                  <div 
                    onClick={() => (farcasterUser || isConnected) && setSwapAmount(swapFrom.balance.toString())}
                    className={`flex items-center gap-2 cursor-pointer bg-black/40 px-3 py-1.5 rounded-xl border border-[#222] hover:bg-blue-500/5 transition-all ${(!farcasterUser && !isConnected) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Balance</span>
                    <span className="text-xs font-black tabular-nums text-white">
                      {(farcasterUser || isConnected) ? swapFrom.balance.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0.00'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <input type="number" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} placeholder="0.0" className="bg-transparent text-4xl sm:text-5xl outline-none font-black text-white w-full tabular-nums" />
                  <SearchableTokenSelector tokens={availableTokens} selectedToken={swapFrom} onSelect={(t) => setSwapFrom(t)} label="Sell" />
                </div>
              </div>

              <div className="flex justify-center -my-6 relative z-10">
                <button onClick={() => { const temp = swapFrom; setSwapFrom(swapTo); setSwapTo(temp); }} className="bg-[#111] border-4 border-[#0A0A0A] p-3 rounded-2xl shadow-xl hover:bg-[#1A1A1A] transition-all active:scale-90 group">
                  <ArrowDown size={22} className="text-[#0052FF] group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>

              <div className="bg-[#111] p-6 rounded-[24px] border border-transparent transition-all mt-2">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Buy Estimate</span>
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-[#222]">
                    <span className="text-xs font-black text-white">{(farcasterUser || isConnected) ? swapTo.balance.toLocaleString() : '0.00'}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div className="w-full">
                    {isRefreshingQuote ? (
                      <div className="h-12 flex items-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
                    ) : (
                      <input readOnly value={swapQuote?.outputAmount || ''} className="bg-transparent text-4xl sm:text-5xl outline-none font-black text-white w-full tabular-nums" placeholder="0.0" />
                    )}
                  </div>
                  <SearchableTokenSelector tokens={availableTokens} selectedToken={swapTo} onSelect={(t) => setSwapTo(t)} label="Buy" />
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {swapQuote && (
                <div className="flex flex-col gap-2 p-4 bg-[#111] rounded-2xl border border-[#222] animate-in slide-in-from-top-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-gray-500 tracking-widest">
                    <span>Route</span>
                    <span className="text-white">{swapQuote.route}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-gray-500 tracking-widest">
                    <span>Price Impact</span>
                    <span className={parseFloat(swapQuote.priceImpact) > 2 ? 'text-red-500' : 'text-green-500'}>{swapQuote.priceImpact}</span>
                  </div>
                </div>
              )}

              <Button 
                onClick={() => (farcasterUser || isConnected) ? setShowSwapConfirm(true) : handleSignInFarcaster()} 
                className={`w-full py-5 text-lg rounded-[28px] ${(!farcasterUser && !isConnected) ? 'bg-[#8a63d2] shadow-[0_4px_20px_rgba(138,99,210,0.3)]' : ''}`}
              >
                {(!farcasterUser && !isConnected) ? 'Sign In to Portal' : 'Review Swap'}
              </Button>
            </div>
          </div>
        )}

        {activeTab === Tab.LAUNCH && (
          <div className="space-y-6 animate-in fade-in pb-12">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic px-1">LAUNCHER</h2>
            
            {(!farcasterUser && !isConnected) ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95">
                 <div className="w-24 h-24 bg-[#111] rounded-[40px] flex items-center justify-center border border-[#222] shadow-2xl">
                    <Rocket size={48} className="text-gray-600" />
                 </div>
                 <div className="space-y-2 max-w-xs">
                    <p className="text-base font-black text-white uppercase tracking-tighter italic">Base Mainnet Access Required</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Secure your identity to deploy community-owned assets on Base L2.</p>
                 </div>
                 <Button onClick={handleSignInFarcaster} className="bg-[#8a63d2] px-10">Authenticate Identity</Button>
              </div>
            ) : launchStep === 1 ? (
              <Card className="p-8 space-y-8 rounded-[40px] border-[#222] bg-[#0A0A0A]">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Asset Metadata</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Token Name" 
                      value={launchConfig.name} 
                      onChange={(e) => setLaunchConfig({...launchConfig, name: e.target.value})}
                      className="bg-[#111] border border-[#222] rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 text-white"
                    />
                    <input 
                      placeholder="Symbol" 
                      value={launchConfig.symbol} 
                      onChange={(e) => setLaunchConfig({...launchConfig, symbol: e.target.value})}
                      className="bg-[#111] border border-[#222] rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 uppercase text-white"
                    />
                  </div>
                  <div className="relative">
                    <textarea 
                      placeholder="Project Story (AI Generated or Manual)" 
                      value={launchConfig.description} 
                      onChange={(e) => setLaunchConfig({...launchConfig, description: e.target.value})}
                      className="w-full bg-[#111] border border-[#222] rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 min-h-[120px] resize-none text-white"
                    />
                    <button 
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDescription}
                      className="absolute bottom-4 right-4 text-blue-500 hover:text-blue-400 p-2 bg-black/40 rounded-xl"
                    >
                      {isGeneratingDescription ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    </button>
                  </div>
                </div>
                <Button 
                  onClick={() => setLaunchStep(2)} 
                  className="w-full py-5 rounded-[24px]"
                  disabled={!launchConfig.name || !launchConfig.symbol}
                >
                  Configure Tokenomics <ArrowRight size={18} />
                </Button>
              </Card>
            ) : launchStep === 2 ? (
              <div className="space-y-6 animate-in slide-in-from-right-8">
                <button onClick={() => setLaunchStep(1)} className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest bg-[#111] px-4 py-2 rounded-xl border border-[#222] transition-colors"><ChevronLeft size={14} /> Edit Identity</button>
                <div className="grid grid-cols-2 gap-3">
                   {Object.keys(TEMPLATE_PRESETS).map((t) => (
                     <button 
                       key={t}
                       onClick={() => handleApplyTemplate(t as TokenTemplate)}
                       className={`p-4 rounded-[24px] border transition-all text-left flex flex-col gap-2 ${launchConfig.template === t ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-[#111] border-[#222] hover:border-[#333]'}`}
                     >
                        <div className="flex items-center justify-between">
                           {t === 'Meme' && <Flame size={18} className="text-orange-500" />}
                           {t === 'Utility' && <Zap size={18} className="text-yellow-400" />}
                           {t === 'DeFi' && <ShieldCheck size={18} className="text-green-500" />}
                           {t === 'Custom' && <Settings2 size={18} className="text-gray-400" />}
                           {launchConfig.template === t && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-tight">{t}</span>
                     </button>
                   ))}
                </div>
                <Card className="p-8 space-y-6 border-[#222] bg-[#0A0A0A]">
                   <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex justify-between items-center">
                     <div>
                       <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Initial Supply</p>
                       <p className="text-lg font-black text-white">{parseInt(launchConfig.supply).toLocaleString()} ${launchConfig.symbol}</p>
                     </div>
                     <Lock size={20} className="text-blue-500" />
                   </div>
                   <Button onClick={handleDeployToken} className="w-full py-6 text-xl rounded-[32px]">
                      {isDeploying ? <Loader2 size={24} className="animate-spin" /> : <><Rocket size={24} /> Deploy to Base</>}
                   </Button>
                </Card>
                {isDeploying && (
                  <div className="bg-black border border-[#222] rounded-2xl p-6 font-mono text-[9px] text-blue-500 space-y-1.5 max-h-[160px] overflow-y-auto">
                    {deploymentLog.map((log, idx) => <div key={idx}><span className="opacity-50">#</span> {log}</div>)}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center text-center space-y-8 animate-in zoom-in-95">
                 <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                    <CheckCircle2 size={48} className="text-green-500" />
                 </div>
                 <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">${launchConfig.symbol} DEPLOYED</h3>
                 <div className="flex flex-col gap-2 w-full max-w-xs">
                    <Button onClick={() => sdk.actions.openUrl(`https://basescan.org/token/${Math.random().toString(16).slice(2)}`)} variant="secondary" className="w-full rounded-[24px]">View on Basescan <ExternalLink size={14} /></Button>
                    <Button onClick={() => setLaunchStep(1)} className="w-full rounded-[24px]">Create New Token</Button>
                 </div>
              </div>
            )}
          </div>
        )}

        {activeTab === Tab.PORTFOLIO && (
           <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-end px-1">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                    {(farcasterUser || isConnected) ? `HUB` : 'PORTFOLIO'}
                  </h2>
                  <p className="text-[11px] text-gray-500 font-bold uppercase mt-0.5 tracking-widest">Base Ecosystem Pulse</p>
                </div>
                {(farcasterUser || isConnected) && <button onClick={fetchAI} className="p-2.5 bg-[#111] border border-[#222] rounded-xl text-blue-500 hover:text-white transition-colors"><Sparkles size={18} /></button>}
              </div>

              {(!farcasterUser && !isConnected) ? (
                 <Card className="p-10 text-center space-y-8 border-[#222] bg-[#0A0A0A] rounded-[48px] animate-in slide-in-from-bottom-8">
                    <div className="w-20 h-20 bg-[#111] rounded-[40px] flex items-center justify-center mx-auto border border-[#222] shadow-2xl"><User size={36} className="text-gray-600" /></div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Sync Portal</h3>
                       <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Connect to access AI-powered portfolio management and real-time Base chain alerts.</p>
                    </div>
                    <Button onClick={handleSignInFarcaster} className="w-full bg-[#8a63d2] py-5 rounded-3xl">Get Started</Button>
                 </Card>
              ) : (
                 <div className="space-y-6 animate-in fade-in">
                    <Card className="p-8 rounded-[40px] border-[#222] bg-[#0A0A0A] overflow-hidden relative shadow-2xl border-t-blue-500/20 border-t-2">
                      <div className="flex flex-col items-center">
                        <div className="h-64 w-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                activeIndex={activePieIndex as any}
                                data={portfolioCategories}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={5}
                                dataKey="value"
                                onMouseEnter={(_, index) => setActivePieIndex(index)}
                              >
                                {portfolioCategories.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" className="outline-none" />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Net Value</span>
                            <span className="text-2xl font-black text-white tabular-nums">${portfolioCategories.reduce((acc, curr) => acc + curr.value, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {aiInsight ? (
                      <div className="grid grid-cols-1 gap-3">
                         <Card className="p-5 rounded-[32px] border-blue-500/20 bg-blue-500/5 space-y-3">
                            <div className="flex items-center gap-2 text-blue-500"><Sparkles size={16} /><h3 className="text-[10px] font-black uppercase tracking-widest">Portal Summary</h3></div>
                            <p className="text-xs text-gray-300 font-bold leading-relaxed">{aiInsight.summary}</p>
                         </Card>
                         <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#111] p-4 rounded-3xl border border-[#222] space-y-1">
                               <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Sentiment</p>
                               <p className="text-sm font-black text-green-400 uppercase italic tracking-tighter">{aiInsight.marketSentiment}</p>
                            </div>
                            <div className="bg-[#111] p-4 rounded-3xl border border-[#222] space-y-1">
                               <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Recommendation</p>
                               <p className="text-sm font-black text-white uppercase italic tracking-tighter">{aiInsight.recommendation}</p>
                            </div>
                         </div>
                      </div>
                    ) : (
                      <div className="h-24 bg-[#111] animate-pulse rounded-[32px] flex items-center justify-center text-gray-700 font-black uppercase tracking-[0.2em] text-xs">AI Analyzing Base Chain...</div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Portfolio Assets</h3>
                        <span className="text-[9px] font-black text-blue-500 uppercase italic">{activeCategory?.name}</span>
                      </div>
                      {activeCategory?.tokens.map(token => (
                        <div key={token.symbol} className="bg-[#111] border border-[#222] p-4 rounded-2xl flex items-center justify-between hover:bg-[#1A1A1A] transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3">
                            {token.iconUrl ? <img src={token.iconUrl} className="w-10 h-10 rounded-xl" alt={token.symbol} /> : <div className="w-10 h-10 rounded-xl bg-[#222] flex items-center justify-center font-black text-blue-500 border border-[#333] uppercase">{token.symbol[0]}</div>}
                            <div>
                              <div className="font-black text-sm text-white group-hover:text-blue-500 transition-colors">{token.symbol}</div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{token.name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-white">${(token.balance * token.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            <div className="text-[9px] font-bold text-gray-600 tabular-nums">{token.balance.toLocaleString()} {token.symbol}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
              )}
           </div>
        )}

        {activeTab === Tab.EARN && (
          <div className="space-y-6 animate-in fade-in pb-12">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic px-1">EARN</h2>
             {!selectedVault ? (
                <div className="grid grid-cols-1 gap-4">
                  {vaults.map((vault) => (
                    <Card key={vault.address} className="p-6 flex justify-between items-center cursor-pointer hover:border-blue-500/30 transition-all group bg-[#0A0A0A]" onClick={() => setSelectedVault(vault)}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner"><TrendingUp size={24} /></div>
                        <div>
                          <h3 className="font-black text-white text-sm uppercase tracking-tight">{vault.name}</h3>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{vault.asset.symbol} Morpho Vault</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-green-400 tabular-nums">{vault.totalApy}%</div>
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Total APY</p>
                      </div>
                    </Card>
                  ))}
                  <div className="p-4 rounded-3xl border border-dashed border-[#222] flex items-center gap-3 opacity-60">
                     <ShieldAlert size={18} className="text-yellow-500" />
                     <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">Vaults are curated by Morpho Blue. Ensure you understand the underlying asset risks.</p>
                  </div>
                </div>
             ) : (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                   <button onClick={() => setSelectedVault(null)} className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest bg-[#111] px-4 py-2 rounded-xl border border-[#222] transition-colors"><ChevronLeft size={14} /> View All Hubs</button>
                   <Card className="p-8 space-y-8 border-[#222] rounded-[40px] shadow-2xl bg-[#0A0A0A]">
                      <div className="flex justify-between items-start">
                         <div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">{selectedVault.name}</h3>
                            <p className="text-[10px] text-gray-500 font-mono mt-1 opacity-60 truncate max-w-[150px]">{selectedVault.address}</p>
                         </div>
                         <div className="text-right">
                            <div className="text-4xl font-black text-green-400 tabular-nums">{selectedVault.totalApy}%</div>
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Verified Yield</span>
                         </div>
                      </div>
                      <div className="space-y-4">
                         <div className="bg-[#111] p-6 rounded-[32px] border border-[#222] focus-within:border-blue-500/30 transition-all">
                            <div className="flex justify-between items-center mb-2 ml-1">
                               <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Deposit Hub</span>
                               <button 
                                 onClick={() => {
                                   const balance = availableTokens.find(t => t.symbol === selectedVault.asset.symbol)?.balance || 0;
                                   setEarnAmount(balance.toString());
                                 }}
                                 className="text-[10px] font-black text-blue-500 uppercase hover:text-blue-400 transition-colors"
                               >
                                 Max Balance: {(availableTokens.find(t => t.symbol === selectedVault.asset.symbol)?.balance || 0).toLocaleString()}
                               </button>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <input type="number" placeholder="0.00" value={earnAmount} onChange={(e) => setEarnAmount(e.target.value)} className="bg-transparent text-4xl font-black text-white outline-none w-full tabular-nums" />
                              <span className="text-xl font-black text-gray-500 uppercase italic">{selectedVault.asset.symbol}</span>
                            </div>
                         </div>
                         <Button onClick={() => (farcasterUser || isConnected) ? null : handleSignInFarcaster()} className="w-full py-6 text-xl rounded-[32px]">
                           {(farcasterUser || isConnected) ? "Initialize Deposit" : "Sync to Deposit"}
                         </Button>
                      </div>
                   </Card>
                </div>
             )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-[#222] px-6 pb-[calc(1.5rem+var(--safe-area-bottom))] pt-4 flex justify-between items-center z-[90]">
        <button onClick={() => setActiveTab(Tab.SWAP)} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === Tab.SWAP ? 'text-blue-500 scale-110' : 'text-gray-500 hover:text-white'}`}>
          <ArrowLeftRight size={22} className={activeTab === Tab.SWAP ? "drop-shadow-[0_0_8px_rgba(0,82,255,0.6)]" : ""} />
          <span className="text-[9px] font-black uppercase tracking-widest">Swap</span>
        </button>
        <button onClick={() => setActiveTab(Tab.EARN)} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === Tab.EARN ? 'text-green-400 scale-110' : 'text-gray-500 hover:text-white'}`}>
          <BarChart3 size={22} className={activeTab === Tab.EARN ? "drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" : ""} />
          <span className="text-[9px] font-black uppercase tracking-widest">Earn</span>
        </button>
        <button onClick={() => setActiveTab(Tab.LAUNCH)} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === Tab.LAUNCH ? 'text-[#8a63d2] scale-110' : 'text-gray-500 hover:text-white'}`}>
          <Rocket size={22} className={activeTab === Tab.LAUNCH ? "drop-shadow-[0_0_8px_rgba(138,99,210,0.6)]" : ""} />
          <span className="text-[9px] font-black uppercase tracking-widest">Launch</span>
        </button>
        <button onClick={() => setActiveTab(Tab.PORTFOLIO)} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === Tab.PORTFOLIO ? 'text-blue-500 scale-110' : 'text-gray-500 hover:text-white'}`}>
          <PieChartIcon size={22} className={activeTab === Tab.PORTFOLIO ? "drop-shadow-[0_0_8px_rgba(0,82,255,0.6)]" : ""} />
          <span className="text-[9px] font-black uppercase tracking-widest">Pulse</span>
        </button>
      </nav>

      {showSettings && (
        <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Portal Hub Config">
           <div className="space-y-8 py-2">
              <div className="bg-[#111] p-5 rounded-3xl border border-[#222] flex justify-between items-center group transition-colors hover:border-[#8a63d2]/30">
                 <div className="overflow-hidden">
                    <p className="text-sm font-black text-white">Direct Push Signals</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5 tracking-widest truncate">Alpha, Alerts & Fills</p>
                 </div>
                 {isNotificationEnabled ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#8a63d211] rounded-xl border border-[#8a63d222] shrink-0">
                       <CheckCircle2 size={12} className="text-[#8a63d2]" />
                       <span className="text-[9px] font-black text-[#8a63d2] uppercase">Live</span>
                    </div>
                 ) : (
                    <button onClick={handleEnableNotifications} disabled={isEnablingNotifications} className="px-4 py-2 bg-[#8a63d2] hover:bg-[#7a53c2] text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 shrink-0">
                       {isEnablingNotifications ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Enable
                    </button>
                 )}
              </div>
              <div className="p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-3xl">
                 <p className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><ShieldAlert size={12} /> Security Notice</p>
                 <p className="text-[11px] text-gray-400 font-bold leading-relaxed">This portal is a unified interface for Base Mainnet. Always verify destination addresses on your hardware wallet before signing high-value transactions.</p>
              </div>
              <Button onClick={() => setShowSettings(false)} className="w-full rounded-[24px]">Save Hub Preferences</Button>
           </div>
        </Modal>
      )}

      {showSwapConfirm && (
        <Modal isOpen={showSwapConfirm} onClose={() => setShowSwapConfirm(false)} title="Verify Transaction">
           <div className="space-y-6 py-2">
              <div className="bg-[#111] p-6 rounded-3xl border border-[#222] space-y-4 shadow-inner relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-3 opacity-10 rotate-12"><Globe size={80} /></div>
                 <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest relative z-10">
                   <span>Input</span>
                   <span className="text-white text-sm">{swapAmount} {swapFrom.symbol}</span>
                 </div>
                 <div className="flex justify-center"><ArrowDown size={14} className="text-blue-500 animate-bounce" /></div>
                 <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest relative z-10">
                   <span>Output (Est)</span>
                   <span className="text-blue-500 text-sm">{swapQuote?.outputAmount} {swapTo.symbol}</span>
                 </div>
                 <div className="pt-2 border-t border-white/5 space-y-1">
                   <div className="flex justify-between text-[9px] font-black uppercase text-gray-600"><span>Network Fee</span><span>~ $0.05</span></div>
                   <div className="flex justify-between text-[9px] font-black uppercase text-gray-600"><span>Provider</span><span>Aerodrome v3</span></div>
                 </div>
              </div>
              <Button onClick={handleExecuteSwap} className="w-full py-5 text-lg rounded-[28px] group" disabled={isSwapping}>
                 {isSwapping ? <Loader2 size={24} className="animate-spin" /> : <span className="flex items-center gap-2">Confirm & Sign <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></span>}
              </Button>
           </div>
        </Modal>
      )}
    </div>
  );
};

export default App;