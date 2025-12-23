import path from 'path';
import os from 'os';
import { NetworkName, FallbackProviderJsonConfig } from '@railgun-community/shared-models';
import type { PolarisConfig, NetworkConfig } from '../types/index.js';

// Default Polaris data directory
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.polaris');

export const getDefaultConfig = (): PolarisConfig => ({
  dataDir: DEFAULT_DATA_DIR,
  dbPath: path.join(DEFAULT_DATA_DIR, 'wallet.db'),
  artifactsDir: path.join(DEFAULT_DATA_DIR, 'artifacts'),
  debug: false,
});

// Network configurations with RPC endpoints
export const NETWORK_CONFIGS: Record<NetworkName, NetworkConfig | undefined> = {
  [NetworkName.Ethereum]: {
    name: NetworkName.Ethereum,
    chainId: 1,
    rpcUrls: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
    ],
    explorerUrl: 'https://etherscan.io',
  },
  [NetworkName.Polygon]: {
    name: NetworkName.Polygon,
    chainId: 137,
    rpcUrls: [
      'https://polygon.llamarpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon-bor.publicnode.com',
    ],
    explorerUrl: 'https://polygonscan.com',
  },
  [NetworkName.BNBChain]: {
    name: NetworkName.BNBChain,
    chainId: 56,
    rpcUrls: [
      'https://bsc.llamarpc.com',
      'https://rpc.ankr.com/bsc',
      'https://bsc.publicnode.com',
    ],
    explorerUrl: 'https://bscscan.com',
  },
  [NetworkName.Arbitrum]: {
    name: NetworkName.Arbitrum,
    chainId: 42161,
    rpcUrls: [
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum-one.publicnode.com',
    ],
    explorerUrl: 'https://arbiscan.io',
  },
  // Testnets
  [NetworkName.EthereumSepolia]: {
    name: NetworkName.EthereumSepolia,
    chainId: 11155111,
    rpcUrls: [
      'https://rpc.ankr.com/eth_sepolia',
      'https://ethereum-sepolia.publicnode.com',
    ],
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  // Unsupported networks (set to undefined)
  [NetworkName.PolygonAmoy]: undefined,
  [NetworkName.EthereumRopsten_DEPRECATED]: undefined,
  [NetworkName.EthereumGoerli_DEPRECATED]: undefined,
  [NetworkName.ArbitrumGoerli_DEPRECATED]: undefined,
  [NetworkName.PolygonMumbai_DEPRECATED]: undefined,
  [NetworkName.Hardhat]: undefined,
};

// Get supported networks
export const getSupportedNetworks = (): NetworkName[] => {
  return Object.entries(NETWORK_CONFIGS)
    .filter(([_, config]) => config !== undefined)
    .map(([name]) => name as NetworkName);
};

// Get fallback provider config for a network
export const getFallbackProviderConfig = (networkName: NetworkName): FallbackProviderJsonConfig | null => {
  const config = NETWORK_CONFIGS[networkName];
  if (!config) return null;

  return {
    chainId: config.chainId,
    providers: config.rpcUrls.map((url, index) => ({
      provider: url,
      priority: index + 1,
      weight: 1,
    })),
  };
};

// Common token addresses by network
export const COMMON_TOKENS: Record<NetworkName, Record<string, string> | undefined> = {
  [NetworkName.Ethereum]: {
    ETH: '0x0000000000000000000000000000000000000000',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EescdeCB5c6fF8',
    RAIL: '0xe76C6c83af64e4C60245D8C7dE953DF673a7A33D',
  },
  [NetworkName.Polygon]: {
    MATIC: '0x0000000000000000000000000000000000000000',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    RAIL: '0x92A9C92C215092720C731c96D4Ff508c831a714f',
  },
  [NetworkName.BNBChain]: {
    BNB: '0x0000000000000000000000000000000000000000',
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
  },
  [NetworkName.Arbitrum]: {
    ETH: '0x0000000000000000000000000000000000000000',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  [NetworkName.EthereumSepolia]: {
    ETH: '0x0000000000000000000000000000000000000000',
  },
  [NetworkName.PolygonAmoy]: undefined,
  [NetworkName.EthereumRopsten_DEPRECATED]: undefined,
  [NetworkName.EthereumGoerli_DEPRECATED]: undefined,
  [NetworkName.ArbitrumGoerli_DEPRECATED]: undefined,
  [NetworkName.PolygonMumbai_DEPRECATED]: undefined,
  [NetworkName.Hardhat]: undefined,
};
