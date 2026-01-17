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

// Detect if running inside Farcaster Mini App (iframe)
const isFarcasterMiniApp = typeof window !== 'undefined' && window.parent !== window;

const queryClient = new QueryClient();

// Prioritize reliable public RPCs - Base public RPC first
// Skip Infura if it causes issues (401/disabled)
const rpcUrls = [
  'https://mainnet.base.org',
  'https://base.meowrpc.com',
  'https://rpc.ankr.com/base',
];

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