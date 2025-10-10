# Contributing to explore-openapi-snapshot

Thank you for your interest in contributing! Here are some guidelines to help you get started.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/explore-openapi-snapshot.git
   cd explore-openapi-snapshot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Make your changes**
   - Write code in the `src/` directory
   - Add tests in `src/__tests__/`
   - Update documentation if needed

4. **Run quality checks**
   ```bash
   npm run lint      # Run linter
   npm run typecheck # Type check
   npm test          # Run tests
   npm run build     # Build the action
   ```

## Code Style

- We use **oxlint** for linting
- TypeScript strict mode is enabled
- Follow existing code patterns
- Add tests for new features

## Testing

- Write tests using **Vitest**
- Place tests in `src/__tests__/`
- Run tests with `npm test`
- Aim for good test coverage

## Building

- The action is built with **tsdown**
- Run `npm run build` to create the distribution
- **Important**: Commit the `dist/` folder with your changes
- GitHub Actions runs from the built `dist/index.js` file

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Run all quality checks
4. Build the action (`npm run build`)
5. Commit all changes including `dist/`
6. Open a pull request

## Questions?

Feel free to open an issue if you have questions or need help!
