import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  ArrowUp,
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
  Activity,
  RefreshCw,
  Info,
  Clock,
  Target,
  XCircle,
  TrendingDown,
  Percent,
  Coins,
  History,
  Upload,
  Image as ImageIcon,
  Bell,
  BellOff,
  ToggleLeft,
  ToggleRight
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
import { useAccount, useBalance, useReadContracts, useWalletClient, useWriteContract, useConnect } from 'wagmi';
import { base } from 'viem/chains';
import { erc20Abi, formatUnits, parseUnits, maxUint256 } from 'viem';

import { Tab, Token, MorphoVault, TokenCategory, TokenTemplate, AIInsight, TokenLaunchConfig, OrderType, LimitOrder, OrderExpiry } from './types';
import { Card, Button, Modal, SearchableTokenSelector } from './components/UI';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getMarketInsights, generateTokenDescription } from './services/geminiService';
import { getSwapQuote } from './services/swapService';

const COLORS = ['#0052FF', '#00C49F', '#FFBB28', '#FF8042', '#8A2BE2'];
const PieAny = Pie as unknown as React.ComponentType<any>;

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
    price: 0, 
    change24h: 0, 
    balance: 0, 
    icon: 'E',
    category: 'Mainnet',
    iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    isNative: true,
    decimals: 18,
  },
  { 
    symbol: 'cbBTC', 
    name: 'Coinbase Wrapped BTC', 
    price: 0, 
    change24h: 0, 
    balance: 0, 
    icon: 'B',
    category: 'Mainnet',
    iconUrl: 'https://assets.coingecko.com/coins/images/39535/small/cbbtc.png',
    address: '0xcbB7C00002968E65348665a53B821F644A81717c',
    decimals: 8,
  },
  { 
    symbol: 'USDC', 
    name: 'USDC', 
    price: 0, 
    change24h: 0, 
    balance: 0, 
    icon: 'U',
    category: 'Stables',
    iconUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
  },
  { 
    symbol: 'DEGEN', 
    name: 'Degen Token', 
    price: 0, 
    change24h: 0, 
    balance: 0, 
    icon: 'D',
    category: 'Ecosystem',
    iconUrl: 'https://assets.coingecko.com/coins/images/34515/small/degen.png',
    address: '0x4ed4E8615216599b5966f03441F2282aE651ed9d',
    decimals: 18,
  }
];

const PortalLogo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="12" fill="url(#logo_gradient)"/>
    <path d="M20 10C14.4772 10 10 14.4772 10 20C10 25.5228 14.4772 30 20 30C25.5228 30 30 25.5228 30 20C30 14.4772 25.5228 10 20 10ZM20 27C16.134 27 13 23.866 13 20C13 16.134 16.134 13 20 13C23.866 13 27 16.134 27 20C27 23.866 23.866 27 20 27Z" fill="white"/>
    <path d="M20 16C17.7909 16 16 17.7909 16 20C16 22.2091 17.7909 24 20 24C22.2091 24 24 22.2091 24 20C24 17.7909 22.2091 16 20 16Z" fill="white" fillOpacity="0.4">
      <animate attributeName="fill-opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
    </path>
    <defs>
      <linearGradient id="logo_gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0052FF"/>
        <stop offset="1" stopColor="#0022AA"/>
      </linearGradient>
    </defs>
  </svg>
);
// Helper to detect if running inside Farcaster Mini App iframe
const isMiniApp = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.parent !== window;
  } catch {
    return false;
  }
};


