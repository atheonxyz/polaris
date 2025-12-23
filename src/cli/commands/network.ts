import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { NetworkName } from '@railgun-community/shared-models';
import { ProviderManager } from '../../network/provider-manager.js';
import { getSupportedNetworks, NETWORK_CONFIGS } from '../../core/config.js';
import { output } from '../../utils/logger.js';

export const createNetworkCommand = (providerManager: ProviderManager): Command => {
  const networkCmd = new Command('network')
    .description('Network management commands');

  // List available networks
  networkCmd
    .command('list')
    .description('List available networks')
    .action(async () => {
      const supported = getSupportedNetworks();
      const loaded = providerManager.getLoadedNetworks();
      const active = providerManager.getActiveNetwork();

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
        if (config.explorerUrl) {
          console.log(chalk.dim(`    Explorer: ${config.explorerUrl}`));
        }
        output.newline();
      }
    });

  // Connect to a network
  networkCmd
    .command('connect')
    .description('Connect to a network')
    .argument('[network]', 'Network name')
    .action(async (network?: string) => {
      try {
        let networkName: NetworkName;

        if (network) {
          if (!getSupportedNetworks().includes(network as NetworkName)) {
            output.error(`Unsupported network: ${network}`);
            return;
          }
          networkName = network as NetworkName;
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
        const response = await providerManager.loadNetwork(networkName);

        output.success(`Connected to ${networkName}`);
        output.dim(`  Shield fee: ${response.feesSerialized.shieldFeeV2} basis points`);
        output.dim(`  Unshield fee: ${response.feesSerialized.unshieldFeeV2} basis points`);
      } catch (error) {
        output.error(`Failed to connect: ${error}`);
      }
    });

  // Disconnect from a network
  networkCmd
    .command('disconnect')
    .description('Disconnect from a network')
    .argument('[network]', 'Network name')
    .action(async (network?: string) => {
      try {
        const loaded = providerManager.getLoadedNetworks();

        if (loaded.length === 0) {
          output.info('No networks connected.');
          return;
        }

        let networkName: NetworkName;

        if (network) {
          if (!loaded.includes(network as NetworkName)) {
            output.error(`Network not connected: ${network}`);
            return;
          }
          networkName = network as NetworkName;
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

        await providerManager.unloadNetwork(networkName);
        output.success(`Disconnected from ${networkName}`);
      } catch (error) {
        output.error(`Failed to disconnect: ${error}`);
      }
    });

  // Switch active network
  networkCmd
    .command('switch')
    .description('Switch active network')
    .argument('[network]', 'Network name')
    .action(async (network?: string) => {
      try {
        let networkName: NetworkName;

        if (network) {
          networkName = network as NetworkName;
        } else {
          const supported = getSupportedNetworks();
          const { selectedNetwork } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedNetwork',
              message: 'Select a network:',
              choices: supported.map(n => {
                const loaded = providerManager.isNetworkLoaded(n);
                return {
                  name: `${n}${loaded ? chalk.cyan(' [connected]') : ''}`,
                  value: n,
                };
              }),
            },
          ]);
          networkName = selectedNetwork;
        }

        await providerManager.switchNetwork(networkName);
        output.success(`Switched to ${networkName}`);
      } catch (error) {
        output.error(`Failed to switch network: ${error}`);
      }
    });

  // Show current network status
  networkCmd
    .command('status')
    .description('Show current network status')
    .action(async () => {
      const active = providerManager.getActiveNetwork();
      const loaded = providerManager.getLoadedNetworks();

      output.newline();

      if (!active) {
        output.warn('No active network. Connect with: polaris network connect');
        return;
      }

      output.bold(`Active Network: ${chalk.green(active)}`);
      output.newline();

      if (loaded.length > 1) {
        output.info('Other connected networks:');
        for (const n of loaded) {
          if (n !== active) {
            console.log(`  - ${n}`);
          }
        }
      }

      const config = NETWORK_CONFIGS[active];
      if (config) {
        output.newline();
        output.dim(`Chain ID: ${config.chainId}`);
        if (config.explorerUrl) {
          output.dim(`Explorer: ${config.explorerUrl}`);
        }
      }

      output.newline();
    });

  return networkCmd;
};
