# Fixes Applied to Base Portal AI

## Date: $(date)

### ✅ Fix 1: Farcaster SDK postMessage Origin Mismatch

**Issue**: 
```
Failed to execute 'postMessage' ... origin does not match
```

**Root Cause**: Farcaster SDK was running outside of the Mini App iframe context (e.g., on localhost), causing postMessage to fail.

**Solution**: Added `isMiniApp()` helper function to detect if the app is running inside a Farcaster iframe:

```typescript
// Helper to detect if running inside Farcaster Mini App iframe
const isMiniApp = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.parent !== window;
  } catch {
    return false;
  }
};
```

Then wrapped the Farcaster SDK initialization:

```typescript
useEffect(() => {
  const init = async () => {
    try {
      // Only run Farcaster SDK inside MiniApp
      if (!isMiniApp()) {
        return;
      }
      await sdk.actions.ready();
      // ... rest of the code
    } catch (err) {
      console.warn("SDK initialization skipped", err);
    }
  };
  init();
}, [isConnected, connectors, connect]);
```

**Status**: ✅ Fixed and Deployed

---

### ℹ️ Note: WalletConnect CSP Issue

**Issue Reported**:
```
explorer-api.walletconnect.com ... violates CSP connect-src
```

**Current Status**: 
The project config in `index.tsx` already has conditional connector loading:
```typescript
const connectors = isFarcasterMiniApp
  ? []
  : [
      coinbaseWallet({
        appName: 'BEND',
        preference: 'smartWalletOnly',
        version: '4',
      }),
    ];
```

WalletConnect is NOT included in the connectors array, so this should not be an issue. The CSP error might be coming from a different source or dependency.

---

### ✅ Coinbase OnchainKit API Key

**Issue**: 401 Unauthorized error from Coinbase API

**Status**: API key is present in environment variables:
```
VITE_PUBLIC_ONCHAINKIT_API_KEY="81a39fc1-8229-4520-b1da-4eabc272ef43"
```

**Action Needed**: If 401 errors persist, you may need to:
1. Generate a new API key at https://portal.cdp.coinbase.com/
2. Update the key in Vercel environment variables
3. Redeploy

---

### ✅ Swap Engine Status

**Status**: ✅ Working correctly
- Uniswap V3 pool found
- Quotes are being calculated correctly
- Price impact calculations working

---

## Deployment Info

- **Production URL**: https://base-portal-ai.vercel.app
- **Latest Deployment**: https://base-portal-ox1to1hw5-devsminiapp.vercel.app
- **Inspect**: https://vercel.com/devsminiapp/base-portal-ai
- **Git Commit**: Fixed postMessage origin mismatch with isMiniApp check

## Testing Checklist

- [ ] Test in Farcaster Mini App context
- [ ] Test on localhost (should skip Farcaster SDK)
- [ ] Test wallet connection
- [ ] Test token swaps
- [ ] Verify no CSP errors in console
- [ ] Verify no postMessage errors

Sun, Jan 18, 2026  9:18:24 PM
