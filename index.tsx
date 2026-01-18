import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import './styles.css';
import '@coinbase/onchainkit/styles.css';
import App from './App';
import { Providers } from './providers';
import { http, createConfig, WagmiProvider, fallback } from 'wagmi';
import { base } from 'viem/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;

const isFarcasterMiniApp = typeof window !== 'undefined' && !!(window as any).farcaster;

const queryClient = new QueryClient();

// RPC Configuration - Force Alchemy + fallback public Base RPC only
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined;
const ALCHEMY_RPC = alchemyKey ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}` : null;
const BASE_PUBLIC_RPC = 'https://mainnet.base.org';

console.log('[RPC Config] Primary RPC (Alchemy):', ALCHEMY_RPC ? 'Configured' : 'Not set');
console.log('[RPC Config] Fallback RPC:', BASE_PUBLIC_RPC);
console.log('[RPC Config] Is Farcaster Mini App:', isFarcasterMiniApp);

const connectors = isFarcasterMiniApp
  ? []
  : [
      coinbaseWallet({
        appName: 'BEND',
        preference: 'smartWalletOnly',
        version: '4',
      }),
    ];

// Build transport with fallback - NO Coinbase RPC
const transports = ALCHEMY_RPC 
  ? fallback([
      http(ALCHEMY_RPC, {
        batch: { multicall: true },
        fetchOptions: { timeout: 15000 },
        retryCount: 2,
        retryDelay: 1000,
      }),
      http(BASE_PUBLIC_RPC, {
        batch: { multicall: true },
        fetchOptions: { timeout: 15000 },
        retryCount: 2,
        retryDelay: 1000,
      }),
    ])
  : http(BASE_PUBLIC_RPC, {
      batch: { multicall: true },
      fetchOptions: { timeout: 15000 },
      retryCount: 3,
      retryDelay: 1000,
    });

const wagmiConfig = createConfig({
  chains: [base],
  connectors,
  transports: {
    [base.id]: transports,
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
