# aws-cdk-ephemeral

エージェントや開発者がAWSで検証用の環境を簡単に構築・破棄を行うツール

## 機能

- ブランチ名から自動で環境名生成（例: `feature/auth` → `eph-feature-auth`）
- OIDCによる認証（GitHub Actions対応）
- IAM権限境界による制限
- 自動削除（デフォルト24時間）

## インストール

```bash
npm install -g aws-cdk-ephemeral
```

## セットアップ

### 1. CloudFormationスタックのデプロイ

```bash
aws cloudformation create-stack \
  --stack-name EphemeralStack \
  --template-body file://cloudformation/oidc-roles.yaml \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=your-org \
    ParameterKey=GitHubRepo,ParameterValue=your-repo \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation wait stack-create-complete --stack-name EphemeralStack
aws cloudformation describe-stacks --stack-name EphemeralStack --query 'Stacks[0].Outputs'
```

### 2. cdk.jsonの設定

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "ephemeral": {
    "ttlHours": 24,
    "defaultRegion": "us-east-1",
    "permissionBoundaryArn": "arn:aws:iam::ACCOUNT:policy/EphemeralStack-EphemeralBoundary",
    "cdkExecutionRoleArn": "arn:aws:iam::ACCOUNT:role/EphemeralStack-CDKExecRole",
    "deploymentRoleArn": "arn:aws:iam::ACCOUNT:role/EphemeralStack-GitHubDeploy",
    "schedulerRoleArn": "arn:aws:iam::ACCOUNT:role/EphemeralStack-SchedulerExec"
  }
}
```

### 3. CDKアプリケーションの設定

```typescript
// bin/app.ts
const app = new cdk.App();
const envName = app.node.tryGetContext('env') || 'dev';

new MyStack(app, `${envName}-Stack`, {
  stackName: `${envName}-stack`,
  tags: { Environment: envName, ManagedBy: 'cdkeph' }
});
```

### 4. GitHub Actions設定（オプション）

```yaml
# .github/workflows/ephemeral-deploy.yml
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
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      - run: npm ci
      - run: npm install -g aws-cdk-ephemeral
      - run: cdkeph deploy
```

## 使い方

```bash
# デプロイ
cdkeph deploy

# 環境情報表示
cdkeph info

# 削除
cdkeph destroy
```

## 設定

### cdk.json

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|---------|------|
| ttlHours | number | 24 | 自動削除までの時間 |
| defaultRegion | string | us-east-1 | AWSリージョン |
| permissionBoundaryArn | string | - | 権限境界ARN |
| cdkExecutionRoleArn | string | - | CDK実行ロールARN |
| deploymentRoleArn | string | - | デプロイロールARN |
| schedulerRoleArn | string | - | スケジューラロールARN |

## セキュリティ

- OIDC認証（長期認証情報不要）
- IAM権限境界による制限
- `eph-*`リソースのみ操作可能
- CloudFormationスタック自体の変更不可

## ライセンス

MIT