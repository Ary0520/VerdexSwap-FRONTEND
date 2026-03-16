import { create } from 'zustand';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { MetaMaskSDK } from '@metamask/sdk';
import { useNotificationStore } from './notificationStore';

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614n;
const ARBITRUM_SEPOLIA_HEX = '0x66eee';

// Lazily initialised SDK instance for mobile fallback
let _mobileSDK: MetaMaskSDK | null = null;
const getMobileSDK = (): MetaMaskSDK => {
  if (!_mobileSDK) {
    _mobileSDK = new MetaMaskSDK({
      dappMetadata: { name: 'VerdexSwap', url: window.location.host },
      logging: { developerMode: false },
    });
  }
  return _mobileSDK;
};

// Returns the active ethereum provider — extension on desktop, SDK on mobile
const getEthereumProvider = async (): Promise<any> => {
  if (typeof window.ethereum !== 'undefined') return window.ethereum;
  const sdk = getMobileSDK();
  await sdk.init();
  return sdk.getProvider();
};

interface WalletState {
  address: string | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: bigint | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshSigner: () => Promise<void>;
}

// Helper to initialise provider + signer from the current ethereum provider
const buildProviderAndSigner = async (ethereum: any): Promise<{
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
  chainId: bigint;
}> => {
  const provider = new BrowserProvider(ethereum);
  const network = await provider.getNetwork();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address, chainId: network.chainId };
};

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  provider: null,
  signer: null,
  isConnected: false,
  isConnecting: false,
  chainId: null,

  refreshSigner: async () => {
    if (typeof window.ethereum === 'undefined') return;
    try {
      const { provider, signer, address, chainId } = await buildProviderAndSigner(window.ethereum);
      set({ provider, signer, address, chainId, isConnected: true });
    } catch {
      get().disconnect();
    }
  },

  connect: async () => {
    set({ isConnecting: true });

    try {
      const ethereum = await getEthereumProvider();

      if (!ethereum) {
        useNotificationStore.getState().addNotification({
          type: 'error',
          title: 'Wallet Error',
          message: 'Please install MetaMask!',
        });
        set({ isConnecting: false });
        return;
      }

      // Request account access
      const provider = new BrowserProvider(ethereum);
      await provider.send('eth_requestAccounts', []);

      // Check network – switch if needed
      const network = await provider.getNetwork();
      if (network.chainId !== ARBITRUM_SEPOLIA_CHAIN_ID) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARBITRUM_SEPOLIA_HEX }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: ARBITRUM_SEPOLIA_HEX,
                  chainName: 'Arbitrum Sepolia',
                  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                  blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      // Re-create provider AFTER potential network switch
      const { provider: freshProvider, signer, address, chainId } = await buildProviderAndSigner(ethereum);

      set({
        address,
        provider: freshProvider,
        signer,
        chainId,
        isConnected: true,
        isConnecting: false,
      });

      // Register event listeners once
      if (!ethereum._verdexListenersAttached) {
        ethereum._verdexListenersAttached = true;

        ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length === 0) {
            get().disconnect();
          } else {
            get().refreshSigner();
          }
        });

        ethereum.on('chainChanged', () => {
          get().refreshSigner();
        });

        ethereum.on('disconnect', () => {
          get().disconnect();
        });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      set({ isConnecting: false });
    }
  },

  disconnect: () => {
    set({
      address: null,
      provider: null,
      signer: null,
      isConnected: false,
      chainId: null,
    });
  },
}));
