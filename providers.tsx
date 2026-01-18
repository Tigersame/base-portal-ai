import { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

// NOTE: Removed apiKey to prevent Coinbase RPC 401 errors
// Wagmi handles RPC via Alchemy + Base public fallback
// Wallet functionality still works without apiKey

export function Providers({ children }: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      chain={base}
      config={{
        appearance: {
          mode: 'dark',
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
