# Setup Guide for aws-cdk-ephemeral

完全なセットアップガイド / Complete setup guide

## Quick Start

### 1. Install the Tool

```bash
npm install -g aws-cdk-ephemeral
```

### 2. Bootstrap AWS CDK (if not already done)

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### 3. Deploy CloudFormation Stack

```bash
cd /path/to/aws-cdk-ephemeral

aws cloudformation create-stack \
  --stack-name EphemeralStack \
  --template-body file://cloudformation/oidc-roles.yaml \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=your-github-org \
    ParameterKey=GitHubRepo,ParameterValue=your-repo-name \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

Wait for completion:

```bash
aws cloudformation wait stack-create-complete \
  --stack-name EphemeralStack \
  --region us-east-1
```

### 4. Get CloudFormation Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name EphemeralStack \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

Save these values:
- `GitHubActionsRoleArn`: For GitHub Actions authentication
- `CDKExecutionRoleArn`: For CDK deployment
- `SchedulerRoleArn`: For auto-cleanup
- `PermissionBoundaryArn`: For IAM restrictions

### 5. Configure Your CDK Project

Create or update `cdk.json`:

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "ephemeral": {
    "ttlHours": 24,
    "defaultRegion": "us-east-1",
    "permissionBoundaryArn": "YOUR_BOUNDARY_ARN",
    "cdkExecutionRoleArn": "YOUR_EXEC_ROLE_ARN",
    "deploymentRoleArn": "YOUR_DEPLOY_ROLE_ARN",
    "schedulerRoleArn": "YOUR_SCHEDULER_ROLE_ARN"
  }
}
```

### 6. Update Your CDK Application

Modify your CDK entry point to use environment context:

```typescript
// bin/app.ts
import * as cdk from 'aws-cdk-lib';
import { MyStack } from '../lib/my-stack';

const app = new cdk.App();
const envName = app.node.tryGetContext('env') || 'dev';

new MyStack(app, `${envName}-MyStack`, {
  stackName: `${envName}-my-stack`,
  tags: {
    Environment: envName,
    ManagedBy: 'cdkeph'
  }
});
```

### 7. Test Locally

```bash
cd /path/to/your/cdk/project

# Deploy
cdkeph deploy

# Check status
cdkeph info

# Clean up
cdkeph destroy
```

### 8. Configure GitHub Actions

Create `.github/workflows/ephemeral-deploy.yml`:

```yaml
name: Deploy Ephemeral

on:
  push:
    branches: ['**']

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
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      
      - run: npm ci
      - run: npm install -g aws-cdk-ephemeral
      - run: cdkeph deploy
```

Set the `AWS_ROLE_ARN` secret in GitHub:
1. Go to Settings → Secrets and variables → Actions
2. Add new secret: `AWS_ROLE_ARN` = `YOUR_GITHUB_ACTIONS_ROLE_ARN`

## Detailed Configuration

### CloudFormation Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| GitHubOrg | GitHub organization or username | `mycompany` |
| GitHubRepo | Repository name | `my-app` |
| OIDCProviderArn | Existing OIDC provider (optional) | Leave empty to create new |
| MaxSessionDuration | Max session time (seconds) | `3600` (1 hour) |

### cdk.json Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| ttlHours | number | 24 | Hours before auto-cleanup |
| defaultRegion | string | AWS_REGION | Default AWS region |
| permissionBoundaryArn | string | required | Permission boundary ARN |
| cdkExecutionRoleArn | string | required | CloudFormation execution role |
| deploymentRoleArn | string | optional | GitHub Actions role |
| schedulerRoleArn | string | optional | EventBridge Scheduler role |

## Multiple Environments

### Per-Repository Configuration

Each repository can have its own CloudFormation stack:

```bash
# Repository 1
aws cloudformation create-stack \
  --stack-name EphemeralStack-Repo1 \
  --template-body file://cloudformation/oidc-roles.yaml \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=myorg \
    ParameterKey=GitHubRepo,ParameterValue=repo1 \
  --capabilities CAPABILITY_NAMED_IAM

# Repository 2
aws cloudformation create-stack \
  --stack-name EphemeralStack-Repo2 \
  --template-body file://cloudformation/oidc-roles.yaml \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=myorg \
    ParameterKey=GitHubRepo,ParameterValue=repo2 \
  --capabilities CAPABILITY_NAMED_IAM
```

### Shared OIDC Provider

To reuse an OIDC provider across multiple repositories:

```bash
# Get OIDC provider ARN from first stack
OIDC_ARN=$(aws cloudformation describe-stacks \
  --stack-name EphemeralStack-Repo1 \
  --query 'Stacks[0].Outputs[?OutputKey==`OIDCProviderArn`].OutputValue' \
  --output text)

# Use it for second stack
aws cloudformation create-stack \
  --stack-name EphemeralStack-Repo2 \
  --template-body file://cloudformation/oidc-roles.yaml \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=myorg \
    ParameterKey=GitHubRepo,ParameterValue=repo2 \
    ParameterKey=OIDCProviderArn,ParameterValue=$OIDC_ARN \
  --capabilities CAPABILITY_NAMED_IAM
```

