# aws-cdk-ephemeral

エージェントや開発者がAWSで検証用の環境を簡単に構築・破棄を行うツール

## 機能

- ブランチ名から7桁ハッシュを生成し、環境名として使用（例: `feature/auth` → `eph-a1b2c3d`）
- OIDCによる認証（GitHub Actions対応）
- IAM権限境界による制限
- 自動削除（デフォルト24時間）
- main/masterブランチでは動作しない（フィーチャーブランチ専用）

## インストール

```bash
npm install -g aws-cdk aws-cdk-ephemeral
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
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-northeast-1

aws cloudformation wait stack-create-complete --stack-name EphemeralStack --region ap-northeast-1
aws cloudformation describe-stacks --stack-name EphemeralStack --region ap-northeast-1 --query 'Stacks[0].Outputs'
```

### 2. cdk.jsonの設定

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "ephemeral": {
    "ttlHours": 24,
    "stackName": "EphemeralStack"
  }
}
```

**注意**: ロールARNは自動的にCloudFormationスタックから取得されます。

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
    branches-ignore: ['main', 'master']

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
          aws-region: ap-northeast-1
      - run: npm ci
      - run: npm install -g aws-cdk aws-cdk-ephemeral
      - run: cdkeph deploy
```

## 使い方

```bash
# デプロイ（フィーチャーブランチから）
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
| stackName | string | EphemeralStack | CloudFormationスタック名 |

リージョンは`AWS_REGION`環境変数から取得。未設定の場合は`ap-northeast-1`がデフォルト。

## セキュリティ

- OIDC認証（長期認証情報不要）
- IAM権限境界による制限
- `eph-*`リソースのみ操作可能
- CloudFormationスタック自体の変更不可
- main/masterブランチからのデプロイ不可

## ライセンス

MIT