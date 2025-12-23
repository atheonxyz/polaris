import { Command } from 'commander';
import chalk from 'chalk';
import { TXIDVersion } from '@railgun-community/shared-models';
import { WalletManager } from '../../wallet/wallet-manager.js';
import { ProviderManager } from '../../network/provider-manager.js';
import { BalanceService } from '../../transactions/balance-service.js';
import { output } from '../../utils/logger.js';

export const createBalanceCommand = (
  walletManager: WalletManager,
  providerManager: ProviderManager,
  balanceService: BalanceService,
): Command => {
  const balanceCmd = new Command('balance')
    .description('View wallet balances');

  // Show balances
  balanceCmd
    .command('show')
    .description('Show private (shielded) balances')
    .option('-r, --refresh', 'Refresh balances before showing')
    .action(async (options) => {
      try {
        const wallet = await walletManager.getActiveWallet();
        if (!wallet) {
          output.error('No active wallet. Create or load one first.');
          return;
        }

        if (!walletManager.isWalletLoaded(wallet.id)) {
          output.error('Wallet not loaded. Load it first with: polaris wallet load');
          return;
        }

        const network = providerManager.getActiveNetwork();
        if (!network) {
          output.error('No network connected. Connect with: polaris network connect');
          return;
        }

        if (options.refresh) {
          output.info('Refreshing balances...');
          await balanceService.refreshBalances(wallet.id, network);
        }

        output.info(`Fetching balances for ${network}...`);
        const balances = await balanceService.getBalances(
          wallet.id,
          network,
          TXIDVersion.V2_PoseidonMerkle,
        );

        output.newline();
        output.bold(`Private Balances on ${chalk.cyan(network)}:`);
        output.newline();

        if (balances.tokens.length === 0) {
          output.dim('  No private balances found.');
          output.dim('  Shield tokens to see them here.');
        } else {
          for (const token of balances.tokens) {
            const formattedBalance = formatBalance(token.balance, token.decimals);
            console.log(`  ${chalk.yellow(token.tokenAddress.substring(0, 10))}...`);
            console.log(`    Balance: ${chalk.green(formattedBalance)}`);
          }
        }

        output.newline();
      } catch (error) {
        output.error(`Failed to get balances: ${error}`);
      }
    });

  // Refresh balances
  balanceCmd
    .command('refresh')
    .description('Refresh wallet balances from blockchain')
    .option('--full', 'Full rescan (slower but more thorough)')
    .action(async (options) => {
      try {
        const wallet = await walletManager.getActiveWallet();
        if (!wallet) {
          output.error('No active wallet.');
          return;
        }

        if (!walletManager.isWalletLoaded(wallet.id)) {
          output.error('Wallet not loaded.');
          return;
        }

        const network = providerManager.getActiveNetwork();
        if (!network) {
          output.error('No network connected.');
          return;
        }

        output.info(`Refreshing balances${options.full ? ' (full scan)' : ''}...`);

        if (options.full) {
          await balanceService.fullRescan(wallet.id, network);
        } else {
          await balanceService.refreshBalances(wallet.id, network);
        }

        output.success('Balances refreshed!');
      } catch (error) {
        output.error(`Failed to refresh balances: ${error}`);
      }
    });

  // Show transaction history
  balanceCmd
    .command('history')
    .description('Show transaction history')
    .option('-n, --limit <number>', 'Number of transactions to show', '10')
    .action(async (options) => {
      try {
        const wallet = await walletManager.getActiveWallet();
        if (!wallet) {
          output.error('No active wallet.');
          return;
        }

        if (!walletManager.isWalletLoaded(wallet.id)) {
          output.error('Wallet not loaded.');
          return;
        }

        const network = providerManager.getActiveNetwork();
        if (!network) {
          output.error('No network connected.');
          return;
        }

        output.info('Fetching transaction history...');

        const history = await balanceService.getTransactionHistory(wallet.id, network);
        const limit = parseInt(options.limit);

        output.newline();
        output.bold(`Transaction History on ${chalk.cyan(network)}:`);
        output.newline();

        if (!history || history.length === 0) {
          output.dim('  No transactions found.');
        } else {
          const displayHistory = history.slice(0, limit);
          for (const tx of displayHistory) {
            // Display transaction info (structure depends on SDK)
            console.log(chalk.dim(JSON.stringify(tx, null, 2)));
          }

          if (history.length > limit) {
            output.dim(`  ... and ${history.length - limit} more transactions`);
          }
        }

        output.newline();
      } catch (error) {
        output.error(`Failed to get history: ${error}`);
      }
    });

  return balanceCmd;
};

// Helper function to format balance
function formatBalance(balance: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 6);
  return `${integerPart}.${fractionalStr}`;
}