## Advanced Usage

### Custom TTL Per Deployment

Override TTL in cdk.json based on environment:

```json
{
  "ephemeral": {
    "ttlHours": 24
  },
  "context": {
    "ttl:production": "168",
    "ttl:staging": "72",
    "ttl:development": "24"
  }
}
```

### Multiple AWS Accounts

Deploy the CloudFormation stack to each AWS account:

```bash
# Development Account
aws cloudformation create-stack \
  --stack-name EphemeralStack \
  --template-body file://cloudformation/oidc-roles.yaml \
  --parameters [...] \
  --capabilities CAPABILITY_NAMED_IAM \
  --profile dev-account

# Production Account
aws cloudformation create-stack \
  --stack-name EphemeralStack \
  --template-body file://cloudformation/oidc-roles.yaml \
  --parameters [...] \
  --capabilities CAPABILITY_NAMED_IAM \
  --profile prod-account
```

### Custom Stack Naming

Modify `src/cdk.ts` to customize stack names:

```typescript
// Custom stack naming logic
const stackName = `${envName}-${projectName}-stack`;
await createDestructionSchedule(stackName, ttl, config);
```

## Troubleshooting

### Issue: "Stack already exists"

```bash
# Delete existing stack
aws cloudformation delete-stack --stack-name EphemeralStack
aws cloudformation wait stack-delete-complete --stack-name EphemeralStack

# Recreate
aws cloudformation create-stack [...]
```

### Issue: "Invalid OIDC thumbprint"

The thumbprint may have changed. Update manually:

```bash
# Get new thumbprint
openssl s_client -servername token.actions.githubusercontent.com \
  -connect token.actions.githubusercontent.com:443 < /dev/null 2>/dev/null | \
  openssl x509 -fingerprint -sha1 -noout | cut -d'=' -f2 | tr -d ':'

# Update stack with new thumbprint
aws cloudformation update-stack \
  --stack-name EphemeralStack \
  --use-previous-template \
  --capabilities CAPABILITY_NAMED_IAM
```

### Issue: "Permission denied in GitHub Actions"

Check:
1. AWS_ROLE_ARN secret is set correctly
2. Role trust policy includes your repository
3. OIDC provider is configured
4. Region matches

### Issue: "CDK bootstrap not found"

Bootstrap CDK in your target region:

```bash
cdk bootstrap aws://123456789012/us-east-1
```

## Monitoring

### View Active Schedules

```bash
aws scheduler list-schedules \
  --query 'Schedules[?starts_with(Name, `eph-`)]'
```

### View Ephemeral Stacks

```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?starts_with(StackName, `eph-`)]'
```

### CloudWatch Logs

Check deployment logs:

```bash
aws logs tail /aws/lambda/cdk-bootstrap --follow
```

## Maintenance

### Update CloudFormation Stack

```bash
# Update with new template
aws cloudformation update-stack \
  --stack-name EphemeralStack \
  --template-body file://cloudformation/oidc-roles.yaml \
  --capabilities CAPABILITY_NAMED_IAM

# Wait for completion
aws cloudformation wait stack-update-complete --stack-name EphemeralStack
```

### Update cdkeph Tool

```bash
npm update -g aws-cdk-ephemeral
```

### Clean Up Old Environments

Manually delete old environments:

```bash
# List all ephemeral stacks
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE \
  --query 'StackSummaries[?starts_with(StackName, `eph-`)].StackName' \
  --output text

# Delete specific stack
aws cloudformation delete-stack --stack-name eph-old-branch
```

## Best Practices

1. **Use Short Branch Names**: Keep branch names concise to avoid AWS naming limits
2. **Tag Resources**: Always tag ephemeral resources for tracking
3. **Monitor Costs**: Set up billing alerts for ephemeral environments
4. **Regular Cleanup**: Review and delete unused environments weekly
5. **Document Permissions**: Keep permission requests documented
6. **Test Locally First**: Test CDK changes locally before CI/CD
7. **Version Control**: Keep CloudFormation templates in version control
8. **Separate Accounts**: Use separate AWS accounts for dev/staging/prod

## Next Steps

- Read [PERMISSION_REQUESTS.md](./PERMISSION_REQUESTS.md) for requesting additional permissions
- Review CloudFormation template for customization
- Set up billing alerts for cost monitoring
- Configure CloudWatch dashboards for environment tracking

## Support

For issues or questions:
- GitHub Issues: https://github.com/goataka/aws-cdk-ephemeral/issues
- Documentation: See README.md
