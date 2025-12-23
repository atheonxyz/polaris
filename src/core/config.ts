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

// Token info with symbol, decimals, and address
export interface TokenInfo {
  symbol: string;
  decimals: number;
  address: string;
}

// Common tokens by network (address -> TokenInfo)
export const TOKEN_INFO: Record<NetworkName, Record<string, TokenInfo> | undefined> = {
  [NetworkName.Ethereum]: {
    '0x0000000000000000000000000000000000000000': { symbol: 'ETH', decimals: 18, address: '0x0000000000000000000000000000000000000000' },
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8, address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18, address: '0x6B175474E89094C44Da98b954EesdeaC495271d0F' },
    '0xe76c6c83af64e4c60245d8c7de953df673a7a33d': { symbol: 'RAIL', decimals: 18, address: '0xe76C6c83af64e4C60245D8C7dE953DF673a7A33D' },
    '0x514910771af9ca656af840dff83e8264ecf986ca': { symbol: 'LINK', decimals: 18, address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { symbol: 'UNI', decimals: 18, address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
    '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': { symbol: 'AAVE', decimals: 18, address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' },
  },
  [NetworkName.Polygon]: {
    '0x0000000000000000000000000000000000000000': { symbol: 'MATIC', decimals: 18, address: '0x0000000000000000000000000000000000000000' },
    '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': { symbol: 'WMATIC', decimals: 18, address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' },
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': { symbol: 'WETH', decimals: 18, address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619' },
    '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': { symbol: 'WBTC', decimals: 8, address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6' },
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': { symbol: 'USDC', decimals: 6, address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { symbol: 'USDC', decimals: 6, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' }, // Native USDC
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { symbol: 'USDT', decimals: 6, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': { symbol: 'DAI', decimals: 18, address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' },
    '0x92a9c92c215092720c731c96d4ff508c831a714f': { symbol: 'RAIL', decimals: 18, address: '0x92A9C92C215092720C731c96D4Ff508c831a714f' },
  },
  [NetworkName.BNBChain]: {
    '0x0000000000000000000000000000000000000000': { symbol: 'BNB', decimals: 18, address: '0x0000000000000000000000000000000000000000' },
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': { symbol: 'WBNB', decimals: 18, address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' },
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8': { symbol: 'ETH', decimals: 18, address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8' },
    '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': { symbol: 'BTCB', decimals: 18, address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c' },
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { symbol: 'USDC', decimals: 18, address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
    '0x55d398326f99059ff775485246999027b3197955': { symbol: 'USDT', decimals: 18, address: '0x55d398326f99059fF775485246999027B3197955' },
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3': { symbol: 'DAI', decimals: 18, address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3' },
  },
  [NetworkName.Arbitrum]: {
    '0x0000000000000000000000000000000000000000': { symbol: 'ETH', decimals: 18, address: '0x0000000000000000000000000000000000000000' },
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': { symbol: 'WETH', decimals: 18, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': { symbol: 'WBTC', decimals: 8, address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { symbol: 'USDC', decimals: 6, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': { symbol: 'USDC.e', decimals: 6, address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' },
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT', decimals: 6, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': { symbol: 'DAI', decimals: 18, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' },
  },
  [NetworkName.EthereumSepolia]: {
    '0x0000000000000000000000000000000000000000': { symbol: 'ETH', decimals: 18, address: '0x0000000000000000000000000000000000000000' },
  },
  [NetworkName.PolygonAmoy]: undefined,
  [NetworkName.EthereumRopsten_DEPRECATED]: undefined,
  [NetworkName.EthereumGoerli_DEPRECATED]: undefined,
  [NetworkName.ArbitrumGoerli_DEPRECATED]: undefined,
  [NetworkName.PolygonMumbai_DEPRECATED]: undefined,
  [NetworkName.Hardhat]: undefined,
};

// Get token info by address (case-insensitive)
export const getTokenInfo = (networkName: NetworkName, address: string): TokenInfo | undefined => {
  const tokens = TOKEN_INFO[networkName];
  if (!tokens) return undefined;
  return tokens[address.toLowerCase()];
};

// Legacy export for backwards compatibility
export const COMMON_TOKENS: Record<NetworkName, Record<string, string> | undefined> = {
  [NetworkName.Ethereum]: {
    ETH: '0x0000000000000000000000000000000000000000',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeaC495271d0F',
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
