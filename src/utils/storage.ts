import fs from 'fs';
import path from 'path';
import type { StoredWalletData, WalletInfo } from '../types/index.js';

const WALLET_DATA_FILE = 'wallets.json';

export class Storage {
  private dataDir: string;
  private cachedData: StoredWalletData | null = null;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  private getFilePath(filename: string): string {
    return path.join(this.dataDir, filename);
  }

  async ensureDataDir(): Promise<void> {
    await fs.promises.mkdir(this.dataDir, { recursive: true });
  }

  async readWalletData(): Promise<StoredWalletData> {
    const filePath = this.getFilePath(WALLET_DATA_FILE);
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      this.cachedData = JSON.parse(data) as StoredWalletData;
      return this.cachedData;
    } catch {
      const defaultData: StoredWalletData = { wallets: [], activeWalletId: null };
      this.cachedData = defaultData;
      return defaultData;
    }
  }

  readWalletDataSync(): StoredWalletData {
    if (this.cachedData) return this.cachedData;
    const filePath = this.getFilePath(WALLET_DATA_FILE);
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data) as StoredWalletData;
      this.cachedData = parsed;
      return parsed;
    } catch {
      return { wallets: [], activeWalletId: null };
    }
  }

  async writeWalletData(data: StoredWalletData): Promise<void> {
    await this.ensureDataDir();
    const filePath = this.getFilePath(WALLET_DATA_FILE);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    this.cachedData = data;
  }

  async addWallet(wallet: WalletInfo): Promise<void> {
    const data = await this.readWalletData();
    const existing = data.wallets.find(w => w.id === wallet.id);
    if (!existing) {
      data.wallets.push(wallet);
      if (!data.activeWalletId) {
        data.activeWalletId = wallet.id;
      }
      await this.writeWalletData(data);
    }
  }

  async removeWallet(walletId: string): Promise<void> {
    const data = await this.readWalletData();
    data.wallets = data.wallets.filter(w => w.id !== walletId);
    if (data.activeWalletId === walletId) {
      data.activeWalletId = data.wallets[0]?.id || null;
    }
    await this.writeWalletData(data);
  }

  async getActiveWallet(): Promise<WalletInfo | null> {
    const data = await this.readWalletData();
    if (!data.activeWalletId) return null;
    return data.wallets.find(w => w.id === data.activeWalletId) || null;
  }

  getActiveWalletSync(): WalletInfo | null {
    const data = this.readWalletDataSync();
    if (!data.activeWalletId) return null;
    return data.wallets.find(w => w.id === data.activeWalletId) || null;
  }

  async setActiveWallet(walletId: string): Promise<void> {
    const data = await this.readWalletData();
    const wallet = data.wallets.find(w => w.id === walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    data.activeWalletId = walletId;
    await this.writeWalletData(data);
  }

  async getAllWallets(): Promise<WalletInfo[]> {
    const data = await this.readWalletData();
    return data.wallets;
  }

  async getWalletById(walletId: string): Promise<WalletInfo | null> {
    const data = await this.readWalletData();
    return data.wallets.find(w => w.id === walletId) || null;
  }

  async saveEncryptionSalt(walletId: string, salt: string): Promise<void> {
    const filePath = this.getFilePath(`${walletId}.salt`);
    await fs.promises.writeFile(filePath, salt);
  }

  async getEncryptionSalt(walletId: string): Promise<string | null> {
    const filePath = this.getFilePath(`${walletId}.salt`);
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }
}
