import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { WalletManager } from '../../wallet/wallet-manager.js';
import { output } from '../../utils/logger.js';

export const createWalletCommand = (walletManager: WalletManager): Command => {
  const walletCmd = new Command('wallet')
    .description('Wallet management commands');

  // Create wallet
  walletCmd
    .command('create')
    .description('Create a new wallet')
    .option('-m, --mnemonic <words>', 'Use existing mnemonic (12 or 24 words)')
    .option('-i, --index <number>', 'Derivation index', '0')
    .action(async (options) => {
      try {
        let mnemonic: string;

        if (options.mnemonic) {
          mnemonic = options.mnemonic.trim();
          if (!walletManager.validateMnemonic(mnemonic)) {
            output.error('Invalid mnemonic phrase');
            return;
          }
        } else {
          // Generate new mnemonic
          mnemonic = walletManager.generateMnemonic();

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
        }

        // Get password
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

        const wallet = await walletManager.createWallet(
          mnemonic,
          password,
          parseInt(options.index),
        );

        output.newline();
        output.success('Wallet created successfully!');
        output.info(`Wallet ID: ${wallet.id}`);
        output.info(`RAILGUN Address: ${wallet.railgunAddress}`);
        output.newline();
      } catch (error) {
        output.error(`Failed to create wallet: ${error}`);
      }
    });

  // Find wallet addresses for a mnemonic (check multiple derivation indices)
  walletCmd
    .command('find')
    .description('Find wallet addresses for a recovery phrase (checks multiple derivation indices)')
    .option('-n, --num <number>', 'Number of derivation indices to check', '5')
    .action(async (options) => {
      try {
        const { mnemonic } = await inquirer.prompt([
          {
            type: 'password',
            name: 'mnemonic',
            message: 'Enter your 12 or 24 word recovery phrase:',
            mask: '*',
            validate: (input: string) => {
              if (!walletManager.validateMnemonic(input.trim())) {
                return 'Invalid mnemonic phrase. Please enter a valid 12 or 24 word recovery phrase.';
              }
              return true;
            },
          },
        ]);

        const numIndices = parseInt(options.num);
        output.newline();
        output.bold('Checking derivation indices...');
        output.newline();

        // Use a temporary password just to generate addresses
        const tempPassword = 'temporary_password_for_address_check';

        for (let i = 0; i < numIndices; i++) {
          try {
            const wallet = await walletManager.createWallet(
              mnemonic.trim(),
              tempPassword,
              i,
            );
            console.log(`  ${chalk.yellow(`Index ${i}:`)} ${wallet.railgunAddress}`);
            // Clean up - delete the temporary wallet
            await walletManager.deleteWallet(wallet.id, tempPassword);
          } catch (error) {
            console.log(`  ${chalk.yellow(`Index ${i}:`)} ${chalk.red('Error generating')}`);
          }
        }

        output.newline();
        output.info('If you see your expected address above, use that index with:');
        output.dim('  polaris wallet import -i <index>');
        output.newline();
      } catch (error) {
        output.error(`Failed to find addresses: ${error}`);
      }
    });

  // Import wallet from mnemonic
  walletCmd
    .command('import')
    .description('Import a wallet from recovery phrase')
    .option('-i, --index <number>', 'Derivation index', '0')
    .action(async (options) => {
      try {
        const { mnemonic } = await inquirer.prompt([
          {
            type: 'password',
            name: 'mnemonic',
            message: 'Enter your 12 or 24 word recovery phrase:',
            mask: '*',
            validate: (input: string) => {
              if (!walletManager.validateMnemonic(input.trim())) {
                return 'Invalid mnemonic phrase. Please enter a valid 12 or 24 word recovery phrase.';
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

        const wallet = await walletManager.createWallet(
          mnemonic.trim(),
          password,
          parseInt(options.index),
        );

        output.newline();
        output.success('Wallet imported successfully!');
        output.info(`Wallet ID: ${wallet.id}`);
        output.info(`RAILGUN Address: ${wallet.railgunAddress}`);
        output.newline();
      } catch (error) {
        output.error(`Failed to import wallet: ${error}`);
      }
    });

  // Import view-only wallet
  walletCmd
    .command('import-view-only')
    .description('Import a view-only wallet using a viewing key')
    .action(async () => {
      try {
        const { viewingKey } = await inquirer.prompt([
          {
            type: 'input',
            name: 'viewingKey',
            message: 'Enter the shareable viewing key:',
          },
        ]);

        const { password, confirmPassword } = await inquirer.prompt([
          {
            type: 'password',
            name: 'password',
            message: 'Enter a password to encrypt the wallet:',
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

        const wallet = await walletManager.createViewOnlyWallet(viewingKey, password);

        output.newline();
        output.success('View-only wallet imported successfully!');
        output.info(`Wallet ID: ${wallet.id}`);
        output.info(`RAILGUN Address: ${wallet.railgunAddress}`);
        output.newline();
      } catch (error) {
        output.error(`Failed to import wallet: ${error}`);
      }
    });

  // List wallets
  walletCmd
    .command('list')
    .description('List all wallets')
    .action(async () => {
      try {
        const wallets = await walletManager.getAllWallets();
        const activeWallet = await walletManager.getActiveWallet();

        if (wallets.length === 0) {
          output.info('No wallets found. Create one with: polaris wallet create');
          return;
        }

        output.newline();
        output.bold('Your Wallets:');
        output.newline();

        for (const wallet of wallets) {
          const isActive = wallet.id === activeWallet?.id;
          const status = isActive ? chalk.green(' (active)') : '';
          const loaded = walletManager.isWalletLoaded(wallet.id) ? chalk.cyan(' [loaded]') : '';

          console.log(`  ${chalk.yellow(wallet.id.substring(0, 8))}...${status}${loaded}`);
          console.log(chalk.dim(`    Address: ${wallet.railgunAddress.substring(0, 30)}...`));
          console.log(chalk.dim(`    Created: ${wallet.createdAt}`));
          output.newline();
        }
      } catch (error) {
        output.error(`Failed to list wallets: ${error}`);
      }
    });

  // Load wallet
  walletCmd
    .command('load')
    .description('Load a wallet into memory')
    .argument('[wallet-id]', 'Wallet ID (uses active wallet if not specified)')
    .action(async (walletId?: string) => {
      try {
        let targetId = walletId;

        if (!targetId) {
          const active = await walletManager.getActiveWallet();
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

        await walletManager.loadWallet(targetId, password);
        output.success(`Wallet ${targetId.substring(0, 8)}... loaded successfully!`);
      } catch (error) {
        output.error(`Failed to load wallet: ${error}`);
      }
    });

  // Export mnemonic
  walletCmd
    .command('export')
    .description('Export wallet recovery phrase')
    .argument('[wallet-id]', 'Wallet ID (uses active wallet if not specified)')
    .action(async (walletId?: string) => {
      try {
        let targetId = walletId;

        if (!targetId) {
          const active = await walletManager.getActiveWallet();
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

        const mnemonic = await walletManager.exportMnemonic(targetId, password);

        output.newline();
        output.bold('=== YOUR RECOVERY PHRASE ===');
        output.newline();
        console.log(chalk.green(`  ${mnemonic}`));
        output.newline();
        output.warn('Keep this phrase private and secure!');
        output.newline();
      } catch (error) {
        output.error(`Failed to export mnemonic: ${error}`);
      }
    });

  // Get viewing key
  walletCmd
    .command('viewing-key')
    .description('Get shareable viewing key')
    .argument('[wallet-id]', 'Wallet ID (uses active wallet if not specified)')
    .action(async (walletId?: string) => {
      try {
        let targetId = walletId;

        if (!targetId) {
          const active = await walletManager.getActiveWallet();
          if (!active) {
            output.error('No active wallet.');
            return;
          }
          targetId = active.id;
        }

        if (!walletManager.isWalletLoaded(targetId)) {
          output.error('Wallet not loaded. Load it first with: polaris wallet load');
          return;
        }

        const viewingKey = await walletManager.getViewingKey(targetId);

        output.newline();
        output.bold('Shareable Viewing Key:');
        output.newline();
        console.log(chalk.cyan(viewingKey));
        output.newline();
        output.dim('Share this key to allow others to view your balances (read-only).');
        output.newline();
      } catch (error) {
        output.error(`Failed to get viewing key: ${error}`);
      }
    });

  // Set active wallet
  walletCmd
    .command('use')
    .description('Set the active wallet')
    .argument('<wallet-id>', 'Wallet ID to set as active')
    .action(async (walletId: string) => {
      try {
        await walletManager.setActiveWallet(walletId);
        output.success(`Active wallet set to ${walletId.substring(0, 8)}...`);
      } catch (error) {
        output.error(`Failed to set active wallet: ${error}`);
      }
    });

  // Delete wallet
  walletCmd
    .command('delete')
    .description('Delete a wallet permanently')
    .argument('<wallet-id>', 'Wallet ID to delete')
    .action(async (walletId: string) => {
      try {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete wallet ${walletId.substring(0, 8)}...? This cannot be undone.`,
            default: false,
          },
        ]);

        if (!confirm) {
          output.info('Deletion cancelled.');
          return;
        }

        const { password } = await inquirer.prompt([
          {
            type: 'password',
            name: 'password',
            message: 'Enter your wallet password to confirm:',
            mask: '*',
          },
        ]);

        await walletManager.deleteWallet(walletId, password);
        output.success('Wallet deleted.');
      } catch (error) {
        output.error(`Failed to delete wallet: ${error}`);
      }
    });

  return walletCmd;
};
