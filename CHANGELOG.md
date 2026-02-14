# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-14

### Added
- Initial release of aws-cdk-ephemeral
- CLI tool (`cdkeph`) for managing ephemeral CDK environments
- Branch name sanitization (converts symbols to hyphens)
- CloudFormation template for OIDC provider and IAM roles
- GitHub Actions integration via OIDC authentication
- Permission boundaries to restrict IAM capabilities
- EventBridge Scheduler for automatic environment cleanup
- Support for configurable TTL (default: 24 hours)
- Three commands: `deploy`, `destroy`, and `info`
- Comprehensive documentation:
  - README with usage instructions
  - SETUP guide for CloudFormation deployment
  - PERMISSION_REQUESTS guide for requesting additional permissions
  - CONTRIBUTING guide for developers
- Example CDK application
- Unit tests for core functionality
- TypeScript type definitions

### Features
- Environment naming: `eph-{sanitized-branch-name}`
- Auto-cleanup after TTL expires
- GitHub repository-scoped OIDC authentication
- Separate roles for deployment and execution
- Permission boundary prevents privilege escalation
- Support for AWS CLI profiles
- Additional CDK context support
- Current branch auto-detection

### Security
- OIDC-based authentication (no long-lived credentials)
- IAM permission boundaries
- Role separation (deployment vs. execution)
- Prevents modification of CloudFormation stack itself
- Restricts IAM operations to `eph-*` resources only
- Read-only IAM operations allowed
- Explicit deny for permission boundary modifications

[0.1.0]: https://github.com/goataka/aws-cdk-ephemeral/releases/tag/v0.1.0
