import chalk from 'chalk';
import inquirer from 'inquirer';
import { NetworkName, TXIDVersion } from '@railgun-community/shared-models';
import {
  initializeEngine,
  shutdownEngine,
  isEngineInitialized,
  getScanState,
  isUTXOScanComplete,
  MerkletreeScanStatus,
  type ScanState,
} from '../core/engine.js';
import { WalletManager } from '../wallet/wallet-manager.js';
import { ProviderManager } from '../network/provider-manager.js';
import { BalanceService } from '../transactions/balance-service.js';
import { TransactionService } from '../transactions/transaction-service.js';
import { getSupportedNetworks, NETWORK_CONFIGS } from '../core/config.js';
import { output, setLogLevel } from '../utils/logger.js';

const VERSION = '1.0.0';

const BANNER = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('POLARIS')} - Privacy-First Wallet                           ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.dim('Powered by RAILGUN')}                                       ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`;

interface REPLContext {
  walletManager: WalletManager;
  providerManager: ProviderManager;
  balanceService: BalanceService;
  transactionService: TransactionService;
  debug: boolean;
}

type CommandHandler = (args: string[], ctx: REPLContext) => Promise<void>;

interface Command {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  handler: CommandHandler;
}

// Helper to ensure wallet is loaded, prompting for password if needed
const ensureWalletLoaded = async (
  walletManager: WalletManager,
  walletId: string,
): Promise<boolean> => {
  if (walletManager.isWalletLoaded(walletId)) {
    return true;
  }

  output.info('Wallet not loaded. Enter password to load it:');
  const { password } = await inquirer.prompt([
    {
      type: 'password',
      name: 'password',
      message: 'Wallet password:',
      mask: '*',
    },
  ]);

  try {
    await walletManager.loadWallet(walletId, password);
    output.success('Wallet loaded!');
    return true;
  } catch (err) {
    output.error(`Failed to load wallet: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return false;
  }
};

// Help text formatting
const formatHelp = (commands: Command[]): void => {
  output.newline();
  output.bold('Available Commands:');
  output.newline();

  const categories: Record<string, Command[]> = {
    wallet: [],
    network: [],
    balance: [],
    general: [],
  };

  for (const cmd of commands) {
    if (cmd.name.startsWith('wallet')) categories.wallet.push(cmd);
    else if (cmd.name.startsWith('network')) categories.network.push(cmd);
    else if (cmd.name.startsWith('balance')) categories.balance.push(cmd);
    else categories.general.push(cmd);
  }

  const printCategory = (name: string, cmds: Command[]) => {
    if (cmds.length === 0) return;
    console.log(chalk.cyan(`  ${name.toUpperCase()}`));
    for (const cmd of cmds) {
      const aliases = cmd.aliases ? chalk.dim(` (${cmd.aliases.join(', ')})`) : '';
      console.log(`    ${chalk.yellow(cmd.name)}${aliases}`);
      console.log(chalk.dim(`      ${cmd.description}`));
      if (cmd.usage) {
        console.log(chalk.dim(`      Usage: ${cmd.usage}`));
      }
    }
    output.newline();
  };

  printCategory('general', categories.general);
  printCategory('wallet', categories.wallet);
  printCategory('network', categories.network);
  printCategory('balance', categories.balance);
};

// Build the prompt string with context
const buildPrompt = (ctx: REPLContext): string => {
  const parts: string[] = [];

  // Network indicator
  const network = ctx.providerManager.getActiveNetwork();
  if (network) {
    parts.push(chalk.green(network.substring(0, 3).toUpperCase()));
  } else {
    parts.push(chalk.dim('---'));
  }

  // Wallet indicator
  const wallet = ctx.walletManager.getActiveWalletSync();
  if (wallet) {
    const loaded = ctx.walletManager.isWalletLoaded(wallet.id);
    const addr = wallet.railgunAddress.substring(0, 12);
    if (loaded) {
      parts.push(chalk.cyan(addr));
    } else {
      parts.push(chalk.dim(addr));
    }
  }

  const contextStr = parts.length > 0 ? `[${parts.join(' ')}]` : '';
  return `${chalk.bold.white('polaris')} ${contextStr} ${chalk.cyan('>')} `;
};

