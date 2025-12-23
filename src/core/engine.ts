import fs from 'fs';
import path from 'path';
import { ClassicLevel } from 'classic-level';
import { groth16 } from 'snarkjs';
import {
  startRailgunEngine,
  stopRailgunEngine,
  getEngine,
  setOnBalanceUpdateCallback,
  setOnUTXOMerkletreeScanCallback,
  setOnTXIDMerkletreeScanCallback,
  ArtifactStore,
} from '@railgun-community/wallet';
import { MerkletreeScanStatus, type MerkletreeScanUpdateEvent } from '@railgun-community/shared-models';
import type { PolarisConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getDefaultConfig } from './config.js';

// POI (Proof of Innocence) aggregator nodes
// These are required for mainnet networks
const POI_NODE_URLS = [
  'https://poi-node.railgun.org',
  'https://ppoi-agg.horsewithsixlegs.xyz',
];

let engineInitialized = false;
let currentConfig: PolarisConfig = getDefaultConfig();
let dbInstance: ClassicLevel | null = null;

// Track scan status per chain
export interface ScanState {
  utxoStatus: MerkletreeScanStatus;
  utxoProgress: number;
  txidStatus: MerkletreeScanStatus;
  txidProgress: number;
}

const scanStates: Map<number, ScanState> = new Map();

// Callbacks
let onBalanceUpdateHandler: ((data: unknown) => void) | null = null;
let onScanProgressHandler: ((data: MerkletreeScanUpdateEvent) => void) | null = null;

/**
 * Create artifact store for zk-SNARK artifacts
 */
const createArtifactStore = (artifactsDir: string): ArtifactStore => {
  return new ArtifactStore(
    // Get artifact
    async (artifactPath: string): Promise<Buffer | null> => {
      const fullPath = path.join(artifactsDir, artifactPath);
      try {
        return await fs.promises.readFile(fullPath);
      } catch {
        return null;
      }
    },
    // Store artifact
    async (dir: string, filePath: string, data: string | Uint8Array): Promise<void> => {
      const fullDir = path.join(artifactsDir, dir);
      const fullPath = path.join(artifactsDir, filePath);
      await fs.promises.mkdir(fullDir, { recursive: true });
      await fs.promises.writeFile(fullPath, data);
    },
    // Check if artifact exists
    async (artifactPath: string): Promise<boolean> => {
      const fullPath = path.join(artifactsDir, artifactPath);
      try {
        await fs.promises.access(fullPath);
        return true;
      } catch {
        return false;
      }
    },
  );
};

/**
 * Ensure all required directories exist
 */
const ensureDirectories = async (config: PolarisConfig): Promise<void> => {
  await fs.promises.mkdir(config.dataDir, { recursive: true });
  await fs.promises.mkdir(config.artifactsDir, { recursive: true });
};

/**
 * Get or create scan state for a chain
 */
const getOrCreateScanState = (chainId: number): ScanState => {
  if (!scanStates.has(chainId)) {
    scanStates.set(chainId, {
      utxoStatus: MerkletreeScanStatus.Started,
      utxoProgress: 0,
      txidStatus: MerkletreeScanStatus.Started,
      txidProgress: 0,
    });
  }
  return scanStates.get(chainId)!;
};

/**
 * Default balance update callback
 */
const defaultBalanceUpdateCallback = (data: unknown): void => {
  logger.debug('Balance updated');
  if (onBalanceUpdateHandler) {
    onBalanceUpdateHandler(data);
  }
};

/**
 * Default UTXO merkletree scan callback
 */
const defaultUTXOMerkletreeScanCallback = (data: MerkletreeScanUpdateEvent): void => {
  const state = getOrCreateScanState(data.chain.id);
  state.utxoStatus = data.scanStatus;
  state.utxoProgress = data.progress;

  logger.debug(`UTXO scan [${data.chain.id}]: ${data.scanStatus} (${Math.round(data.progress * 100)}%)`);

  if (onScanProgressHandler) {
    onScanProgressHandler(data);
  }
};

/**
 * Default TXID merkletree scan callback
 */
