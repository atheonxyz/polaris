import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * Derive an encryption key from a password using PBKDF2
 */
export const deriveEncryptionKey = (password: string, salt?: string): { key: string; salt: string } => {
  const useSalt = salt || randomBytes(16).toString('hex');
  const key = pbkdf2Sync(password, useSalt, 100000, 32, 'sha256').toString('hex');
  return { key, salt: useSalt };
};

/**
 * Simple SHA256 hash (for backwards compatibility)
 */
export const sha256 = (data: string): string => {
  return createHash('sha256').update(data).digest('hex');
};

/**
 * Generate a random hex string
 */
export const generateRandomHex = (bytes: number = 32): string => {
  return randomBytes(bytes).toString('hex');
};

/**
 * Validate a hex string
 */
export const isValidHex = (str: string, expectedLength?: number): boolean => {
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(str)) return false;
  if (expectedLength && str.length !== expectedLength) return false;
  return true;
};
