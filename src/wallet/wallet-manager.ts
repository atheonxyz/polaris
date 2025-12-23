import * as bip39 from 'bip39';
import {
  createRailgunWallet,
  createViewOnlyRailgunWallet,
  loadWalletByID,
  unloadWalletByID,
  deleteWalletByID,
  getWalletMnemonic,
  getWalletShareableViewingKey,
  getRailgunWalletAddressData,
  validateRailgunAddress,
} from '@railgun-community/wallet';
import { NetworkName } from '@railgun-community/shared-models';
import type { WalletInfo } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { deriveEncryptionKey, generateRandomHex } from '../utils/crypto.js';
import { Storage } from '../utils/storage.js';
import { getConfig } from '../core/engine.js';
import { getSupportedNetworks } from '../core/config.js';

export class WalletManager {
  private storage: Storage;
  private loadedWallets: Map<string, { encryptionKey: string }> = new Map();

  constructor() {
    const config = getConfig();
    this.storage = new Storage(config.dataDir);
  }

  /**
   * Generate a new BIP39 mnemonic
   */
  generateMnemonic(strength: 128 | 256 = 128): string {
    return bip39.generateMnemonic(strength);
  }

  /**
   * Validate a mnemonic phrase
   */
  validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Create a new wallet
   */
  async createWallet(
    mnemonic: string,
    password: string,
    derivationIndex: number = 0,
  ): Promise<WalletInfo> {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    logger.info('Creating new wallet...');

    // Derive encryption key from password
    const { key: encryptionKey, salt } = deriveEncryptionKey(password);

    // Set creation block numbers (0 means scan from beginning)
    const creationBlockNumbers: Partial<Record<string, number>> = {};
    for (const network of getSupportedNetworks()) {
      creationBlockNumbers[network] = 0;
    }

    // Create the RAILGUN wallet
    const railgunWallet = await createRailgunWallet(
      encryptionKey,
      mnemonic,
      creationBlockNumbers,
      derivationIndex,
    );

    const walletInfo: WalletInfo = {
      id: railgunWallet.id,
      railgunAddress: railgunWallet.railgunAddress,
      createdAt: new Date().toISOString(),
      networks: getSupportedNetworks(),
    };

    // Store wallet info and encryption salt
    await this.storage.addWallet(walletInfo);
    await this.storage.saveEncryptionSalt(walletInfo.id, salt);

    // Track as loaded
    this.loadedWallets.set(walletInfo.id, { encryptionKey });

    logger.info(`Wallet created: ${walletInfo.id}`);
    return walletInfo;
  }

  /**
   * Create a view-only wallet from a viewing key
   */
  async createViewOnlyWallet(
    shareableViewingKey: string,
    password: string,
  ): Promise<WalletInfo> {
    logger.info('Creating view-only wallet...');

    const { key: encryptionKey, salt } = deriveEncryptionKey(password);

    const creationBlockNumbers: Partial<Record<string, number>> = {};
    for (const network of getSupportedNetworks()) {
      creationBlockNumbers[network] = 0;
    }

    const railgunWallet = await createViewOnlyRailgunWallet(
      encryptionKey,
      shareableViewingKey,
      creationBlockNumbers,
    );

    const walletInfo: WalletInfo = {
      id: railgunWallet.id,
      railgunAddress: railgunWallet.railgunAddress,
      createdAt: new Date().toISOString(),
      networks: getSupportedNetworks(),
    };

    await this.storage.addWallet(walletInfo);
    await this.storage.saveEncryptionSalt(walletInfo.id, salt);

    this.loadedWallets.set(walletInfo.id, { encryptionKey });

    logger.info(`View-only wallet created: ${walletInfo.id}`);
    return walletInfo;
  }

