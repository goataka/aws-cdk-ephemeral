# セットアップガイド

## 1. インストール

```bash
npm install -g aws-cdk-ephemeral
```

## 2. CDKブートストラップ（未実施の場合）

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

## 3. CloudFormationスタックのデプロイ

```bash
aws cloudformation create-stack \
  --stack-name EphemeralStack \
  --template-body file://cloudformation/oidc-roles.yaml \
  --parameters \
    ParameterKey=GitHubOrg,ParameterValue=your-org \
    ParameterKey=GitHubRepo,ParameterValue=your-repo \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation wait stack-create-complete --stack-name EphemeralStack
```

## 4. 出力値の取得

```bash
aws cloudformation describe-stacks \
  --stack-name EphemeralStack \
  --query 'Stacks[0].Outputs'
```

## 5. cdk.jsonの設定

```json
{
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

## 6. CDKアプリケーションの更新

```typescript
const app = new cdk.App();
const envName = app.node.tryGetContext('env') || 'dev';

new MyStack(app, `${envName}-Stack`, {
  stackName: `${envName}-stack`,
  tags: { Environment: envName, ManagedBy: 'cdkeph' }
});
```

## 7. GitHub Actionsの設定

`.github/workflows/ephemeral-deploy.yml`:

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
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      - run: npm ci
      - run: npm install -g aws-cdk-ephemeral
      - run: cdkeph deploy
```

`AWS_ROLE_ARN` シークレットをGitHubリポジトリに設定してください。

## トラブルシューティング

### スタックが既に存在する

```bash
aws cloudformation delete-stack --stack-name EphemeralStack
aws cloudformation wait stack-delete-complete --stack-name EphemeralStack
```

### CDKブートストラップが見つからない

```bash
cdk bootstrap aws://123456789012/us-east-1
```

### 権限エラー

1. CloudFormationスタックが正常にデプロイされているか確認
2. cdk.jsonのARNがCloudFormation出力と一致しているか確認
3. AWS認証情報がロールを引き受ける権限を持っているか確認
