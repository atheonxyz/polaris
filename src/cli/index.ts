#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { startREPL } from './repl.js';
import { initializeEngine, shutdownEngine } from '../core/engine.js';
import { WalletManager } from '../wallet/wallet-manager.js';
import { ProviderManager } from '../network/provider-manager.js';
import { BalanceService } from '../transactions/balance-service.js';
import { TransactionService } from '../transactions/transaction-service.js';
import { createWalletCommand } from './commands/wallet.js';
import { createNetworkCommand } from './commands/network.js';
import { createBalanceCommand } from './commands/balance.js';
import { output, setLogLevel } from '../utils/logger.js';

const VERSION = '1.0.0';

const BANNER = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('POLARIS')} - Privacy-First Wallet                           ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.dim('Powered by RAILGUN')}                                       ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`;

async function main() {
  const program = new Command();

  program
    .name('polaris')
    .description('Polaris - Privacy-first wallet powered by RAILGUN')
    .version(VERSION)
    .option('-d, --debug', 'Enable debug logging');

  // Default action: start interactive REPL
  program.action(async (options) => {
    await startREPL({ debug: options.debug });
  });

  // Legacy one-shot commands (for scripting)
  const legacyProgram = program
    .command('legacy')
    .description('Run legacy one-shot commands')
    .hook('preAction', async (thisCommand) => {
      const opts = program.opts();
      if (opts.debug) {
        setLogLevel('debug');
      }

      try {
        await initializeEngine({ debug: opts.debug });
      } catch (error) {
        output.error(`Failed to initialize: ${error}`);
        process.exit(1);
      }
    });

  // Create service instances for legacy commands
  const walletManager = new WalletManager();
  const providerManager = new ProviderManager();
  const balanceService = new BalanceService();

  // Add legacy commands
  legacyProgram.addCommand(createWalletCommand(walletManager));
  legacyProgram.addCommand(createNetworkCommand(providerManager));
  legacyProgram.addCommand(createBalanceCommand(walletManager, providerManager, balanceService));

  // Legacy status command
  legacyProgram
    .command('status')
    .description('Show wallet and network status')
    .action(async () => {
      console.log(BANNER);

      const wallet = await walletManager.getActiveWallet();
      const network = providerManager.getActiveNetwork();

      output.bold('Status:');
      output.newline();

      if (wallet) {
        const loaded = walletManager.isWalletLoaded(wallet.id);
        console.log(`  Wallet: ${chalk.yellow(wallet.id.substring(0, 8))}...${loaded ? chalk.green(' [loaded]') : chalk.dim(' [not loaded]')}`);
        console.log(chalk.dim(`  Address: ${wallet.railgunAddress.substring(0, 40)}...`));
      } else {
        console.log(`  Wallet: ${chalk.dim('None')}`);
      }

      output.newline();

      if (network) {
        console.log(`  Network: ${chalk.green(network)}`);
      } else {
        console.log(`  Network: ${chalk.dim('Not connected')}`);
      }

      output.newline();
    });

  // Handle graceful shutdown
  const cleanup = async () => {
    output.dim('\nShutting down...');
    await providerManager.unloadAll();
    await shutdownEngine();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    output.error(`Error: ${error}`);
    await cleanup();
  }
}

main().catch(async (error) => {
  output.error(`Fatal error: ${error}`);
  await shutdownEngine();
  process.exit(1);
});
