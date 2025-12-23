import {
  NetworkName,
  TXIDVersion,
  TransactionGasDetails,
  EVMGasType,
} from '@railgun-community/shared-models';
import { ContractTransaction } from 'ethers';
import type { TransactionResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Zero address for base tokens (ETH, MATIC, etc.)
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export class TransactionService {
  /**
   * Get gas details for a network
   */
  private getGasDetails(
    gasEstimate: bigint,
    maxFeePerGas: bigint,
    maxPriorityFeePerGas: bigint,
  ): TransactionGasDetails {
    return {
      evmGasType: EVMGasType.Type2,
      gasEstimate,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  }

  /**
   * Shield ERC20 tokens (public -> private)
   * TODO: Implement with correct SDK API
   */
  async shieldTokens(
    _networkName: NetworkName,
    _txidVersion: TXIDVersion,
    _railgunAddress: string,
    _tokenAddress: string,
    _amount: bigint,
    _fromWalletAddress: string,
  ): Promise<{ transaction: ContractTransaction; gasEstimate: bigint }> {
    logger.warn('Shield transaction not yet implemented');
    throw new Error('Shield transaction not yet implemented');
  }

  /**
   * Generate proof for private transfer
   * TODO: Implement with correct SDK API
   */
  async generateTransferProof(
    _networkName: NetworkName,
    _txidVersion: TXIDVersion,
    _walletId: string,
    _encryptionKey: string,
    _toRailgunAddress: string,
    _tokenAddress: string,
    _amount: bigint,
    _sendWithPublicWallet: boolean = false,
    _overallBatchMinGasPrice?: bigint,
  ): Promise<void> {
    logger.warn('Transfer proof generation not yet implemented');
    throw new Error('Transfer proof generation not yet implemented');
  }

  /**
   * Populate a proved transfer transaction
   * TODO: Implement with correct SDK API
   */
  async populateTransfer(
    _networkName: NetworkName,
    _txidVersion: TXIDVersion,
    _walletId: string,
    _toRailgunAddress: string,
    _tokenAddress: string,
    _amount: bigint,
    _gasDetails: TransactionGasDetails,
    _sendWithPublicWallet: boolean = false,
  ): Promise<ContractTransaction> {
    logger.warn('Transfer transaction not yet implemented');
    throw new Error('Transfer transaction not yet implemented');
  }

  /**
   * Generate proof for unshield (private -> public)
   * TODO: Implement with correct SDK API
   */
  async generateUnshieldProof(
    _networkName: NetworkName,
    _txidVersion: TXIDVersion,
    _walletId: string,
    _encryptionKey: string,
    _toPublicAddress: string,
    _tokenAddress: string,
    _amount: bigint,
  ): Promise<void> {
    logger.warn('Unshield proof generation not yet implemented');
    throw new Error('Unshield proof generation not yet implemented');
  }

  /**
   * Populate a proved unshield transaction
   * TODO: Implement with correct SDK API
   */
  async populateUnshield(
    _networkName: NetworkName,
    _txidVersion: TXIDVersion,
    _walletId: string,
    _toPublicAddress: string,
    _tokenAddress: string,
    _amount: bigint,
    _gasDetails: TransactionGasDetails,
  ): Promise<ContractTransaction> {
    logger.warn('Unshield transaction not yet implemented');
    throw new Error('Unshield transaction not yet implemented');
  }

  /**
   * Estimate gas for transfer
   * TODO: Implement with correct SDK API
   */
  async estimateTransferGas(
    _networkName: NetworkName,
    _txidVersion: TXIDVersion,
    _walletId: string,
    _encryptionKey: string,
    _toRailgunAddress: string,
    _tokenAddress: string,
    _amount: bigint,
  ): Promise<bigint> {
    logger.warn('Transfer gas estimation not yet implemented');
    throw new Error('Transfer gas estimation not yet implemented');
  }

  /**
   * Estimate gas for unshield
   * TODO: Implement with correct SDK API
   */
  async estimateUnshieldGas(
    _networkName: NetworkName,
    _txidVersion: TXIDVersion,
    _walletId: string,
    _encryptionKey: string,
    _toPublicAddress: string,
    _tokenAddress: string,
    _amount: bigint,
  ): Promise<bigint> {
    logger.warn('Unshield gas estimation not yet implemented');
    throw new Error('Unshield gas estimation not yet implemented');
  }
}