const App: React.FC = () => {
  const { address: onchainAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SWAP);
  const [farcasterUser, setFarcasterUser] = useState<any>(null);
  const [basename, setBasename] = useState<string | null>(null);
  const [isConnectingFarcaster, setIsConnectingFarcaster] = useState(false);
  const [showFarcasterMenu, setShowFarcasterMenu] = useState(false);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const [apiKeys, setApiKeys] = useState({ infuraId: '', zeroXKey: '', geminiKey: '', ankrKey: '' });
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  
  const [localNotificationsActive, setLocalNotificationsActive] = useState(() => {
    const saved = localStorage.getItem('portal_notifications_active');
    return saved === null ? true : saved === 'true';
  });

  const { data: nativeBalance, isLoading: isLoadingBalance, error: balanceError } = useBalance({
    address: onchainAddress,
    chainId: base.id,
    query: {
      enabled: Boolean(onchainAddress),
      refetchInterval: 10000,
    },
  });

  // Debug balance fetching
  useEffect(() => {
    if (onchainAddress) {
      console.log('[Balance] Address:', onchainAddress);
      console.log('[Balance] Loading:', isLoadingBalance);
      console.log('[Balance] Data:', nativeBalance);
      console.log('[Balance] Error:', balanceError);
    }
  }, [onchainAddress, isLoadingBalance, nativeBalance, balanceError]);

  const erc20Tokens = useMemo(
    () => INITIAL_TOKENS.filter(token => !token.isNative && token.address),
    []
  );

  const { data: erc20Balances, isLoading: isLoadingERC20, error: erc20Error } = useReadContracts({
    allowFailure: true,
    contracts: erc20Tokens.map(token => ({
      address: token.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [onchainAddress as `0x${string}`],
      chainId: base.id,
    })),
    query: {
      enabled: Boolean(onchainAddress) && erc20Tokens.length > 0,
      refetchInterval: 10000,
    },
  });

  // Debug ERC20 balance fetching
  useEffect(() => {
    if (onchainAddress && erc20Tokens.length > 0) {
      console.log('[ERC20] Loading:', isLoadingERC20);
      console.log('[ERC20] Data:', erc20Balances);
      console.log('[ERC20] Error:', erc20Error);
    }
  }, [onchainAddress, isLoadingERC20, erc20Balances, erc20Error, erc20Tokens.length]);

  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const availableTokens = useMemo(() => {
    // Debug wallet connection
    console.log('[Balance] Wallet:', onchainAddress, 'Connected:', isConnected);
    
    return INITIAL_TOKENS.map((token) => {
      if (token.isNative) {
        const balance = parseFloat(nativeBalance?.formatted ?? '0');
        return { ...token, balance };
      }

      // Use address.toLowerCase() match for reliable ERC20 balance lookup
      const idx = erc20Tokens.findIndex(t => t.address?.toLowerCase() === token.address?.toLowerCase());
      const raw = idx >= 0 ? (erc20Balances?.[idx]?.result as bigint | undefined) : undefined;
      const decimals = token.decimals ?? 18;
      const balance = raw ? parseFloat(formatUnits(raw, decimals)) : 0;
      
      return { ...token, balance };
    });
  }, [nativeBalance?.formatted, erc20Balances, erc20Tokens, onchainAddress, isConnected]);
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  
  const [vaults] = useState<MorphoVault[]>([]);
  const [selectedVault, setSelectedVault] = useState<MorphoVault | null>(null);
  const [earnAmount, setEarnAmount] = useState('');

  const [swapFrom, setSwapFrom] = useState(INITIAL_TOKENS[0]);
  const [swapTo, setSwapTo] = useState(INITIAL_TOKENS[2]);
  const [swapAmount, setSwapAmount] = useState('0.001');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [targetPrice, setTargetPrice] = useState('');
  const [orderExpiry, setOrderExpiry] = useState<OrderExpiry>('gtc');
  const [limitOrders, setLimitOrders] = useState<LimitOrder[]>([]);

  useEffect(() => {
    if (availableTokens.length < 2) return;
    
    const nextFrom = availableTokens.find(token => token.symbol === swapFrom.symbol) || availableTokens[0];
    let nextTo = availableTokens.find(token => token.symbol === swapTo.symbol);
    
    if (!nextTo || nextTo.symbol === nextFrom.symbol) {
      nextTo = availableTokens.find(token => token.symbol !== nextFrom.symbol) || availableTokens[1];
    }
    
    if (nextFrom && nextTo && nextFrom.symbol !== nextTo.symbol) {
      setSwapFrom(nextFrom);
      setSwapTo(nextTo);
    }
  }, [availableTokens]);

  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [isSwapping, setIsSwapping] = useState(false);
  const [isRefreshingQuote, setIsRefreshingQuote] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const quoteInFlight = useRef(false);

  const [launchConfig, setLaunchConfig] = useState<TokenLaunchConfig>({
    name: '', symbol: '', supply: '1000000000', initialLiquidity: '1.0', description: '', image: '',
    template: 'Meme', buyTax: '5', sellTax: '5', burnRate: '2', lockPeriod: '1 Year'
  });
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [launchStep, setLaunchStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentLog, setDeploymentLog] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        // Only run Farcaster SDK inside MiniApp
        if (!isMiniApp()) {
          return;
        }
        await sdk.actions.ready();
        const context = await sdk.context;
        if (context?.user) {
          setFarcasterUser(context.user);
          if (context.user.username) setBasename(`${context.user.username}.base`);
          if (context.client?.notificationDetails) setIsNotificationEnabled(true);
          
          // Auto-connect wallet if not already connected
          if (!isConnected && connectors.length > 0) {
            console.log('Farcaster user detected, auto-connecting wallet...');
            try {
              // Try Coinbase Wallet first (smart wallet)
              const coinbaseConnector = connectors.find(c => c.name.toLowerCase().includes('coinbase'));
              if (coinbaseConnector) {
                await connect({ connector: coinbaseConnector });
                console.log('Coinbase Wallet auto-connected successfully');
              } else {
                // Fallback to any available connector
                await connect({ connector: connectors[0] });
                console.log('Wallet auto-connected successfully');
              }
            } catch (connectError) {
              console.warn('Auto-connect failed, user can connect manually:', connectError);
            }
          }
        }
      } catch (err) {
        console.warn("SDK initialization skipped", err);
      }
    };
    init();
    fetchAI();
  }, []);

  useEffect(() => {
    if (!showSettings) return;
    setApiKeys({
      infuraId: localStorage.getItem('VITE_INFURA_ID') || '',
      zeroXKey: localStorage.getItem('VITE_0X_API_KEY') || '',
      geminiKey: localStorage.getItem('GEMINI_API_KEY') || '',
      ankrKey: localStorage.getItem('VITE_ANKR_API_KEY') || '',
    });
    setApiStatus(null);
  }, [showSettings]);

  useEffect(() => {
    localStorage.setItem('portal_notifications_active', localNotificationsActive.toString());
  }, [localNotificationsActive]);

  const fetchAI = async () => {
    try {
      const insight = await getMarketInsights(availableTokens);
      setAiInsight(insight);
    } catch (e) { console.error(e); }
  };

  const handleFetchQuote = useCallback(async (isSilent = false) => {
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || parseFloat(swapAmount) <= 0) return;
    if (quoteInFlight.current) return;
    if (!isSilent) setIsRefreshingQuote(true);
    try {
      quoteInFlight.current = true;
      const quote = await getSwapQuote(swapFrom, swapTo, swapAmount, onchainAddress);
      if (!quote) {
        setSwapQuote(null);
        return;
      }
      setSwapQuote(quote);
      setRefreshCountdown(30);
    } catch (e) { console.error(e); } 
    finally {
      quoteInFlight.current = false;
      setIsRefreshingQuote(false);
    }
  }, [swapFrom, swapTo, swapAmount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFetchQuote(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [swapFrom, swapTo, swapAmount, handleFetchQuote]);

  useEffect(() => {
    if (activeTab !== Tab.SWAP || !swapQuote) return;
    const timer = setInterval(() => {
      setRefreshCountdown(prev => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [swapQuote, activeTab]);

  const handleSignInFarcaster = async () => {
    setIsConnectingFarcaster(true);
    try {
      await sdk.actions.signIn({ nonce: Math.random().toString(36).substring(2) });
      const context = await sdk.context;
      if (context?.user) {
        setFarcasterUser(context.user);
        if (context.user.username) setBasename(`${context.user.username}.base`);
        
        // Auto-connect wallet after sign-in
        if (!isConnected && connectors.length > 0) {
          console.log('User signed in, connecting wallet...');
          try {
            // Try Coinbase Wallet first (smart wallet)
            const coinbaseConnector = connectors.find(c => c.name.toLowerCase().includes('coinbase'));
            if (coinbaseConnector) {
              await connect({ connector: coinbaseConnector });
              console.log('Coinbase Wallet connected successfully');
            } else {
              // Fallback to any available connector
              await connect({ connector: connectors[0] });
              console.log('Wallet connected successfully');
            }
          } catch (connectError) {
            console.warn('Wallet connection failed:', connectError);
          }
        }
      }
    } catch (err) {
      console.error("Sign-In failed:", err);
    } finally {
      setIsConnectingFarcaster(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (orderType === 'limit') {
      return;
    }
    if (!walletClient || !swapQuote) {
      alert('Wallet not connected or quote unavailable');
      return;
    }
    if (!onchainAddress) {
      alert('Wallet address not found');
      return;
    }

    setIsSwapping(true);
    try {
      // For ERC20 tokens, approve the swap router (Uniswap SwapRouter02)
      if (!swapFrom.isNative && swapFrom.address && writeContractAsync) {
        try {
          const sellAmount = parseUnits(swapAmount, swapFrom.decimals ?? 18);
          console.log('Approving SwapRouter:', swapQuote.to, 'for amount:', sellAmount.toString());
          
          await writeContractAsync({
            address: swapFrom.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'approve',
            args: [swapQuote.to as `0x${string}`, maxUint256],
            chainId: base.id,
          });
          console.log('Approval successful');
        } catch (approvalError: any) {
          console.error("Approval failed", approvalError);
          const errorMessage = approvalError?.message || approvalError?.shortMessage || 'Token approval failed';
          alert(`Approval failed: ${errorMessage}`);
          setIsSwapping(false);
          return;
        }
      }

      console.log('Executing swap via Uniswap V3...');
      const hash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: swapQuote.to as `0x${string}`,
        data: swapQuote.data as `0x${string}`,
        value: swapQuote.value ? BigInt(swapQuote.value) : 0n,
        chain: base,
      });
      console.log('Swap successful, tx hash:', hash);
      setShowSwapConfirm(false);
      setSwapAmount('');
      sdk.actions.openUrl(`https://basescan.org/tx/${hash}`);
    } catch (e: any) {
      console.error("Swap failed", e);
      const errorMessage = e?.message || e?.shortMessage || 'Transaction failed';
      alert(`Swap failed: ${errorMessage}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleCancelOrder = (id: string) => {
    setLimitOrders(prev => prev.filter(o => o.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Asset Icon must be JPEG or PNG format.');
      return;
    }

    if (file.size > 1024 * 1024) {
      alert('Icon file size exceeds 1MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLaunchConfig(prev => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleEnableNotifications = async () => {
    setIsEnablingNotifications(true);
    try {
      const response = await sdk.actions.addMiniApp();
      if (response.notificationDetails) {
        setIsNotificationEnabled(true);
        setLocalNotificationsActive(true);
      }
    } catch (e) { console.error(e); }
    finally { setIsEnablingNotifications(false); }
  };

  const toggleLocalNotifications = () => {
    if (!isNotificationEnabled) {
      handleEnableNotifications();
    } else {
      setLocalNotificationsActive(!localNotificationsActive);
    }
  };

  const handleSaveApiKeys = () => {
    localStorage.setItem('VITE_INFURA_ID', apiKeys.infuraId.trim());
    localStorage.setItem('VITE_0X_API_KEY', apiKeys.zeroXKey.trim());
    localStorage.setItem('GEMINI_API_KEY', apiKeys.geminiKey.trim());
    localStorage.setItem('VITE_ANKR_API_KEY', apiKeys.ankrKey.trim());
    setApiStatus('Saved. Reloading to apply network changes...');
    setTimeout(() => window.location.reload(), 500);
  };

  const currentRate = useMemo(() => {
    if (!swapQuote?.outputAmount || !swapAmount || parseFloat(swapAmount) === 0) return null;
    return (parseFloat(swapQuote.outputAmount) / parseFloat(swapAmount)).toFixed(6);
  }, [swapQuote, swapAmount]);

  const priceDistance = useMemo(() => {
    if (!currentRate || !targetPrice || parseFloat(targetPrice) === 0) return null;
    const diff = ((parseFloat(targetPrice) / parseFloat(currentRate)) - 1) * 100;
    return diff.toFixed(2);
  }, [currentRate, targetPrice]);

  const isQuoteAvailable = Boolean(swapQuote);

  const handleApplyTemplate = (template: TokenTemplate) => {
    setLaunchConfig(prev => ({ ...prev, template, ...TEMPLATE_PRESETS[template] }));
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
      "Initializing Base L2 Tunnel...",
      "Connecting to Clanker bonding engine...",
      `Configuring ${launchConfig.template} parameters...`,
      `Verified: ${launchConfig.buyTax}% Buy / ${launchConfig.sellTax}% Sell taxes.`,
      `Burning ${launchConfig.burnRate}% on every transfer.`,
      `Liquidity: Locked for ${launchConfig.lockPeriod}.`,
      "Pushing bytecode to sequencer...",
      "Waiting for block confirmation...",
      "Success! Token deployed and LP initialized. 🎉"
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
    }, 700);
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
        groups[t.category].totalValue += t.balance;
      }
    });
    return Object.entries(groups).map(([name, data]) => ({ name, value: data.totalValue, tokens: data.tokens }));
  }, [availableTokens]);

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto pb-32 px-4 selection:bg-blue-500/30">
      <header className="py-6 flex flex-col gap-4 border-b border-[#222222] mb-4">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab(Tab.PORTFOLIO)}>
            <div className="transition-transform group-hover:scale-105 active:scale-95 duration-300">
              <PortalLogo />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none text-white uppercase italic">BLEND</h1>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1">BLEND</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-2xl border border-[#222] bg-[#111] text-gray-400 hover:text-white hover:border-[#333] transition-all flex items-center justify-center"
              aria-label="Open settings"
            >
              <Settings2 size={18} />
            </button>
            <Wallet>
              <ConnectWallet className="bg-[#0052FF] hover:bg-[#0042CC] text-white px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_4px_20px_rgba(0,82,255,0.4)] h-10 border-none">
                <WalletIcon size={14} /> Connect
              </ConnectWallet>
              <WalletDropdown>
                <ErrorBoundary fallback={
                  <div className="px-4 pt-3 pb-2 text-gray-400 text-sm">
                    <Address />
                  </div>
                }>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar /><Name /><Address /><EthBalance />
                  </Identity>
                </ErrorBoundary>
                <WalletDropdownBasename />
                <WalletDropdownLink icon="wallet" href="https://wallet.coinbase.com">Dashboard</WalletDropdownLink>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>

            {!farcasterUser ? (
              <button 
                onClick={handleSignInFarcaster}
                disabled={isConnectingFarcaster}
                className="bg-[#8a63d2] hover:bg-[#7a53c2] text-white w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(138,99,210,0.4)]"
              >
                {isConnectingFarcaster ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={18} />}
              </button>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setShowFarcasterMenu(!showFarcasterMenu)}
                  className="w-10 h-10 rounded-2xl overflow-hidden border border-[#8a63d2]/50 hover:border-[#8a63d2] transition-all bg-[#0A0A0A] relative group"
                >
                  <img src={farcasterUser.pfpUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="pfp" />
                  {isNotificationEnabled && (
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-black rounded-full ${localNotificationsActive ? 'bg-green-500 animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        {activeTab === Tab.SWAP && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex justify-between items-end px-1">
              <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">SWAP</h2>
              <div className="flex bg-[#111] p-1 rounded-xl border border-[#222]">
                <button 
                  onClick={() => setOrderType('market')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${orderType === 'market' ? 'bg-[#0052FF] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Market
                </button>
                <button 
                  onClick={() => setOrderType('limit')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${orderType === 'limit' ? 'bg-[#0052FF] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Limit
                </button>
              </div>
            </div>
            
            <Card className="p-1 space-y-1 bg-[#0A0A0A] border-[#222]">
              <div className="bg-[#111] p-6 rounded-[24px] border border-transparent focus-within:border-blue-500/30 transition-all">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Sell Amount</span>
                  <div 
                    onClick={() => setSwapAmount(swapFrom.balance.toString())}
                    className="flex items-center gap-2 cursor-pointer bg-black/40 px-3 py-1.5 rounded-xl border border-[#222] hover:bg-blue-500/5 transition-all"
                  >
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Bal:</span>
                    <span className="text-xs font-black tabular-nums text-white">{swapFrom.balance.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      value={swapAmount} 
                      onChange={(e) => setSwapAmount(e.target.value)} 
                      placeholder="0.0"
                      min="0.001"
                      step="0.001"
                      className="bg-transparent text-4xl sm:text-5xl outline-none font-black text-white w-full tabular-nums pr-12" 
                    />
                    <button 
                      onClick={() => setSwapAmount(swapFrom.balance.toString())}
                      className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-500 text-[10px] font-black px-2 py-1 rounded-md transition-all active:scale-95 uppercase tracking-tighter"
                    >
                      Max
                    </button>
                  </div>
                  <SearchableTokenSelector tokens={availableTokens} selectedToken={swapFrom} onSelect={(t) => {
                    if (t.symbol === swapTo.symbol) {
                      setSwapTo(swapFrom);
                    }
                    setSwapFrom(t);
                  }} label="Sell" />
                </div>
                {parseFloat(swapAmount) > 0 && parseFloat(swapAmount) < 0.001 && (
                  <div className="mt-2 text-[10px] font-bold text-yellow-500/80">
                    ⚠️ Minimum: 0.001 {swapFrom.symbol} (~$3) for liquidity
                  </div>
                )}
              </div>

              <div className="flex justify-center -my-6 relative z-10">
                <button onClick={() => { const t = swapFrom; setSwapFrom(swapTo); setSwapTo(t); }} className="bg-[#111] border-4 border-[#0A0A0A] p-3 rounded-2xl shadow-xl hover:bg-[#1A1A1A] transition-all group active:scale-90">
                  <ArrowDown size={22} className="text-[#0052FF] group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>

              <div className="bg-[#111] p-6 rounded-[24px] border border-transparent transition-all mt-2 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{orderType === 'limit' ? 'Current Market' : 'Buy Estimate'}</span>
                    {isRefreshingQuote && <div className="text-[8px] font-black text-blue-500 uppercase animate-pulse">Syncing...</div>}
                  </div>
                  {swapQuote && (
                    <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                      <RefreshCw size={10} className={`text-blue-500/60 ${isRefreshingQuote ? 'animate-spin' : ''}`} />
                      <span className="text-[8px] font-black text-gray-600 uppercase tabular-nums">{refreshCountdown}s</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div className="w-full">
                    {isRefreshingQuote && !swapQuote ? (
                      <div className="h-12 flex items-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
                    ) : (
                      <div className="relative group">
                         <input readOnly value={swapQuote?.outputAmount || ''} className="bg-transparent text-4xl sm:text-5xl outline-none font-black text-white w-full tabular-nums" placeholder="0.0" />
                      </div>
                    )}
                  </div>
                  <SearchableTokenSelector tokens={availableTokens} selectedToken={swapTo} onSelect={(t) => {
                    if (t.symbol === swapFrom.symbol) {
                      setSwapFrom(swapTo);
                    }
                    setSwapTo(t);
                  }} label="Buy" />
                </div>
              </div>
            </Card>

            {orderType === 'limit' && (
              <div className="space-y-4 animate-in slide-in-from-top-4">
                <div className="bg-[#111] p-6 rounded-[24px] border border-blue-500/30">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                      <Target size={14} /> Execution Target
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => currentRate && setTargetPrice((parseFloat(currentRate) * 1.01).toFixed(6))}
                        className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest bg-black/40 px-2 py-1 rounded-lg border border-[#222]"
                      >
                        +1%
                      </button>
                      <button 
                        onClick={() => currentRate && setTargetPrice(currentRate)}
                        className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest bg-black/40 px-2 py-1 rounded-lg border border-[#222]"
                      >
                        Market
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-5 rounded-2xl border border-white/5">
                    <span className="text-sm font-black text-gray-500 uppercase italic">Rate</span>
                    <input 
                      type="number" 
                      value={targetPrice} 
                      onChange={(e) => setTargetPrice(e.target.value)} 
                      placeholder="0.000000" 
                      className="bg-transparent text-2xl font-black text-white outline-none w-full tabular-nums" 
                    />
                    <span className="text-[10px] font-black text-gray-600 uppercase shrink-0">{swapTo.symbol}/{swapFrom.symbol}</span>
                  </div>
                  {priceDistance && (
                    <p className={`text-[9px] font-black uppercase mt-3 ml-1 tracking-widest flex items-center gap-1.5 ${parseFloat(priceDistance) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {parseFloat(priceDistance) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(parseFloat(priceDistance))}% {parseFloat(priceDistance) >= 0 ? 'Above' : 'Below'} Market
                    </p>
                  )}
                </div>

                <div className="bg-[#111] p-4 rounded-2xl border border-[#222] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-500" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Order Expiry</span>
                  </div>
                  <select 
                    value={orderExpiry}
                    onChange={(e) => setOrderExpiry(e.target.value as OrderExpiry)}
                    className="bg-black/40 text-[10px] font-black text-white border border-[#333] rounded-lg px-3 py-1 outline-none appearance-none cursor-pointer"
                  >
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="gtc">Never</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {orderType === 'market' && swapQuote && (
                <div className="flex flex-col gap-2 p-4 bg-[#111] rounded-2xl border border-[#222] animate-in slide-in-from-top-2">
                  {swapQuote.isPriceOnly && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-900/30 rounded-lg border border-yellow-500/30 mb-2">
                      <span className="text-yellow-500 text-[10px] font-semibold">Low liquidity - price estimate only. Try a larger amount (min 0.01 ETH).</span>
                    </div>
                  )}
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
                disabled={!isQuoteAvailable || orderType === 'limit' || swapQuote?.isPriceOnly}
                className={`w-full py-5 text-lg rounded-[28px] ${(!farcasterUser && !isConnected) ? 'bg-[#8a63d2]' : ''}`}
              >
                {orderType === 'limit' ? 'Limit Unavailable' : swapQuote?.isPriceOnly ? 'Price Estimate Only' : !isQuoteAvailable ? 'Quotes Unavailable' : (!farcasterUser && !isConnected) ? 'Sync Identity' : 'Review Swap'}
              </Button>
            </div>

            {limitOrders.length > 0 && (
              <div className="space-y-3 pt-6 border-t border-[#222]">
                <div className="flex items-center justify-between px-1">
                   <div className="flex items-center gap-2">
                      <History size={16} className="text-gray-500" />
                      <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Active Orders</h3>
                   </div>
                   <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">{limitOrders.length}</span>
                </div>
                {limitOrders.map(order => (
                  <div key={order.id} className="bg-[#111] border border-[#222] rounded-[24px] p-5 space-y-4 hover:border-blue-500/20 transition-colors group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-3">
                          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-[11px] font-black border-2 border-[#111] text-white shadow-lg">{order.fromToken[0]}</div>
                          <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-[11px] font-black border-2 border-[#111] text-white shadow-lg">{order.toToken[0]}</div>
                        </div>
                        <div>
                          <p className="text-sm font-black text-white flex items-center gap-1.5">{order.amount} {order.fromToken} <ArrowRight size={12} className="text-gray-600" /> {order.toToken}</p>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.1em] mt-0.5">Target: <span className="text-blue-400">{order.targetPrice}</span> {order.toToken}/{order.fromToken}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCancelOrder(order.id)}
                        className="p-2 text-gray-600 hover:text-red-500 transition-colors bg-black/40 rounded-xl"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                    <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(0,82,255,0.8)]" />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Awaiting execution</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock size={10} />
                          <span className="text-[9px] font-black uppercase">{order.expiry === 'gtc' ? 'Never expires' : `Expires in ${order.expiry}`}</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === Tab.LAUNCH && (
          <div className="space-y-6 animate-in fade-in pb-12">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic px-1">LAUNCHER</h2>
            
            {launchStep === 1 ? (
              <Card className="p-8 space-y-8 rounded-[40px] border-[#222] bg-[#0A0A0A]">
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4 mb-2">
                    <div className="relative group">
                      <div 
                        className="w-24 h-24 rounded-[32px] bg-[#111] border-2 border-dashed border-[#333] flex items-center justify-center overflow-hidden hover:border-blue-500 transition-all cursor-pointer group-active:scale-95 shadow-2xl"
                        onClick={() => document.getElementById('token-icon-input')?.click()}
                      >
                        {launchConfig.image ? (
                          <img src={launchConfig.image} className="w-full h-full object-cover" alt="Token Preview" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-600 group-hover:text-blue-500 transition-colors">
                            <Upload size={24} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Icon</span>
                          </div>
                        )}
                      </div>
                      <input 
                        id="token-icon-input"
                        type="file" 
                        accept="image/jpeg,image/png"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                    <div className="text-center">
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Upload Token Avatar</p>
                       <p className="text-[8px] text-gray-700 font-black uppercase mt-1">PNG/JPG • Max 1MB</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Coins size={14} /> Asset Metadata</label>
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
              <div className="space-y-6 animate-in slide-in-from-right-8 pb-12">
                <button onClick={() => setLaunchStep(1)} className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest bg-[#111] px-4 py-2 rounded-xl border border-[#222] transition-colors"><ChevronLeft size={14} /> Edit Identity</button>
                
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Choose Template</p>
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
                </div>

                <Card className="p-8 space-y-8 border-[#222] bg-[#0A0A0A] rounded-[40px]">
                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Settings2 size={14} /> Customize Parameters</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Buy Tax (%)</label>
                        <div className="relative">
                          <input type="number" value={launchConfig.buyTax} onChange={(e) => setLaunchConfig({...launchConfig, buyTax: e.target.value})} className="w-full bg-[#111] border border-[#222] rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 text-white tabular-nums" />
                          <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Sell Tax (%)</label>
                        <div className="relative">
                          <input type="number" value={launchConfig.sellTax} onChange={(e) => setLaunchConfig({...launchConfig, sellTax: e.target.value})} className="w-full bg-[#111] border border-[#222] rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 text-white tabular-nums" />
                          <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Burn Rate (%)</label>
                        <div className="relative">
                          <input type="number" value={launchConfig.burnRate} onChange={(e) => setLaunchConfig({...launchConfig, burnRate: e.target.value})} className="w-full bg-[#111] border border-[#222] rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 text-white tabular-nums" />
                          <Flame size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Liquidity Lock</label>
                        <select value={launchConfig.lockPeriod} onChange={(e) => setLaunchConfig({...launchConfig, lockPeriod: e.target.value})} className="w-full bg-[#111] border border-[#222] rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 text-white appearance-none">
                          <option value="None">None</option>
                          <option value="1 Month">1 Month</option>
                          <option value="6 Months">6 Months</option>
                          <option value="1 Year">1 Year</option>
                          <option value="Forever">Forever (Burnt LP)</option>
                        </select>
                      </div>
                    </div>
                  </div>
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
                <div><h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">PULSE</h2><p className="text-[11px] text-gray-500 font-bold uppercase mt-0.5 tracking-widest">Base Ecosystem Hub</p></div>
                {(farcasterUser || isConnected) && <button onClick={fetchAI} className="p-2.5 bg-[#111] border border-[#222] rounded-xl text-blue-500 hover:text-white transition-colors"><Sparkles size={18} /></button>}
              </div>

              {(!farcasterUser && !isConnected) ? (
                 <Card className="p-10 text-center space-y-8 border-[#222] bg-[#0A0A0A] rounded-[48px] animate-in slide-in-from-bottom-8">
                    <div className="w-20 h-20 bg-[#111] rounded-[40px] flex items-center justify-center mx-auto border border-[#222] shadow-2xl"><User size={36} className="text-gray-600" /></div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Sync Required</h3>
                       <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Connect to access AI portfolio management and real-time alerts.</p>
                    </div>
                    <Button onClick={handleSignInFarcaster} className="w-full bg-[#8a63d2] py-5 rounded-3xl">Get Started</Button>
                 </Card>
              ) : (
                 <div className="space-y-6 animate-in fade-in">
                    <Card className="p-8 rounded-[40px] border-[#222] bg-[#0A0A0A] overflow-hidden relative shadow-2xl border-t-blue-500/20 border-t-2">
                      <div className="flex flex-col items-center">
                        <div className="w-full min-w-0 min-h-[240px] relative">
                          <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                              <PieAny activeIndex={activePieIndex as any} data={portfolioCategories} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" onMouseEnter={(_: any, index: number) => setActivePieIndex(index)}>
                                {portfolioCategories.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" className="outline-none" />)}
                              </PieAny>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Balance</span>
                            <span className="text-2xl font-black text-white tabular-nums">{portfolioCategories.reduce((acc, curr) => acc + curr.value, 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                    {aiInsight ? (
                      <div className="grid grid-cols-1 gap-3">
                         <Card className="p-5 rounded-[32px] border-blue-500/20 bg-blue-500/5 space-y-3">
                            <div className="flex items-center gap-2 text-blue-500"><Sparkles size={16} /><h3 className="text-[10px] font-black uppercase tracking-widest">AI Summary</h3></div>
                            <p className="text-xs text-gray-300 font-bold leading-relaxed">{aiInsight.summary}</p>
                         </Card>
                         <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#111] p-4 rounded-3xl border border-[#222] space-y-1">
                               <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Sentiment</p>
                               <p className="text-sm font-black text-green-400 uppercase italic tracking-tighter">{aiInsight.marketSentiment}</p>
                            </div>
                            <div className="bg-[#111] p-4 rounded-3xl border border-[#222] space-y-1">
                               <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Trend</p>
                               <p className="text-sm font-black text-white uppercase italic tracking-tighter">{aiInsight.recommendation}</p>
                            </div>
                         </div>
                      </div>
                    ) : (
                      <div className="h-24 bg-[#111] rounded-[32px] flex items-center justify-center text-gray-700 font-black uppercase tracking-[0.2em] text-xs">AI Insights Unavailable</div>
                    )}
                 </div>
              )}
           </div>
        )}

        {activeTab === Tab.EARN && (
          <div className="space-y-6 animate-in fade-in pb-12">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic px-1">EARN</h2>
            {!selectedVault ? (
                vaults.length === 0 ? (
                  <Card className="p-8 text-center border-[#222] bg-[#0A0A0A] rounded-[32px]">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Vault data unavailable</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {vaults.map((vault) => (
                      <Card key={vault.address} className="p-6 flex justify-between items-center cursor-pointer hover:border-blue-500/30 transition-all group bg-[#0A0A0A]" onClick={() => setSelectedVault(vault)}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner"><TrendingUp size={24} /></div>
                          <div><h3 className="font-black text-white text-sm uppercase tracking-tight">{vault.name}</h3><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{vault.asset.symbol} Morpho Vault</p></div>
                        </div>
                        <div className="text-right"><div className="text-2xl font-black text-green-400 tabular-nums">{vault.totalApy}%</div><p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Total APY</p></div>
                      </Card>
                    ))}
                    <div className="p-4 rounded-3xl border border-dashed border-[#222] flex items-center gap-3 opacity-60">
                       <ShieldAlert size={18} className="text-yellow-500" />
                       <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">Vaults are curated by Morpho Blue. Ensure you understand underlying risks.</p>
                    </div>
                  </div>
                )
             ) : (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                   <button onClick={() => setSelectedVault(null)} className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest bg-[#111] px-4 py-2 rounded-xl border border-[#222] transition-colors"><ChevronLeft size={14} /> View All Hubs</button>
                   <Card className="p-8 space-y-8 border-[#222] rounded-[40px] shadow-2xl bg-[#0A0A0A]">
                      <div className="flex justify-between items-start">
                         <div><h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">{selectedVault.name}</h3><p className="text-[10px] text-gray-500 font-mono mt-1 opacity-60 truncate max-w-[150px]">{selectedVault.address}</p></div>
                         <div className="text-right"><div className="text-4xl font-black text-green-400 tabular-nums">{selectedVault.totalApy}%</div><span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Verified Yield</span></div>
                      </div>
                      <div className="space-y-4">
                         <div className="bg-[#111] p-6 rounded-[32px] border border-[#222] focus-within:border-blue-500/30 transition-all">
                            <div className="flex justify-between items-center mb-2 ml-1">
                               <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Deposit Hub</span>
                               <button onClick={() => setEarnAmount((availableTokens.find(t => t.symbol === selectedVault.asset.symbol)?.balance || 0).toString())} className="text-[10px] font-black text-blue-500 uppercase hover:text-blue-400">Max Balance</button>
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
          <ArrowLeftRight size={22} className={activeTab === Tab.SWAP ? "drop-shadow-[0_0_8px_rgba(0,82,255,0.6)]" : ""} /><span className="text-[9px] font-black uppercase tracking-widest">Swap</span>
        </button>
        <button onClick={() => setActiveTab(Tab.EARN)} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === Tab.EARN ? 'text-green-400 scale-110' : 'text-gray-500 hover:text-white'}`}>
          <BarChart3 size={22} className={activeTab === Tab.EARN ? "drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" : ""} /><span className="text-[9px] font-black uppercase tracking-widest">Earn</span>
        </button>
        <button onClick={() => setActiveTab(Tab.LAUNCH)} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === Tab.LAUNCH ? 'text-[#8a63d2] scale-110' : 'text-gray-500 hover:text-white'}`}>
          <Rocket size={22} className={activeTab === Tab.LAUNCH ? "drop-shadow-[0_0_8px_rgba(138,99,210,0.6)]" : ""} /><span className="text-[9px] font-black uppercase tracking-widest">Launch</span>
        </button>
        <button onClick={() => setActiveTab(Tab.PORTFOLIO)} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === Tab.PORTFOLIO ? 'text-blue-500 scale-110' : 'text-gray-500 hover:text-white'}`}>
          <PieChartIcon size={22} className={activeTab === Tab.PORTFOLIO ? "drop-shadow-[0_0_8px_rgba(0,82,255,0.6)]" : ""} /><span className="text-[9px] font-black uppercase tracking-widest">Pulse</span>
        </button>
      </nav>

      {showSwapConfirm && (
        <Modal 
          isOpen={showSwapConfirm} 
          onClose={() => setShowSwapConfirm(false)} 
          title={orderType === 'market' ? "Confirm Transaction" : "Confirm Limit Order"}
        >
           <div className="space-y-6 py-2">
              <div className="bg-[#111] p-6 rounded-[32px] border border-[#222] space-y-6 shadow-inner relative overflow-hidden animate-in zoom-in-95">
                 <div className="absolute top-0 right-0 p-3 opacity-[0.03] rotate-12 pointer-events-none"><Globe size={120} /></div>
                 
                 <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                          <ArrowUp size={20} className="text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">You Sell</p>
                          <p className="text-base font-black text-white tabular-nums">{swapAmount} {swapFrom.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Balance</p><p className="text-[11px] font-black text-gray-400">{swapFrom.balance.toLocaleString()}</p></div>
                    </div>

                    <div className="flex justify-center -my-3">
                      <div className="w-8 h-8 rounded-full bg-[#111] border-2 border-[#222] flex items-center justify-center relative z-20">
                         {orderType === 'limit' ? <Clock size={14} className="text-yellow-500" /> : <ArrowDown size={14} className="text-blue-500" />}
                      </div>
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-2xl border ${orderType === 'limit' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${orderType === 'limit' ? 'bg-yellow-500 shadow-yellow-500/40' : 'bg-blue-500 shadow-blue-500/40'}`}>
                          {orderType === 'limit' ? <Target size={20} className="text-white" /> : <ArrowDown size={20} className="text-white" />}
                        </div>
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${orderType === 'limit' ? 'text-yellow-500' : 'text-blue-500'}`}>
                            {orderType === 'limit' ? 'Execution Price' : 'You Receive (Est.)'}
                          </p>
                          <p className="text-lg font-black text-white tabular-nums">
                            {orderType === 'limit' ? `${targetPrice} ${swapTo.symbol}/${swapFrom.symbol}` : `${swapQuote?.outputAmount} ${swapTo.symbol}`}
                          </p>
                        </div>
                      </div>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-white/5 space-y-2.5">
                    {orderType === 'market' ? (
                      <>
                        <div className="flex justify-between items-center group"><div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-gray-500 tracking-widest"><Activity size={10} /> Network Fee</div><span className="text-[10px] font-black text-white tabular-nums">{swapQuote?.networkFeeUsd ?? '—'}</span></div>
                        <div className="flex justify-between items-center"><div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-gray-500 tracking-widest"><Settings2 size={10} /> Slippage Tolerance</div><span className="text-[10px] font-black text-yellow-500">{swapQuote?.slippage ?? '—'}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center group"><div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-gray-500 tracking-widest"><Clock size={10} /> Expiry Duration</div><span className="text-[10px] font-black text-white uppercase">{orderExpiry === 'gtc' ? 'Good Til Cancelled' : orderExpiry}</span></div>
                        <div className="flex justify-between items-center"><div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-gray-500 tracking-widest"><TrendingUp size={10} /> Market Distance</div><span className={`text-[10px] font-black uppercase ${parseFloat(priceDistance || '0') >= 0 ? 'text-green-500' : 'text-red-500'}`}>{priceDistance}%</span></div>
                      </>
                    )}
                 </div>

                 <div className="flex items-start gap-3 p-4 bg-black/40 rounded-2xl border border-white/5 mt-2">
                    <Info size={16} className="text-gray-600 shrink-0" />
                    <p className="text-[9px] font-bold text-gray-500 uppercase leading-relaxed tracking-widest">
                      {orderType === 'market' 
                        ? `Quote reflects live liquidity. Network fees vary based on sequencer congestion.`
                        : `Limit orders are off-chain messages. They cost no gas to place and only execute if the price target is reached.`}
                    </p>
                 </div>
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setShowSwapConfirm(false)} className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-[#1A1A1A] border border-[#333] text-gray-200">Cancel</button>
                 <Button onClick={handleExecuteSwap} className="flex-[2] py-5 text-lg rounded-[28px] group" disabled={isSwapping}>
                    {isSwapping ? <Loader2 size={24} className="animate-spin" /> : <span className="flex items-center gap-2">{orderType === 'limit' ? 'Place Order' : 'Confirm Swap'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></span>}
                 </Button>
              </div>
           </div>
        </Modal>
      )}

      {showSettings && (
        <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Hub Configurations">
           <div className="space-y-8 py-2">
              <div className="bg-[#111] p-5 rounded-3xl border border-[#222] space-y-4">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">API Keys</p>
                 <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">These are stored locally in your browser.</p>
                 <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Infura Project ID</label>
                      <input
                        type="password"
                        value={apiKeys.infuraId}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, infuraId: e.target.value }))}
                        placeholder="VITE_INFURA_ID"
                        className="w-full bg-black/40 border border-[#222] rounded-2xl p-3 text-xs font-bold outline-none focus:border-blue-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">0x API Key</label>
                      <input
                        type="password"
                        value={apiKeys.zeroXKey}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, zeroXKey: e.target.value }))}
                        placeholder="VITE_0X_API_KEY"
                        className="w-full bg-black/40 border border-[#222] rounded-2xl p-3 text-xs font-bold outline-none focus:border-blue-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Gemini API Key</label>
                      <input
                        type="password"
                        value={apiKeys.geminiKey}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, geminiKey: e.target.value }))}
                        placeholder="GEMINI_API_KEY"
                        className="w-full bg-black/40 border border-[#222] rounded-2xl p-3 text-xs font-bold outline-none focus:border-blue-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Ankr API Key (Optional)</label>
                      <input
                        type="password"
                        value={apiKeys.ankrKey}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, ankrKey: e.target.value }))}
                        placeholder="VITE_ANKR_API_KEY (for RPC fallback)"
                        className="w-full bg-black/40 border border-[#222] rounded-2xl p-3 text-xs font-bold outline-none focus:border-blue-500 text-white"
                      />
                    </div>
                 </div>
                 <Button onClick={handleSaveApiKeys} className="w-full rounded-[24px]">Save API Keys</Button>
                 {apiStatus && <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{apiStatus}</p>}
              </div>

              <div className="bg-[#111] p-5 rounded-3xl border border-[#222] transition-all hover:border-[#8a63d2]/30">
                 <div className="flex justify-between items-center mb-4">
                    <div className="overflow-hidden">
                       <p className="text-sm font-black text-white">Direct Push Signals</p>
                       <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5 tracking-widest truncate">Alpha, Alerts & Fills</p>
                    </div>
                    <div className="flex items-center gap-2">
                       {isEnablingNotifications ? (
                          <Loader2 size={20} className="animate-spin text-[#8a63d2]" />
                       ) : (
                          <button 
                             onClick={toggleLocalNotifications}
                             className={`p-1 rounded-full transition-all duration-300 ${localNotificationsActive && isNotificationEnabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                          >
                             {localNotificationsActive && isNotificationEnabled ? (
                                <ToggleRight size={32} className="text-green-500" />
                             ) : (
                                <ToggleLeft size={32} className="text-gray-600" />
                             )}
                          </button>
                       )}
                    </div>
                 </div>
                 <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-bold text-gray-500 uppercase leading-relaxed tracking-wider">
                       {isNotificationEnabled 
                        ? (localNotificationsActive ? 'App is synced with Farcaster for live push alerts.' : 'Push alerts are muted locally. You can re-enable at any time.')
                        : 'Connect with Farcaster to unlock real-time Alpha alerts and order fill notifications.'}
                    </p>
                 </div>
              </div>

              <div className="p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-3xl">
                 <p className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><ShieldAlert size={12} /> Security Notice</p>
                 <p className="text-[11px] text-gray-400 font-bold leading-relaxed">This portal is a high-performance unified interface. Always verify signatures on your trusted device before authorizing high-value transactions.</p>
              </div>
              <Button onClick={() => setShowSettings(false)} className="w-full rounded-[24px]">Update Preferences</Button>
           </div>
        </Modal>
      )}

      {showFarcasterMenu && farcasterUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowFarcasterMenu(false)} />
           <div className="relative bg-[#0A0A0A] border border-[#222] w-full max-w-sm rounded-[40px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center space-y-6">
                 <div className="w-20 h-20 rounded-[32px] bg-[#8a63d2]/20 p-1 border border-[#8a63d2]/30 overflow-hidden shadow-2xl relative">
                    <img src={farcasterUser.pfpUrl} className="w-full h-full object-cover rounded-[24px]" alt="pfp" />
                    <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#0A0A0A] ${localNotificationsActive ? 'bg-green-500' : 'bg-red-500'}`} />
                 </div>
                 
                 <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
                       {farcasterUser.displayName} <BadgeCheck size={18} className="text-blue-500" />
                    </h3>
                    <p className="text-xs text-[#8a63d2] font-black uppercase tracking-widest mt-1">@{farcasterUser.username}</p>
                 </div>

                 <div className="w-full space-y-2">
                    <button 
                       onClick={() => { setShowSettings(true); setShowFarcasterMenu(false); }}
                       className="w-full flex items-center justify-between p-4 bg-[#111] rounded-2xl border border-[#222] text-gray-400 hover:text-white transition-colors text-[11px] font-black uppercase tracking-widest"
                    >
                       <div className="flex items-center gap-3"><Settings2 size={16} /> Portal Config</div>
                       <ChevronLeft size={14} className="rotate-180 opacity-50" />
                    </button>
                    
                    <button 
                       onClick={toggleLocalNotifications}
                       className="w-full flex items-center justify-between p-4 bg-[#111] rounded-2xl border border-[#222] text-gray-400 hover:text-white transition-colors text-[11px] font-black uppercase tracking-widest"
                    >
                       <div className="flex items-center gap-3">
                          {localNotificationsActive ? <Bell size={16} className="text-green-500" /> : <BellOff size={16} className="text-red-500" />}
                          <span className={localNotificationsActive ? 'text-green-500' : 'text-red-500'}>
                             {localNotificationsActive ? 'Mute Alerts' : 'Unmute Alerts'}
                          </span>
                       </div>
                    </button>

                    <button 
                       onClick={() => { setFarcasterUser(null); setShowFarcasterMenu(false); }}
                       className="w-full flex items-center justify-center gap-2 p-4 text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors text-[11px] font-black uppercase tracking-widest"
                    >
                       <Power size={16} /> Sign Out
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;