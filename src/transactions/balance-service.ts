import {
  refreshBalances,
  getWalletTransactionHistory,
  rescanFullUTXOMerkletreesAndWallets,
  resetFullTXIDMerkletreesV2,
  walletForID,
} from '@railgun-community/wallet';
import {
  NetworkName,
  TXIDVersion,
  NETWORK_CONFIG,
} from '@railgun-community/shared-models';
import { TokenType } from '@railgun-community/engine';
import type { TokenBalance, WalletBalances } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getTokenInfo } from '../core/config.js';

export class BalanceService {
  /**
   * Refresh balances for a wallet on a network
   */
  async refreshBalances(
    walletId: string,
    networkName: NetworkName,
  ): Promise<void> {
    const chain = NETWORK_CONFIG[networkName].chain;

    logger.info(`Refreshing balances for wallet on ${networkName}...`);

    await refreshBalances(chain, [walletId]);

    logger.info('Balances refreshed');
  }

  /**
   * Get wallet balances for a network
   */
  async getBalances(
    walletId: string,
    networkName: NetworkName,
    txidVersion: TXIDVersion = TXIDVersion.V2_PoseidonMerkle,
  ): Promise<WalletBalances> {
    const chain = NETWORK_CONFIG[networkName].chain;

    logger.debug(`Getting balances for wallet on ${networkName}...`);

    // Get the wallet instance
    const wallet = walletForID(walletId);

    // Get balances from the wallet (onlySpendable = false to get all)
    const balances = await wallet.getTokenBalances(txidVersion, chain, false);

    // Convert to our format - extract actual token addresses from tokenData
    const tokens: TokenBalance[] = [];

    for (const [_tokenHash, treeBalance] of Object.entries(balances)) {
      if (treeBalance && treeBalance.balance > 0n) {
        // Only process ERC20 tokens (not NFTs)
        if (treeBalance.tokenData?.tokenType !== TokenType.ERC20) {
          continue;
        }

        // Extract actual token address from tokenData
        // The tokenAddress in tokenData is stored as hex without 0x prefix
        const rawAddress = treeBalance.tokenData.tokenAddress;
        const tokenAddress = rawAddress.startsWith('0x') ? rawAddress : `0x${rawAddress}`;

        // Get token info from our registry for proper decimals
        const tokenInfo = getTokenInfo(networkName, tokenAddress);
        const decimals = tokenInfo?.decimals ?? 18;
        const symbol = tokenInfo?.symbol;

        tokens.push({
          tokenAddress,
          balance: treeBalance.balance,
          decimals,
          symbol,
        });
      }
    }

    return {
      networkName,
      tokens,
    };
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(
    walletId: string,
    networkName: NetworkName,
    startingBlock?: number,
  ): Promise<unknown[]> {
    const chain = NETWORK_CONFIG[networkName].chain;

    logger.debug(`Getting transaction history for wallet on ${networkName}...`);

    const history = await getWalletTransactionHistory(
      chain,
      walletId,
      startingBlock,
    );

    return history;
  }

  /**
   * Rescan all merkletrees (expensive operation)
   */
  async fullRescan(walletId: string, networkName: NetworkName): Promise<void> {
    const chain = NETWORK_CONFIG[networkName].chain;

    logger.warn('Starting full merkletree rescan. This may take a while...');

    await rescanFullUTXOMerkletreesAndWallets(chain, [walletId]);

    logger.info('Full rescan complete');
  }

  /**
   * Reset TXID merkletrees
   */
  async resetTXIDMerkletrees(networkName: NetworkName): Promise<void> {
    const chain = NETWORK_CONFIG[networkName].chain;

    logger.warn('Resetting TXID merkletrees...');

    await resetFullTXIDMerkletreesV2(chain);

    logger.info('TXID merkletrees reset');
  }
}
