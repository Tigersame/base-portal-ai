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

const queryClient = new QueryClient();

const infuraId =
  (typeof localStorage !== 'undefined' ? localStorage.getItem('VITE_INFURA_ID') : null) ||
  (import.meta.env.VITE_INFURA_ID as string | undefined);

const ankrApiKey =
  (typeof localStorage !== 'undefined' ? localStorage.getItem('VITE_ANKR_API_KEY') : null) ||
  (import.meta.env.VITE_ANKR_API_KEY as string | undefined);

const rpcUrls = [
  infuraId ? `https://base-mainnet.infura.io/v3/${infuraId}` : null,
  ankrApiKey ? `https://rpc.ankr.com/base/${ankrApiKey}` : 'https://rpc.ankr.com/base',
  'https://mainnet.base.org',
  'https://base.meowrpc.com',
].filter(Boolean) as string[];

// Use the first available RPC or fallback to Base's public RPC
const primaryRpc = rpcUrls.length > 0 ? rpcUrls[0] : 'https://mainnet.base.org';

console.log('[RPC Config] Using RPC:', primaryRpc);
console.log('[RPC Config] Available RPCs:', rpcUrls);

const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'BEND',
      preference: 'smartWalletOnly',
      version: '4',
    }),
    injected({
      shimDisconnect: true,
    }),
  ],
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