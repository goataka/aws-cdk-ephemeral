# Simple CDK App Example

This example demonstrates how to use `aws-cdk-ephemeral` with a simple CDK application.

## Setup

1. Install dependencies:

```bash
cd examples/simple-app
npm install
```

2. Configure cdk.json with your CloudFormation stack outputs:

```bash
# Update cdk.json with your actual ARNs
vim cdk.json
```

3. Deploy the ephemeral environment:

```bash
npx cdkeph deploy
```

4. Destroy when done:

```bash
npx cdkeph destroy
```

## What This Example Does

- Creates an S3 bucket with the environment name prefix
- Uses the environment context from cdkeph
- Demonstrates proper tagging for ephemeral resources
- Shows how to structure a CDK app for ephemeral environments

## Files

- `bin/app.ts` - CDK app entry point
- `lib/simple-stack.ts` - Stack definition
- `cdk.json` - CDK configuration with ephemeral settings
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript configuration
