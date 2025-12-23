import {
  loadProvider,
  unloadProvider,
  pauseAllPollingProviders,
  resumeIsolatedPollingProviderForNetwork,
} from '@railgun-community/wallet';
import { NetworkName, LoadProviderResponse } from '@railgun-community/shared-models';
import { logger } from '../utils/logger.js';
import { getFallbackProviderConfig, NETWORK_CONFIGS } from '../core/config.js';

export class ProviderManager {
  private loadedNetworks: Set<NetworkName> = new Set();
  private activeNetwork: NetworkName | null = null;

  /**
   * Load a network provider
   */
  async loadNetwork(
    networkName: NetworkName,
    pollingInterval: number = 15000,
  ): Promise<LoadProviderResponse> {
    if (this.loadedNetworks.has(networkName)) {
      logger.warn(`Network already loaded: ${networkName}`);
      // Return cached response (dummy for now)
      return {
        feesSerialized: {
          shieldFeeV2: '0',
          unshieldFeeV2: '0',
          shieldFeeV3: undefined,
          unshieldFeeV3: undefined,
        },
      };
    }

    const config = getFallbackProviderConfig(networkName);
    if (!config) {
      throw new Error(`Unsupported network: ${networkName}`);
    }

    logger.info(`Loading provider for ${networkName}...`);

    const response = await loadProvider(config, networkName, pollingInterval);

    this.loadedNetworks.add(networkName);
    this.activeNetwork = networkName;

    logger.info(`Provider loaded for ${networkName}`);
    logger.debug(`Shield fee V2: ${response.feesSerialized.shieldFeeV2} basis points`);
    logger.debug(`Unshield fee V2: ${response.feesSerialized.unshieldFeeV2} basis points`);

    return response;
  }

  /**
   * Unload a network provider
   */
  async unloadNetwork(networkName: NetworkName): Promise<void> {
    if (!this.loadedNetworks.has(networkName)) {
      return;
    }

    logger.info(`Unloading provider for ${networkName}...`);

    await unloadProvider(networkName);
    this.loadedNetworks.delete(networkName);

    if (this.activeNetwork === networkName) {
      this.activeNetwork = this.loadedNetworks.values().next().value || null;
    }

    logger.info(`Provider unloaded for ${networkName}`);
  }

  /**
   * Switch active network
   */
  async switchNetwork(networkName: NetworkName): Promise<void> {
    if (!this.loadedNetworks.has(networkName)) {
      await this.loadNetwork(networkName);
    }

    pauseAllPollingProviders(networkName);
    resumeIsolatedPollingProviderForNetwork(networkName);

    this.activeNetwork = networkName;
    logger.info(`Switched to network: ${networkName}`);
  }

  /**
   * Get active network
   */
  getActiveNetwork(): NetworkName | null {
    return this.activeNetwork;
  }

  /**
   * Check if network is loaded
   */
  isNetworkLoaded(networkName: NetworkName): boolean {
    return this.loadedNetworks.has(networkName);
  }

  /**
   * Get all loaded networks
   */
  getLoadedNetworks(): NetworkName[] {
    return Array.from(this.loadedNetworks);
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(networkName: NetworkName) {
    return NETWORK_CONFIGS[networkName];
  }

  /**
   * Unload all networks
   */
  async unloadAll(): Promise<void> {
    for (const network of this.loadedNetworks) {
      await this.unloadNetwork(network);
    }
  }
}
