# aws-cdk-ephemeral

エージェントや開発者がAWSで検証用の環境を簡単に構築・破棄を行うツール

A tool for agents and developers to easily create and destroy ephemeral AWS environments for testing and validation.

## Features

- 🚀 **Easy Deployment**: Deploy CDK applications to ephemeral environments with a single command
- 🏷️ **Auto Naming**: Automatically generates environment names from Git branch names (e.g., `eph-feature-auth`)
- 🔒 **Security First**: Uses OIDC for authentication and IAM permission boundaries to limit capabilities
- ⏰ **Auto Cleanup**: Automatically destroys environments after a configurable TTL (default: 24 hours)
- 🔄 **Recreatable**: Environments can be recreated by running deploy again
- 🎯 **GitHub Actions Ready**: Seamless integration with GitHub Actions workflows

## How It Works

1. **Environment Naming**: Converts branch names to valid AWS names by sanitizing symbols to hyphens (e.g., `feature/user-auth` → `eph-feature-user-auth`)
2. **CDK Deployment**: Passes the environment name as context to your CDK application
3. **IAM Security**: Uses OIDC for GitHub Actions authentication with permission boundaries to restrict capabilities
4. **Auto Cleanup**: Creates an EventBridge Scheduler to automatically delete the CloudFormation stack after TTL expires

## Installation

```bash
npm install -g aws-cdk-ephemeral
```

Or in your project:

```bash
npm install --save-dev aws-cdk-ephemeral
```

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **CDK Project**: An existing AWS CDK project
3. **Git Repository**: Code in a Git repository (for automatic branch detection)
4. **AWS CDK CLI**: Install AWS CDK CLI globally: `npm install -g aws-cdk`

## Setup

### Step 1: Deploy CloudFormation Stack for IAM Roles

First, deploy the CloudFormation template to create the necessary IAM roles with OIDC:

```bash
aws cloudformation create-stack \
  --stack-name EphemeralStack \
  --template-body file://cloudformation/oidc-roles.yaml \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=your-org \
    ParameterKey=GitHubRepo,ParameterValue=your-repo \
  --capabilities CAPABILITY_NAMED_IAM
```

Wait for the stack to complete:

```bash
aws cloudformation wait stack-create-complete --stack-name EphemeralStack
```

Get the output values:

```bash
aws cloudformation describe-stacks --stack-name EphemeralStack --query 'Stacks[0].Outputs'
```

### Step 2: Configure Your CDK Project

Add the ephemeral configuration to your `cdk.json`:

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "context": {
    // ... your existing context
  },
  "ephemeral": {
    "ttlHours": 24,
    "defaultRegion": "us-east-1",
    "permissionBoundaryArn": "arn:aws:iam::YOUR-ACCOUNT:policy/EphemeralStack-EphemeralBoundary",
    "cdkExecutionRoleArn": "arn:aws:iam::YOUR-ACCOUNT:role/EphemeralStack-CDKExecRole",
    "deploymentRoleArn": "arn:aws:iam::YOUR-ACCOUNT:role/EphemeralStack-GitHubDeploy",
    "schedulerRoleArn": "arn:aws:iam::YOUR-ACCOUNT:role/EphemeralStack-SchedulerExec"
  }
}
```

Replace the ARNs with the actual values from the CloudFormation outputs.

### Step 3: Update Your CDK Application

Modify your CDK application to use the environment name from context:

```typescript
// bin/app.ts
import * as cdk from 'aws-cdk-lib';
import { MyStack } from '../lib/my-stack';

const app = new cdk.App();

// Get environment name from context (provided by cdkeph)
const envName = app.node.tryGetContext('env') || 'dev';