const defaultTXIDMerkletreeScanCallback = (data: MerkletreeScanUpdateEvent): void => {
  const state = getOrCreateScanState(data.chain.id);
  state.txidStatus = data.scanStatus;
  state.txidProgress = data.progress;

  logger.debug(`TXID scan [${data.chain.id}]: ${data.scanStatus} (${Math.round(data.progress * 100)}%)`);
};

/**
 * Initialize the RAILGUN engine
 */
export const initializeEngine = async (config?: Partial<PolarisConfig>): Promise<void> => {
  if (engineInitialized) {
    logger.warn('Engine already initialized');
    return;
  }

  currentConfig = { ...getDefaultConfig(), ...config };

  logger.info('Initializing Polaris engine...');

  await ensureDirectories(currentConfig);

  // Create LevelDB database
  dbInstance = new ClassicLevel(currentConfig.dbPath);

  // Create artifact store
  const artifactStore = createArtifactStore(currentConfig.artifactsDir);

  // Initialize the RAILGUN engine with POI support
  await startRailgunEngine(
    'polaris',          // walletSource (max 16 chars, lowercase, alphanumeric)
    dbInstance as any,  // database
    currentConfig.debug,// shouldDebug
    artifactStore,      // artifactStore
    false,              // useNativeArtifacts (false for Node.js)
    false,              // skipMerkletreeScans
    POI_NODE_URLS,      // poiNodeURLs - required for mainnet
    undefined,          // customPOILists
    false,              // verboseScanLogging
  );

  // Set up the Groth16 prover
  // Note: groth16 from snarkjs is compatible at runtime but types differ
  const engine = getEngine();
  engine.prover.setSnarkJSGroth16(groth16 as any);

  // Set up callbacks
  setOnBalanceUpdateCallback(defaultBalanceUpdateCallback);
  setOnUTXOMerkletreeScanCallback(defaultUTXOMerkletreeScanCallback);
  setOnTXIDMerkletreeScanCallback(defaultTXIDMerkletreeScanCallback);

  engineInitialized = true;
  logger.info('Polaris engine initialized successfully');
};

/**
 * Shutdown the engine
 */
export const shutdownEngine = async (): Promise<void> => {
  if (!engineInitialized) {
    return;
  }

  logger.info('Shutting down Polaris engine...');

  await stopRailgunEngine();

  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }

  engineInitialized = false;
  logger.info('Polaris engine stopped');
};

/**
 * Check if engine is initialized
 */
export const isEngineInitialized = (): boolean => engineInitialized;

/**
 * Get the RAILGUN engine instance
 */
export const getRailgunEngine = () => {
  if (!engineInitialized) {
    throw new Error('Engine not initialized. Call initializeEngine() first.');
  }
  return getEngine();
};

/**
 * Get current configuration
 */
export const getConfig = (): PolarisConfig => currentConfig;

/**
 * Set balance update handler
 */
export const setBalanceUpdateHandler = (handler: (data: unknown) => void): void => {
  onBalanceUpdateHandler = handler;
};

/**
 * Set scan progress handler
 */
export const setScanProgressHandler = (handler: (data: MerkletreeScanUpdateEvent) => void): void => {
  onScanProgressHandler = handler;
};

/**
 * Get scan state for a chain
 */
export const getScanState = (chainId: number): ScanState | undefined => {
  return scanStates.get(chainId);
};

/**
 * Check if chain scan is complete
 */
export const isScanComplete = (chainId: number): boolean => {
  const state = scanStates.get(chainId);
  if (!state) return false;
  return (
    state.utxoStatus === MerkletreeScanStatus.Complete &&
    state.txidStatus === MerkletreeScanStatus.Complete
  );
};

/**
 * Check if UTXO scan is complete (sufficient for balance queries)
 */
export const isUTXOScanComplete = (chainId: number): boolean => {
  const state = scanStates.get(chainId);
  if (!state) return false;
  return state.utxoStatus === MerkletreeScanStatus.Complete;
};

// Re-export for convenience
export { MerkletreeScanStatus };
