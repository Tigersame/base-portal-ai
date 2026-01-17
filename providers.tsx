import { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

const onchainKitApiKey = import.meta.env.VITE_PUBLIC_ONCHAINKIT_API_KEY as string | undefined;

if (!onchainKitApiKey) {
  console.warn('[OnchainKit] No API key found. Some features may be limited. Set VITE_PUBLIC_ONCHAINKIT_API_KEY in Vercel.');
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={onchainKitApiKey}
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
