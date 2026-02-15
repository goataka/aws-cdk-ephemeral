# aws-cdk-ephemeral

エージェントや開発者がAWSで検証用の環境を簡単に構築・破棄を行うツール

## 機能

- ブランチ名から7桁ハッシュを生成し、環境名として使用
- OIDCによる認証（GitHub Actions対応）
- IAM権限境界による制限
- 自動削除（デフォルト24時間）
- main/masterブランチでは動作しない（フィーチャーブランチ専用）

## インストール

```bash
npm install -g aws-cdk aws-cdk-ephemeral
```

## 必須セットアップ

### CloudFormationスタックのデプロイ

```bash
aws cloudformation create-stack \
  --stack-name EphemeralStack \
  --template-body file://cloudformation/oidc-roles.yaml \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=your-org \
    ParameterKey=GitHubRepo,ParameterValue=your-repo \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-northeast-1
```

### cdk.jsonの設定

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "ephemeral": {
    "ttlHours": 24,
    "stackName": "EphemeralStack"
  }
}
```

### CDKアプリケーションの設定

```typescript
const app = new cdk.App();
const envName = app.node.tryGetContext('env') || 'dev';

new MyStack(app, `${envName}-Stack`, {
  stackName: `${envName}-stack`,
  tags: { Environment: envName, ManagedBy: 'cdkeph' }
});
```

## オプション設定

### 環境名のカスタマイズ

```json
{
  "ephemeral": {
    "envPrefix": "dev",
    "envHash": "custom7"
  }
}
```

- `envPrefix`: 環境名のプリフィックス（デフォルト: `eph`）
- `envHash`: 固定ハッシュ値（未指定時はブランチ名から自動生成）

### GitHub Actions

詳細は[SETUP.md](docs/SETUP.md)を参照

## 使い方

```bash
cdkeph deploy   # デプロイ
cdkeph info     # 環境情報表示
cdkeph destroy  # 削除
```

## セキュリティ

- OIDC認証（長期認証情報不要）
- IAM権限境界による制限
- `eph-*`リソースのみ操作可能
- CloudFormationスタック自体の変更不可
- main/masterブランチからのデプロイ不可

詳細は[SECURITY.md](docs/SECURITY.md)を参照

## ライセンス

MIT
