# Contributing to Polaris

Thank you for your interest in contributing to Polaris!

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/polaris.git
   cd polaris
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Building

```bash
pnpm run build
```

### Running in Development

```bash
pnpm run dev
```

### Type Checking

```bash
pnpm run typecheck
```

### Testing

```bash
pnpm test
```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns and naming conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add new wallet export feature
fix: resolve network connection timeout
docs: update README installation steps
refactor: simplify balance calculation logic
```

## Pull Requests

1. Ensure all tests pass
2. Update documentation if needed
3. Add a clear description of changes
4. Reference any related issues

## Security

- Never commit secrets, keys, or credentials
- Report security vulnerabilities privately
- Be careful with user data handling

## Questions?

Open an issue for questions or discussions.
