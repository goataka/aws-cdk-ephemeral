# Contributing to aws-cdk-ephemeral

Thank you for your interest in contributing to aws-cdk-ephemeral!

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/goataka/aws-cdk-ephemeral.git
cd aws-cdk-ephemeral
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

5. Watch mode for development:
```bash
npm run watch
```

## Project Structure

```
aws-cdk-ephemeral/
├── src/                    # Source code
│   ├── cli.ts             # CLI entry point
│   ├── cdk.ts             # CDK deployment logic
│   ├── config.ts          # Configuration management
│   ├── scheduler.ts       # EventBridge Scheduler integration
│   ├── utils.ts           # Utility functions
│   └── index.ts           # Public API exports
├── cloudformation/         # CloudFormation templates
│   └── oidc-roles.yaml    # IAM roles and OIDC setup
├── templates/              # Configuration templates
│   ├── cdk.json           # Example cdk.json
│   └── github-workflow.yaml # Example GitHub Actions workflow
├── docs/                   # Documentation
│   ├── SETUP.md           # Setup guide
│   └── PERMISSION_REQUESTS.md # Permission request guide
├── examples/               # Example applications
│   └── simple-app/        # Simple CDK app example
├── tests/                  # Test files
│   └── utils.test.ts      # Unit tests
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Making Changes

1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes

3. Run tests:
```bash
npm test
```

4. Build the project:
```bash
npm run build
```

5. Test the CLI locally:
```bash
node dist/cli.js --help
```

## Coding Standards

- Use TypeScript strict mode
- Follow existing code style
- Add tests for new features
- Update documentation for API changes
- Use meaningful commit messages

## Testing

### Unit Tests

```bash
npm test
```

### Manual Testing

```bash
# Build the project
npm run build

# Test CLI commands
node dist/cli.js info
node dist/cli.js deploy --help
node dist/cli.js destroy --help
```

### Testing with Example App

```bash
cd examples/simple-app
npm install

# Use the local cdkeph build
node ../../dist/cli.js info
```

## Documentation

When adding new features or changing behavior:

1. Update README.md
2. Update relevant documentation in docs/
3. Add/update examples if needed
4. Update CloudFormation template comments

## Submitting Changes

1. Ensure all tests pass
2. Update CHANGELOG.md (if exists)
3. Commit your changes with descriptive messages
4. Push to your fork
5. Create a Pull Request

## Pull Request Guidelines

- Describe what the PR does
- Reference any related issues
- Include screenshots for UI changes
- Ensure CI passes
- Request review from maintainers

## Reporting Issues

When reporting issues, please include:

- Version of aws-cdk-ephemeral
- Node.js version
- AWS CDK version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

## Feature Requests

Feature requests are welcome! Please:

- Check if it already exists in issues
- Describe the use case
- Explain why it's useful
- Provide examples if possible

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue for questions or discussions!