  /**
   * Load an existing wallet
   */
  async loadWallet(walletId: string, password: string): Promise<WalletInfo> {
    const walletInfo = await this.storage.getWalletById(walletId);
    if (!walletInfo) {
      throw new Error(`Wallet not found: ${walletId}`);
    }

    logger.info(`Loading wallet: ${walletId}`);

    // Get stored salt and derive key
    const salt = await this.storage.getEncryptionSalt(walletId);
    if (!salt) {
      throw new Error('Encryption salt not found for wallet');
    }

    const { key: encryptionKey } = deriveEncryptionKey(password, salt);

    // Load wallet into RAILGUN engine
    await loadWalletByID(encryptionKey, walletId, false);

    this.loadedWallets.set(walletId, { encryptionKey });

    logger.info(`Wallet loaded: ${walletId}`);
    return walletInfo;
  }

  /**
   * Unload a wallet from memory
   */
  async unloadWallet(walletId: string): Promise<void> {
    if (!this.loadedWallets.has(walletId)) {
      return;
    }

    await unloadWalletByID(walletId);
    this.loadedWallets.delete(walletId);

    logger.info(`Wallet unloaded: ${walletId}`);
  }

  /**
   * Delete a wallet permanently
   */
  async deleteWallet(walletId: string, password: string): Promise<void> {
    const salt = await this.storage.getEncryptionSalt(walletId);
    if (!salt) {
      throw new Error('Wallet not found');
    }

    const { key: encryptionKey } = deriveEncryptionKey(password, salt);

    // First load the wallet to verify password
    await loadWalletByID(encryptionKey, walletId, false);

    // Delete from RAILGUN engine
    await deleteWalletByID(walletId);

    // Remove from storage
    await this.storage.removeWallet(walletId);
    this.loadedWallets.delete(walletId);

    logger.info(`Wallet deleted: ${walletId}`);
  }

  /**
   * Export wallet mnemonic
   */
  async exportMnemonic(walletId: string, password: string): Promise<string> {
    const salt = await this.storage.getEncryptionSalt(walletId);
    if (!salt) {
      throw new Error('Wallet not found');
    }

    const { key: encryptionKey } = deriveEncryptionKey(password, salt);

    // Ensure wallet is loaded
    if (!this.loadedWallets.has(walletId)) {
      await loadWalletByID(encryptionKey, walletId, false);
    }

    const mnemonic = await getWalletMnemonic(encryptionKey, walletId);
    return mnemonic;
  }

  /**
   * Get shareable viewing key
   */
  async getViewingKey(walletId: string): Promise<string> {
    if (!this.loadedWallets.has(walletId)) {
      throw new Error('Wallet not loaded');
    }

    return await getWalletShareableViewingKey(walletId);
  }

  /**
   * Get all wallets
   */
  async getAllWallets(): Promise<WalletInfo[]> {
    return await this.storage.getAllWallets();
  }

  /**
   * Get active wallet
   */
  async getActiveWallet(): Promise<WalletInfo | null> {
    return await this.storage.getActiveWallet();
  }

  /**
   * Get active wallet synchronously (uses cached data)
   */
  getActiveWalletSync(): WalletInfo | null {
    return this.storage.getActiveWalletSync();
  }

  /**
   * Set active wallet
   */
  async setActiveWallet(walletId: string): Promise<void> {
    await this.storage.setActiveWallet(walletId);
  }

  /**
   * Check if wallet is loaded
   */
  isWalletLoaded(walletId: string): boolean {
    return this.loadedWallets.has(walletId);
  }

  /**
   * Get loaded wallet's encryption key (internal use)
   */
  getWalletEncryptionKey(walletId: string): string | null {
    const wallet = this.loadedWallets.get(walletId);
    return wallet?.encryptionKey || null;
  }

  /**
   * Validate a RAILGUN address
   */
  validateAddress(address: string): boolean {
    try {
      return validateRailgunAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Parse RAILGUN address data
   */
  parseAddress(address: string): { masterPublicKey: bigint; viewingPublicKey: Uint8Array } | null {
    try {
      const data = getRailgunWalletAddressData(address);
      return data;
    } catch {
      return null;
    }
  }
}
