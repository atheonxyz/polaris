# Polaris

A privacy-first command-line wallet powered by [RAILGUN](https://railgun.org).

Polaris provides a persistent REPL interface for managing private cryptocurrency transactions using zero-knowledge proofs.

## Features

- **Private Transactions**: Shield, transfer, and unshield tokens with complete privacy
- **Multi-Network Support**: Ethereum, Polygon, BNB Chain, Arbitrum, and testnets
- **Interactive CLI**: Persistent REPL with context-aware prompts
- **Wallet Management**: Create, import, and manage multiple wallets
- **View-Only Wallets**: Share viewing keys for read-only access
- **Proof of Innocence**: Built-in POI support for mainnet compliance

## Installation

```bash
# Clone the repository
git clone https://github.com/atheon/polaris.git
cd polaris

# Install dependencies
pnpm install

# Build
pnpm run build

# Run
pnpm start
```

## Quick Start

```bash
# Start the interactive CLI
npm start

# Or run directly
node dist/cli/index.js
```

Once in the REPL:

```
polaris [--- ] > wallet create
# Follow prompts to create a new wallet

polaris [--- 0zk1q...] > network connect Ethereum
# Connect to Ethereum mainnet

polaris [ETH 0zk1q...] > balance
# View your private balances
```

## Commands

### General
| Command | Alias | Description |
|---------|-------|-------------|
| `help` | `h`, `?` | Show available commands |
| `status` | `st` | Show wallet and network status |
| `clear` | `cls` | Clear the screen |
| `exit` | `quit`, `q` | Exit Polaris |

### Wallet
| Command | Alias | Description |
|---------|-------|-------------|
| `wallet create` | `wc` | Create a new wallet |
| `wallet import` | `wi` | Import from recovery phrase |
| `wallet list` | `wl` | List all wallets |
| `wallet load` | `wload` | Load wallet into memory |
| `wallet use` | `wu` | Set active wallet |
| `wallet export` | `we` | Export recovery phrase |
| `wallet find` | `wf` | Find addresses for a phrase |

### Network
| Command | Alias | Description |
|---------|-------|-------------|
| `network list` | `nl` | List available networks |
| `network connect` | `nc` | Connect to a network |
| `network disconnect` | `nd` | Disconnect from network |
| `network switch` | `ns` | Switch active network |

### Balance
| Command | Alias | Description |
|---------|-------|-------------|
| `balance` | `bal`, `b` | Show private balances |
| `balance refresh` | `br` | Refresh balances |
| `history` | `hist` | Show transaction history |

## Supported Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Ethereum | 1 | Mainnet |
| Polygon | 137 | Mainnet |
| BNB Chain | 56 | Mainnet |
| Arbitrum | 42161 | Mainnet |
| Ethereum Sepolia | 11155111 | Testnet |

## Architecture

```
polaris/
├── src/
│   ├── cli/           # CLI and REPL interface
│   ├── core/          # Engine initialization and config
│   ├── network/       # Network provider management
│   ├── transactions/  # Balance and transaction services
│   ├── utils/         # Logging, storage, crypto utilities
│   ├── wallet/        # Wallet management
│   └── types/         # TypeScript type definitions
├── dist/              # Compiled JavaScript
└── package.json
```

## Development

```bash
# Run in development mode
pnpm run dev

# Type check
pnpm run typecheck

# Run tests
pnpm test

# Clean build artifacts
pnpm run clean
```

## Security

- **Recovery phrases** are encrypted with a user password before storage
- **Encryption keys** are derived using PBKDF2 with random salts
- **Private keys** never leave the local device
- **View-only keys** allow balance viewing without spending capability

## Requirements

- Node.js >= 24.0.0
- pnpm >= 9.0.0
- macOS, Linux, or Windows

## Dependencies

- [@railgun-community/wallet](https://github.com/Railgun-Community/wallet) - RAILGUN wallet SDK
- [@railgun-community/shared-models](https://github.com/Railgun-Community/shared-models) - Shared types
- [snarkjs](https://github.com/iden3/snarkjs) - zk-SNARK proof generation
- [classic-level](https://github.com/Level/classic-level) - LevelDB database
- [inquirer](https://github.com/SBoudrias/Inquirer.js) - Interactive prompts
- [chalk](https://github.com/chalk/chalk) - Terminal styling

## License

MIT

## Disclaimer

This software is provided as-is. Always verify transactions before signing. Never share your recovery phrase with anyone.