new MyStack(app, `${envName}-MyStack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  stackName: `${envName}-my-stack`,
  // Add tags for tracking
  tags: {
    Environment: envName,
    ManagedBy: 'cdkeph'
  }
});

app.synth();
```

### Step 4: Configure GitHub Actions (Optional)

Create `.github/workflows/ephemeral-deploy.yml`:

```yaml
name: Deploy Ephemeral Environment

on:
  push:
    branches:
      - '**'

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      
      - run: npm ci
      - run: npm install -g aws-cdk-ephemeral
      - run: cdkeph deploy
```

Set the `AWS_ROLE_ARN` secret in your GitHub repository settings to the `GitHubActionsRoleArn` from CloudFormation outputs.

## Usage

### Deploy

Deploy your CDK application to an ephemeral environment:

```bash
# Deploy using current Git branch name
cdkeph deploy

# Deploy with specific environment name
cdkeph deploy --env eph-my-test

# Deploy with AWS profile
cdkeph deploy --profile my-profile

# Deploy with additional CDK context
cdkeph deploy --context key1=value1 --context key2=value2
```

### Destroy

Manually destroy an ephemeral environment:

```bash
# Destroy using current Git branch name
cdkeph destroy

# Destroy specific environment
cdkeph destroy --env eph-my-test

# Destroy with AWS profile
cdkeph destroy --profile my-profile
```

### Info

Display information about the current ephemeral environment:

```bash
cdkeph info
```

## Configuration

### cdk.json

The `ephemeral` section in `cdk.json` supports the following options:

- `ttlHours` (number, default: 24): Hours until automatic cleanup
- `defaultRegion` (string, default: AWS_REGION or 'us-east-1'): Default AWS region
- `permissionBoundaryArn` (string): ARN of the permission boundary policy
- `cdkExecutionRoleArn` (string): ARN of the CloudFormation execution role
- `deploymentRoleArn` (string): ARN of the GitHub Actions deployment role
- `schedulerRoleArn` (string): ARN of the EventBridge Scheduler execution role

### Environment Variables

- `AWS_REGION` or `AWS_DEFAULT_REGION`: AWS region (can be overridden in cdk.json)
- `AWS_PROFILE`: AWS CLI profile to use

## Security

### Permission Boundaries

The CloudFormation template creates IAM roles with permission boundaries that:

- ✅ Allow deployment of most AWS services (EC2, S3, Lambda, RDS, etc.)
- ✅ Allow read-only IAM operations
- ✅ Allow creating IAM roles only for ephemeral resources (prefix: `eph-`)
- ❌ Deny modification of the CloudFormation stack itself
- ❌ Deny modification of permission boundaries
- ❌ Deny creating IAM users or modifying existing roles

### OIDC Authentication

GitHub Actions uses OpenID Connect (OIDC) to authenticate with AWS:

- No long-lived credentials needed
- Repository-specific access control
- Automatic credential rotation
- Reduced attack surface

### Role Separation

Three separate roles with distinct responsibilities:

1. **GitHub Actions Deployment Role**: Used by CI/CD to trigger deployments
2. **CDK Execution Role**: Used by CloudFormation to create resources
3. **Scheduler Execution Role**: Used by EventBridge to delete stacks

## Architecture

```
┌─────────────────┐
│ GitHub Actions  │
│   (Developer)   │
└────────┬────────┘
         │ OIDC Auth
         ▼
┌─────────────────────────┐
│ GitHub Deployment Role  │ ◄─── Permission Boundary
└────────┬────────────────┘
         │ CDK Deploy
         ▼
┌─────────────────────────┐
│ CloudFormation          │
└────────┬────────────────┘
         │ Assumes Role
         ▼
┌─────────────────────────┐
│  CDK Execution Role     │ ◄─── Permission Boundary
└────────┬────────────────┘
         │ Creates Resources
         ▼
┌─────────────────────────┐
│  AWS Resources          │
│  (eph-feature-*)        │
└─────────────────────────┘
         ▲
         │ Auto Delete (after TTL)
┌────────┴────────────────┐
│ EventBridge Scheduler   │
│ + Scheduler Exec Role   │
└─────────────────────────┘
```

## Troubleshooting

### "cdk.json not found"

Make sure you're running `cdkeph` from your CDK project directory, or the directory contains a `cdk.json` file.

### "Failed to get current Git branch"

Ensure you're in a Git repository and have at least one commit.

### Permission Denied Errors

Check that:
1. The CloudFormation stack was deployed successfully
2. The ARNs in `cdk.json` match the CloudFormation outputs
3. Your AWS credentials have permission to assume the roles
4. The permission boundary allows the operation you're trying to perform

### Schedule Not Created

Ensure the `schedulerRoleArn` is configured in `cdk.json`. The schedule creation will be skipped if this is not set.

## Examples

### Branch Name Sanitization

| Branch Name | Generated Environment |
|-------------|----------------------|
| `main` | `eph-main` |
| `feature/user-auth` | `eph-feature-user-auth` |
| `bugfix/fix-#123` | `eph-bugfix-fix-123` |
| `dev/test_feature` | `eph-dev-test-feature` |

### Complete Workflow

```bash
# 1. Create a feature branch
git checkout -b feature/new-api

# 2. Make changes to your CDK application
# ... edit files ...

# 3. Deploy to ephemeral environment
cdkeph deploy
# Creates: eph-feature-new-api

# 4. Test your changes
# ... run tests ...

# 5. When done, destroy manually (or wait for auto-cleanup)
cdkeph destroy

# 6. Merge and delete branch
git checkout main
git merge feature/new-api
git branch -d feature/new-api
```

## Contributing

Contributions are welcome! Please open an issue or pull request.

## License

MIT License - see LICENSE file for details

## Author

其阿彌 孝明 (Goataka)

## Related Projects

- [AWS CDK](https://aws.amazon.com/cdk/)
- [GitHub Actions](https://github.com/features/actions)
- [EventBridge Scheduler](https://aws.amazon.com/eventbridge/scheduler/)