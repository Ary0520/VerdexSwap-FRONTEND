import { create } from 'zustand';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { useNotificationStore } from './notificationStore';

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614n;
const ARBITRUM_SEPOLIA_HEX = '0x66eee';

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

// Helper to initialise provider + signer from the current window.ethereum state
const buildProviderAndSigner = async (): Promise<{
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
  chainId: bigint;
}> => {
  const provider = new BrowserProvider(window.ethereum);
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
      const { provider, signer, address, chainId } = await buildProviderAndSigner();
      set({ provider, signer, address, chainId, isConnected: true });
    } catch {
      // wallet disconnected / locked
      get().disconnect();
    }
  },

  connect: async () => {
    if (typeof window.ethereum === 'undefined') {
      useNotificationStore.getState().addNotification({
        type: 'error',
        title: 'Wallet Error',
        message: 'Please install MetaMask!',
      });
      return;
    }

    set({ isConnecting: true });

    try {
      // Request account access
      const provider = new BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);

      // Check network – switch if needed
      const network = await provider.getNetwork();
      if (network.chainId !== ARBITRUM_SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARBITRUM_SEPOLIA_HEX }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
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

      // Re-create provider AFTER potential network switch so the signer is on the correct chain
      const { provider: freshProvider, signer, address, chainId } = await buildProviderAndSigner();

      set({
        address,
        provider: freshProvider,
        signer,
        chainId,
        isConnected: true,
        isConnecting: false,
      });

      // Register MetaMask event listeners (once – guard against duplicates)
      const ethereum = window.ethereum as any;
      if (!ethereum._verdexListenersAttached) {
        ethereum._verdexListenersAttached = true;

        ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length === 0) {
            get().disconnect();
          } else {
            get().refreshSigner();
          }
        });

        ethereum.on('chainChanged', (_chainId: string) => {
          // Always refresh signer when chain changes
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