// Command definitions
const createCommands = (): Command[] => {
  const commands: Command[] = [];

  // General commands
  commands.push({
    name: 'help',
    aliases: ['h', '?'],
    description: 'Show this help message',
    handler: async (_args, _ctx) => {
      formatHelp(commands);
    },
  });

  commands.push({
    name: 'status',
    aliases: ['st'],
    description: 'Show current wallet and network status',
    handler: async (_args, ctx) => {
      output.newline();
      output.bold('Status:');
      output.newline();

      const wallet = await ctx.walletManager.getActiveWallet();
      if (wallet) {
        const loaded = ctx.walletManager.isWalletLoaded(wallet.id);
        const loadedStr = loaded ? chalk.green('[loaded]') : chalk.dim('[not loaded]');
        console.log(`  ${chalk.dim('Wallet:')} ${chalk.yellow(wallet.id.substring(0, 8))}... ${loadedStr}`);
        console.log(`  ${chalk.dim('Address:')} ${wallet.railgunAddress.substring(0, 50)}...`);
      } else {
        console.log(`  ${chalk.dim('Wallet:')} ${chalk.dim('None - create with "wallet create"')}`);
      }

      output.newline();

      const network = ctx.providerManager.getActiveNetwork();
      if (network) {
        console.log(`  ${chalk.dim('Network:')} ${chalk.green(network)}`);
        const config = NETWORK_CONFIGS[network];
        if (config) {
          console.log(`  ${chalk.dim('Chain ID:')} ${config.chainId}`);
        }
      } else {
        console.log(`  ${chalk.dim('Network:')} ${chalk.dim('Not connected - use "network connect"')}`);
      }

      output.newline();
    },
  });

  commands.push({
    name: 'clear',
    aliases: ['cls'],
    description: 'Clear the screen',
    handler: async () => {
      console.clear();
      console.log(BANNER);
    },
  });

  commands.push({
    name: 'exit',
    aliases: ['quit', 'q'],
    description: 'Exit Polaris',
    handler: async () => {
      // Handled specially in the REPL loop
    },
  });

  // Wallet commands
  commands.push({
    name: 'wallet create',
    aliases: ['wc'],
    description: 'Create a new wallet',
    handler: async (_args, ctx) => {
      const mnemonic = ctx.walletManager.generateMnemonic();

      output.newline();
      output.bold('=== IMPORTANT: BACKUP YOUR RECOVERY PHRASE ===');
      output.newline();
      console.log(chalk.green(`  ${mnemonic}`));
      output.newline();
      output.warn('Write this down and store it safely.');
      output.warn('Anyone with this phrase can access your funds.');
      output.newline();

      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'I have written down my recovery phrase',
          default: false,
        },
      ]);

      if (!confirmed) {
        output.error('You must backup your recovery phrase before continuing.');
        return;
      }

      const { password, confirmPassword } = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'Enter a password to encrypt your wallet:',
          mask: '*',
          validate: (input: string) => input.length >= 8 || 'Password must be at least 8 characters',
        },
        {
          type: 'password',
          name: 'confirmPassword',
          message: 'Confirm your password:',
          mask: '*',
        },
      ]);

      if (password !== confirmPassword) {
        output.error('Passwords do not match.');
        return;
      }

      const wallet = await ctx.walletManager.createWallet(mnemonic, password, 0);

      output.newline();
      output.success('Wallet created successfully!');
      output.info(`Wallet ID: ${wallet.id}`);
      output.info(`RAILGUN Address: ${wallet.railgunAddress}`);
      output.newline();
    },
  });

  commands.push({
    name: 'wallet import',
    aliases: ['wi'],
    description: 'Import a wallet from recovery phrase',
    usage: 'wallet import [--index <n>]',
    handler: async (args, ctx) => {
      let derivationIndex = 0;
      const indexArg = args.indexOf('--index');
      if (indexArg !== -1 && args[indexArg + 1]) {
        derivationIndex = parseInt(args[indexArg + 1]) || 0;
      }

      const { mnemonic } = await inquirer.prompt([
        {
          type: 'password',
          name: 'mnemonic',
          message: 'Enter your 12 or 24 word recovery phrase:',
          mask: '*',
          validate: (input: string) => {
            if (!ctx.walletManager.validateMnemonic(input.trim())) {
              return 'Invalid mnemonic phrase.';
            }
            return true;
          },
        },
      ]);

      const { password, confirmPassword } = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'Enter a password to encrypt your wallet:',
          mask: '*',
          validate: (input: string) => input.length >= 8 || 'Password must be at least 8 characters',
        },
        {
          type: 'password',
          name: 'confirmPassword',
          message: 'Confirm your password:',
          mask: '*',
        },
      ]);

      if (password !== confirmPassword) {
        output.error('Passwords do not match.');
        return;
      }

      const wallet = await ctx.walletManager.createWallet(
        mnemonic.trim(),
        password,
        derivationIndex,
      );

      output.newline();
      output.success('Wallet imported successfully!');
      output.info(`Wallet ID: ${wallet.id}`);
      output.info(`RAILGUN Address: ${wallet.railgunAddress}`);
      output.newline();
    },
  });

  commands.push({
    name: 'wallet list',
    aliases: ['wl'],
    description: 'List all wallets',
    handler: async (_args, ctx) => {
      const wallets = await ctx.walletManager.getAllWallets();
      const activeWallet = await ctx.walletManager.getActiveWallet();

      if (wallets.length === 0) {
        output.info('No wallets found. Create one with: wallet create');
        return;
      }

      output.newline();
      output.bold('Your Wallets:');
      output.newline();

      for (const wallet of wallets) {
        const isActive = wallet.id === activeWallet?.id;
        const status = isActive ? chalk.green(' (active)') : '';
        const loaded = ctx.walletManager.isWalletLoaded(wallet.id) ? chalk.cyan(' [loaded]') : '';

        console.log(`  ${chalk.yellow(wallet.id.substring(0, 8))}...${status}${loaded}`);
        console.log(chalk.dim(`    Address: ${wallet.railgunAddress.substring(0, 30)}...`));
        console.log(chalk.dim(`    Created: ${wallet.createdAt}`));
        output.newline();
      }
    },
  });

  commands.push({
    name: 'wallet load',
    aliases: ['wload'],
    description: 'Load a wallet into memory',
    usage: 'wallet load [wallet-id]',
    handler: async (args, ctx) => {
      let targetId = args[0];

      if (!targetId) {
        const active = await ctx.walletManager.getActiveWallet();
        if (!active) {
          output.error('No active wallet. Specify a wallet ID or create a wallet first.');
          return;
        }
        targetId = active.id;
      }

      const { password } = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'Enter your wallet password:',
          mask: '*',
        },
      ]);

      await ctx.walletManager.loadWallet(targetId, password);
      output.success(`Wallet ${targetId.substring(0, 8)}... loaded successfully!`);
    },
  });

  commands.push({
    name: 'wallet use',
    aliases: ['wu'],
    description: 'Set the active wallet',
    usage: 'wallet use <wallet-id>',
    handler: async (args, ctx) => {
      if (!args[0]) {
        output.error('Please specify a wallet ID.');
        return;
      }

      await ctx.walletManager.setActiveWallet(args[0]);
      output.success(`Active wallet set to ${args[0].substring(0, 8)}...`);
    },
  });

  commands.push({
    name: 'wallet export',
    aliases: ['we'],
    description: 'Export wallet recovery phrase',
    usage: 'wallet export [wallet-id]',
    handler: async (args, ctx) => {
      let targetId = args[0];

      if (!targetId) {
        const active = await ctx.walletManager.getActiveWallet();
        if (!active) {
          output.error('No active wallet. Specify a wallet ID.');
          return;
        }
        targetId = active.id;
      }

      const { password } = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'Enter your wallet password:',
          mask: '*',
        },
      ]);

      const mnemonic = await ctx.walletManager.exportMnemonic(targetId, password);

      output.newline();
      output.bold('=== YOUR RECOVERY PHRASE ===');
      output.newline();
      console.log(chalk.green(`  ${mnemonic}`));
      output.newline();
      output.warn('Keep this phrase private and secure!');
      output.newline();
    },
  });

  commands.push({
    name: 'wallet find',
    aliases: ['wf'],
    description: 'Find wallet addresses for a recovery phrase',
    usage: 'wallet find [--num <count>]',
    handler: async (args, ctx) => {
      let numIndices = 5;
      const numArg = args.indexOf('--num');
      if (numArg !== -1 && args[numArg + 1]) {
        numIndices = parseInt(args[numArg + 1]) || 5;
      }

      const { mnemonic } = await inquirer.prompt([
        {
          type: 'password',
          name: 'mnemonic',
          message: 'Enter your 12 or 24 word recovery phrase:',
          mask: '*',
          validate: (input: string) => {
            if (!ctx.walletManager.validateMnemonic(input.trim())) {
              return 'Invalid mnemonic phrase.';
            }
            return true;
          },
        },
      ]);

      output.newline();
      output.bold('Checking derivation indices...');
      output.newline();

      const tempPassword = 'temporary_password_for_address_check';

      for (let i = 0; i < numIndices; i++) {
        try {
          const wallet = await ctx.walletManager.createWallet(mnemonic.trim(), tempPassword, i);
          console.log(`  ${chalk.yellow(`Index ${i}:`)} ${wallet.railgunAddress}`);
          await ctx.walletManager.deleteWallet(wallet.id, tempPassword);
        } catch {
          console.log(`  ${chalk.yellow(`Index ${i}:`)} ${chalk.red('Error generating')}`);
        }
      }

      output.newline();
      output.info('If you see your expected address above, use that index with:');
      output.dim('  wallet import --index <index>');
      output.newline();
    },
  });

  // Network commands
  commands.push({
    name: 'network list',
    aliases: ['nl'],
    description: 'List available networks',
    handler: async (_args, ctx) => {
      const supported = getSupportedNetworks();
      const loaded = ctx.providerManager.getLoadedNetworks();
      const active = ctx.providerManager.getActiveNetwork();

      output.newline();
      output.bold('Available Networks:');
      output.newline();

      for (const networkName of supported) {
        const config = NETWORK_CONFIGS[networkName];
        if (!config) continue;

        const isLoaded = loaded.includes(networkName);
        const isActive = networkName === active;

        const status = isActive
          ? chalk.green(' (active)')
          : isLoaded
          ? chalk.cyan(' [connected]')
          : '';

        console.log(`  ${chalk.yellow(networkName)}${status}`);
        console.log(chalk.dim(`    Chain ID: ${config.chainId}`));
        output.newline();
      }
    },
  });

  commands.push({
    name: 'network connect',
    aliases: ['nc'],
    description: 'Connect to a network',
    usage: 'network connect [network-name]',
    handler: async (args, ctx) => {
      let networkName: NetworkName;

      if (args[0]) {
        if (!getSupportedNetworks().includes(args[0] as NetworkName)) {
          output.error(`Unsupported network: ${args[0]}`);
          return;
        }
        networkName = args[0] as NetworkName;
      } else {
        const { selectedNetwork } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedNetwork',
            message: 'Select a network:',
            choices: getSupportedNetworks().map(n => ({
              name: `${n} (Chain ID: ${NETWORK_CONFIGS[n]?.chainId})`,
              value: n,
            })),
          },
        ]);
        networkName = selectedNetwork;
      }

      output.info(`Connecting to ${networkName}...`);
      const response = await ctx.providerManager.loadNetwork(networkName);

      output.success(`Connected to ${networkName}`);
      output.dim(`  Shield fee: ${response.feesSerialized.shieldFeeV2} basis points`);
      output.dim(`  Unshield fee: ${response.feesSerialized.unshieldFeeV2} basis points`);
    },
  });

  commands.push({
    name: 'network disconnect',
    aliases: ['nd'],
    description: 'Disconnect from a network',
    usage: 'network disconnect [network-name]',
    handler: async (args, ctx) => {
      const loaded = ctx.providerManager.getLoadedNetworks();

      if (loaded.length === 0) {
        output.info('No networks connected.');
        return;
      }

      let networkName: NetworkName;

      if (args[0]) {
        if (!loaded.includes(args[0] as NetworkName)) {
          output.error(`Network not connected: ${args[0]}`);
          return;
        }
        networkName = args[0] as NetworkName;
      } else {
        const { selectedNetwork } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedNetwork',
            message: 'Select a network to disconnect:',
            choices: loaded.map(n => ({ name: n, value: n })),
          },
        ]);
        networkName = selectedNetwork;
      }

      await ctx.providerManager.unloadNetwork(networkName);
      output.success(`Disconnected from ${networkName}`);
    },
  });

  commands.push({
    name: 'network switch',
    aliases: ['ns'],
    description: 'Switch active network',
    usage: 'network switch [network-name]',
    handler: async (args, ctx) => {
      let networkName: NetworkName;

      if (args[0]) {
        networkName = args[0] as NetworkName;
      } else {
        const supported = getSupportedNetworks();
        const { selectedNetwork } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedNetwork',
            message: 'Select a network:',
            choices: supported.map(n => {
              const loaded = ctx.providerManager.isNetworkLoaded(n);
              return {
                name: `${n}${loaded ? chalk.cyan(' [connected]') : ''}`,
                value: n,
              };
            }),
          },
        ]);
        networkName = selectedNetwork;
      }

      await ctx.providerManager.switchNetwork(networkName);
      output.success(`Switched to ${networkName}`);
    },
  });

  // Sync command
  commands.push({
    name: 'sync',
    aliases: ['sy'],
    description: 'Show sync status or wait for sync to complete',
    usage: 'sync [--wait]',
    handler: async (args, ctx) => {
      const network = ctx.providerManager.getActiveNetwork();
      if (!network) {
        output.error('No network connected. Connect with: network connect');
        return;
      }

      const config = NETWORK_CONFIGS[network];
      if (!config) {
        output.error('Network config not found');
        return;
      }

      const chainId = config.chainId;
      const state = getScanState(chainId);

      const formatStatus = (status: MerkletreeScanStatus, progress: number): string => {
        const percent = Math.round(progress * 100);
        switch (status) {
          case MerkletreeScanStatus.Started:
            return chalk.yellow(`Starting...`);
          case MerkletreeScanStatus.Updated:
            return chalk.cyan(`${percent}%`);
          case MerkletreeScanStatus.Complete:
            return chalk.green(`Complete`);
          case MerkletreeScanStatus.Incomplete:
            return chalk.red(`Incomplete`);
          default:
            return chalk.dim('Unknown');
        }
      };

      output.newline();
      output.bold(`Sync Status for ${chalk.cyan(network)}:`);
      output.newline();

      if (!state) {
        // No active scan data - likely already synced from cache
        output.success('Data appears to be synced (using cached merkletrees).');
        output.dim('  If balances show incorrectly, try: br --full');
        output.newline();
        return;
      }

      console.log(`  UTXO Merkletree: ${formatStatus(state.utxoStatus, state.utxoProgress)}`);
      console.log(`  TXID Merkletree: ${formatStatus(state.txidStatus, state.txidProgress)}`);
      output.newline();

      const shouldWait = args.includes('--wait') || args.includes('-w');

      if (shouldWait && state.utxoStatus !== MerkletreeScanStatus.Complete) {
        output.info('Waiting for UTXO sync to complete...');
        output.dim('  This may take a few minutes on first run.');
        output.newline();

        // Poll until complete
        while (!isUTXOScanComplete(chainId)) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const currentState = getScanState(chainId);
          if (currentState) {
            const percent = Math.round(currentState.utxoProgress * 100);
            process.stdout.write(`\r  Progress: ${percent}%   `);
          }
        }
        console.log();
        output.success('UTXO sync complete! You can now check balances.');
      } else if (state.utxoStatus === MerkletreeScanStatus.Complete) {
        output.success('Sync complete. Ready for balance queries.');
      } else {
        output.info('Sync in progress. Use "sync --wait" to wait for completion.');
      }
      output.newline();
    },
  });

  // Balance commands
  commands.push({
    name: 'balance',
    aliases: ['bal', 'b'],
    description: 'Show private (shielded) balances',
    usage: 'balance [--no-refresh]',
    handler: async (args, ctx) => {
      const wallet = await ctx.walletManager.getActiveWallet();
      if (!wallet) {
        output.error('No active wallet. Create or load one first.');
        return;
      }

      if (!(await ensureWalletLoaded(ctx.walletManager, wallet.id))) {
        return;
      }

      const network = ctx.providerManager.getActiveNetwork();
      if (!network) {
        output.error('No network connected. Connect with: network connect');
        return;
      }

      const skipRefresh = args.includes('--no-refresh') || args.includes('-n');

      if (!skipRefresh) {
        output.info('Syncing balances...');
        await ctx.balanceService.refreshBalances(wallet.id, network);
      }

      output.info(`Fetching balances for ${network}...`);
      const balances = await ctx.balanceService.getBalances(
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
          const displayName = token.symbol
            ? chalk.yellow(token.symbol)
            : chalk.dim(token.tokenAddress.substring(0, 10) + '...');
          const addressHint = token.symbol
            ? chalk.dim(` (${token.tokenAddress.substring(0, 10)}...)`)
            : '';
          console.log(`  ${displayName}${addressHint}`);
          console.log(`    Balance: ${chalk.green(formattedBalance)}`);
        }
      }

      output.newline();
    },
  });

  commands.push({
    name: 'balance refresh',
    aliases: ['br'],
    description: 'Refresh wallet balances from blockchain',
    usage: 'balance refresh [--full]',
    handler: async (args, ctx) => {
      const wallet = await ctx.walletManager.getActiveWallet();
      if (!wallet) {
        output.error('No active wallet.');
        return;
      }

      if (!(await ensureWalletLoaded(ctx.walletManager, wallet.id))) {
        return;
      }

      const network = ctx.providerManager.getActiveNetwork();
      if (!network) {
        output.error('No network connected.');
        return;
      }

      const fullScan = args.includes('--full');
      output.info(`Refreshing balances${fullScan ? ' (full scan)' : ''}...`);

      if (fullScan) {
        await ctx.balanceService.fullRescan(wallet.id, network);
      } else {
        await ctx.balanceService.refreshBalances(wallet.id, network);
      }

      output.success('Balances refreshed!');
    },
  });

  commands.push({
    name: 'history',
    aliases: ['hist'],
    description: 'Show transaction history',
    usage: 'history [--limit <n>]',
    handler: async (args, ctx) => {
      const wallet = await ctx.walletManager.getActiveWallet();
      if (!wallet) {
        output.error('No active wallet.');
        return;
      }

      if (!(await ensureWalletLoaded(ctx.walletManager, wallet.id))) {
        return;
      }

      const network = ctx.providerManager.getActiveNetwork();
      if (!network) {
        output.error('No network connected.');
        return;
      }

      let limit = 10;
      const limitArg = args.indexOf('--limit');
      if (limitArg !== -1 && args[limitArg + 1]) {
        limit = parseInt(args[limitArg + 1]) || 10;
      }

      output.info('Fetching transaction history...');
      const history = await ctx.balanceService.getTransactionHistory(wallet.id, network);

      output.newline();
      output.bold(`Transaction History on ${chalk.cyan(network)}:`);
      output.newline();

      if (!history || history.length === 0) {
        output.dim('  No transactions found.');
      } else {
        const displayHistory = history.slice(0, limit);
        for (const tx of displayHistory) {
          console.log(chalk.dim(JSON.stringify(tx, null, 2)));
        }

        if (history.length > limit) {
          output.dim(`  ... and ${history.length - limit} more transactions`);
        }
      }

      output.newline();
    },
  });

  return commands;
};

