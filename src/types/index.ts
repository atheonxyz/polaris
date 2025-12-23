import { NetworkName, TXIDVersion } from '@railgun-community/shared-models';

export interface PolarisConfig {
  dataDir: string;
  dbPath: string;
  artifactsDir: string;
  debug: boolean;
}

export interface WalletInfo {
  id: string;
  railgunAddress: string;
  createdAt: string;
  networks: NetworkName[];
}

export interface StoredWalletData {
  wallets: WalletInfo[];
  activeWalletId: string | null;
}

export interface NetworkConfig {
  name: NetworkName;
  chainId: number;
  rpcUrls: string[];
  explorerUrl?: string;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface ShieldParams {
  networkName: NetworkName;
  txidVersion: TXIDVersion;
  tokenAddress: string;
  amount: bigint;
  fromAddress: string;
}

export interface UnshieldParams {
  networkName: NetworkName;
  txidVersion: TXIDVersion;
  tokenAddress: string;
  amount: bigint;
  toAddress: string;
}

export interface TransferParams {
  networkName: NetworkName;
  txidVersion: TXIDVersion;
  tokenAddress: string;
  amount: bigint;
  toRailgunAddress: string;
}

export interface TokenBalance {
  tokenAddress: string;
  symbol?: string;
  balance: bigint;
  decimals: number;
}

export interface WalletBalances {
  networkName: NetworkName;
  tokens: TokenBalance[];
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}
