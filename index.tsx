import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import './styles.css';
import '@coinbase/onchainkit/styles.css';
import App from './App';
import { Providers } from './providers';
import { http, createConfig, WagmiProvider } from 'wagmi';
import { base } from 'viem/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Ensure Buffer is available for browser bundles that depend on it.
(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;

// Improved Farcaster Mini App detection
function detectFarcasterMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if in iframe
  const isIframe = window.self !== window.top;
  
  // Check user agent for Warpcast
  const isWarpcast = navigator.userAgent.toLowerCase().includes('warpcast');
  
  // Check for Farcaster-specific properties
  const hasFarcasterContext = !!(window as any).farcaster || !!(window as any).fc;
  
  return isIframe || isWarpcast || hasFarcasterContext;
}

const isFarcasterMiniApp = detectFarcasterMiniApp();

const queryClient = new QueryClient();

// RPC Configuration: Alchemy (primary) + QuickNode (fallback) + Base Public (fallback)
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined;
const quicknodeUrl = import.meta.env.VITE_QUICKNODE_URL as string | undefined;

const rpcUrls: string[] = [];

if (alchemyKey) {
  rpcUrls.push(`https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`);
}
if (quicknodeUrl) {
  rpcUrls.push(quicknodeUrl);
}
rpcUrls.push('https://mainnet.base.org');

const primaryRpc = rpcUrls[0];

console.log('[RPC Config] Using RPC:', primaryRpc);
console.log('[RPC Config] Is Farcaster Mini App:', isFarcasterMiniApp);

// Configure connectors - only use Coinbase Smart Wallet in Mini App
const connectors = isFarcasterMiniApp
  ? [
      coinbaseWallet({
        appName: 'BEND',
        preference: 'smartWalletOnly',
        version: '4',
      }),
    ]
  : [
      coinbaseWallet({
        appName: 'BEND',
        preference: 'smartWalletOnly',
        version: '4',
      }),
      injected({
        shimDisconnect: true,
      }),
    ];

const wagmiConfig = createConfig({
  chains: [base],
  connectors,
  transports: {
    [base.id]: http(primaryRpc, {
      batch: {
        multicall: true,
      },
      fetchOptions: {
        timeout: 15000,
      },
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Providers>
          <App />
        </Providers>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);