// Helper function to format balance
function formatBalance(balance: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 6);
  return `${integerPart}.${fractionalStr}`;
}

// Parse command input
const parseInput = (input: string): { command: string; args: string[] } => {
  const parts = input.trim().split(/\s+/);

  // Handle two-word commands like "wallet create"
  if (parts.length >= 2) {
    const twoWord = `${parts[0]} ${parts[1]}`;
    return { command: twoWord, args: parts.slice(2) };
  }

  return { command: parts[0] || '', args: parts.slice(1) };
};

// Find matching command
const findCommand = (input: string, commands: Command[]): { cmd: Command; args: string[] } | null => {
  const { command, args } = parseInput(input);

  if (!command) return null;

  // Try exact match on two-word command
  for (const cmd of commands) {
    if (cmd.name === command || cmd.aliases?.includes(command)) {
      return { cmd, args };
    }
  }

  // Try single word match (for commands like "status", "help", etc.)
  const singleWord = input.trim().split(/\s+/)[0];
  const restArgs = input.trim().split(/\s+/).slice(1);

  for (const cmd of commands) {
    if (cmd.name === singleWord || cmd.aliases?.includes(singleWord)) {
      return { cmd, args: restArgs };
    }
  }

  return null;
};

// Main REPL loop
export const startREPL = async (options: { debug?: boolean } = {}): Promise<void> => {
  // Suppress LEVEL_LEGACY warnings from the LevelDB library
  const originalEmit = process.emit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process as any).emit = function (event: string, ...args: any[]) {
    if (event === 'warning' && args[0]?.message?.includes('LEVEL_LEGACY')) {
      return false;
    }
    return originalEmit.apply(process, [event, ...args] as Parameters<typeof originalEmit>);
  };

  // Also suppress LEVEL_LEGACY errors that get written to stderr
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process.stderr as any).write = (chunk: any, encoding?: any, callback?: any): boolean => {
    const str = typeof chunk === 'string' ? chunk : chunk.toString();
    if (str.includes('LEVEL_LEGACY')) {
      return true; // Suppress
    }
    return originalStderrWrite(chunk, encoding, callback);
  };

  console.log(BANNER);

  if (options.debug) {
    setLogLevel('debug');
  }

  output.info('Initializing Polaris engine...');

  try {
    await initializeEngine({ debug: options.debug });
  } catch (error) {
    output.error(`Failed to initialize engine: ${error}`);
    process.exit(1);
  }

  output.success('Engine initialized');
  output.newline();

  // Create context
  const ctx: REPLContext = {
    walletManager: new WalletManager(),
    providerManager: new ProviderManager(),
    balanceService: new BalanceService(),
    transactionService: new TransactionService(),
    debug: options.debug || false,
  };

  const commands = createCommands();

  // Auto-connect to Ethereum mainnet on startup
  try {
    output.info('Connecting to Ethereum...');
    const response = await ctx.providerManager.loadNetwork(NetworkName.Ethereum);
    output.success('Connected to Ethereum');
    output.dim(`  Shield fee: ${response.feesSerialized.shieldFeeV2} basis points`);
    output.dim(`  Unshield fee: ${response.feesSerialized.unshieldFeeV2} basis points`);
    output.newline();
  } catch (error) {
    output.warn(`Failed to auto-connect to Ethereum: ${error instanceof Error ? error.message : 'Unknown error'}`);
    output.dim('  Use "nc" to connect to a network manually.');
    output.newline();
  }

  output.dim('Type "help" for available commands, "exit" to quit.');
  output.newline();

  let running = true;

  const runREPL = async () => {
    while (running) {
      try {
        // Use inquirer for consistent prompt handling
        const { input } = await inquirer.prompt([
          {
            type: 'input',
            name: 'input',
            message: buildPrompt(ctx),
            prefix: '',
          },
        ]);

        const trimmed = (input || '').trim();

        if (!trimmed) {
          continue;
        }

        // Check for exit
        if (['exit', 'quit', 'q'].includes(trimmed.toLowerCase())) {
          running = false;
          output.dim('Shutting down...');
          await ctx.providerManager.unloadAll();
          await shutdownEngine();
          process.exit(0);
        }

        // Find and execute command
        const match = findCommand(trimmed, commands);

        if (!match) {
          output.error(`Unknown command: ${trimmed.split(/\s+/)[0]}`);
          output.dim('Type "help" for available commands.');
          output.newline();
          continue;
        }

        try {
          await match.cmd.handler(match.args, ctx);
        } catch (error) {
          output.error(`Error: ${error}`);
        }

        output.newline();
      } catch (error) {
        // Handle Ctrl+C or other interrupts
        if ((error as any)?.name === 'ExitPromptError' || (error as Error)?.message?.includes('closed')) {
          running = false;
          output.newline();
          output.dim('Shutting down...');
          await ctx.providerManager.unloadAll();
          await shutdownEngine();
          process.exit(0);
        }
        throw error;
      }
    }
  };

  // Handle SIGINT
  process.on('SIGINT', async () => {
    if (running) {
      running = false;
      output.newline();
      output.dim('Shutting down...');
      await ctx.providerManager.unloadAll();
      await shutdownEngine();
    }
    process.exit(0);
  });

  await runREPL();
};
