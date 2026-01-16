import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import './styles.css';
import '@coinbase/onchainkit/styles.css';
import App from './App';
import { Providers } from './providers';
import { http, createConfig, WagmiProvider } from 'wagmi';
import { base } from 'viem/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Ensure Buffer is available for browser bundles that depend on it.
(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;

const queryClient = new QueryClient();

const infuraId =
  (typeof localStorage !== 'undefined' ? localStorage.getItem('VITE_INFURA_ID') : null) ||
  (import.meta.env.VITE_INFURA_ID as string | undefined);
const baseRpcUrl = infuraId
  ? `https://base-mainnet.infura.io/v3/${infuraId}`
  : 'https://mainnet.base.org';

const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'BEND',
      preference: 'smartWalletOnly', // Prioritize Smart Wallet/Base Account for seamless onboarding
      version: '4',
    }),
  ],
  transports: {
    [base.id]: http(baseRpcUrl),
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