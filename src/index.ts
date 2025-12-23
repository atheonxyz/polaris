// Polaris - Privacy-first wallet powered by RAILGUN
// Main library exports for programmatic usage

// Core
export * from './core/index.js';

// Wallet
export * from './wallet/index.js';

// Network
export * from './network/index.js';

// Transactions
export * from './transactions/index.js';

// Types
export * from './types/index.js';

// Utils
export { logger, output, setLogLevel } from './utils/logger.js';
export { deriveEncryptionKey, sha256, generateRandomHex } from './utils/crypto.js';
export { Storage } from './utils/storage.js';
