# 権限リクエストガイド

エージェントがCloudFormation経由で権限の増加をリクエストする方法

## 現在の権限

### 許可されているサービス
- EC2, S3, Lambda, DynamoDB, RDS
- CloudFormation, CloudWatch, EventBridge
- SNS, SQS, API Gateway, ECS, ECR
- Route53, ACM, Secrets Manager, KMS

### 許可されているIAM操作
- 読み取り操作: `Get*`, `List*`
- `eph-*` リソースのみ作成・変更可能

### 制限されている操作
- IAMユーザー・ポリシーの作成・変更
- CloudFormationスタック自体の変更
- 権限境界の変更
- `eph-*` プレフィックス以外のロール作成

## 権限リクエスト手順

### 1. 必要な権限の特定

```yaml
# permission-request.yaml
requestedBy: エージェント名または開発者名
requestDate: 2026-02-14
purpose: 権限が必要な理由

permissions:
  - service: AWS Step Functions
    actions:
      - states:*
    resources:
      - arn:aws:states:*:*:stateMachine:eph-*
      - arn:aws:states:*:*:execution:eph-*/*

justification: |
  データ処理パイプラインでStep Functionsによる
  オーケストレーションが必要です。
```

### 2. リクエストの提出

以下のいずれかの方法で提出：
- GitHubイシュー作成
- プルリクエスト
- 管理者へ直接連絡

### 3. 管理者によるレビュー

管理者は以下を確認：
1. 権限の妥当性
2. `eph-*` プレフィックスでのスコープ
3. セキュリティ境界のバイパスがないこと

### 4. CloudFormationスタックの更新

承認後、管理者がスタックを更新：

```bash
aws cloudformation update-stack \
  --stack-name EphemeralStack \
  --template-body file://cloudformation/oidc-roles.yaml \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation wait stack-update-complete --stack-name EphemeralStack
```

### 5. 新しい権限の確認

```bash
cdkeph deploy
```

## CloudFormation更新例

```yaml
# cloudformation/oidc-roles.yaml
# EphemeralPermissionBoundary -> PolicyDocument -> Statement に追加

- Sid: AllowStepFunctionsForEphemeral
  Effect: Allow
  Action:
    - states:*
  Resource:
    - !Sub 'arn:aws:states:*:${AWS::AccountId}:stateMachine:eph-*'
    - !Sub 'arn:aws:states:*:${AWS::AccountId}:execution:eph-*/*'
```

## 拒否される例

### スコープが広すぎる
```yaml
# 不可: すべてのS3バケットにアクセス
permissions:
  - service: S3
    actions:
      - s3:*
    resources:
      - '*'
```

### 権限境界のバイパス
```yaml
# 不可: IAMポリシーの変更
permissions:
  - service: IAM
    actions:
      - iam:CreatePolicy
      - iam:AttachUserPolicy
```

### スタックの自己変更
```yaml
# 不可: CloudFormationスタックの変更
permissions:
  - service: CloudFormation
    actions:
      - cloudformation:UpdateStack
    resources:
      - arn:aws:cloudformation:*:*:stack/EphemeralStack/*
```

## よくある質問

**Q: 承認にはどれくらいかかりますか？**
A: 通常1-2営業日です。

**Q: 権限境界をバイパスできますか？**
A: いいえ、これは意図的なセキュリティ制約です。

**Q: 既存の環境に影響はありますか？**
A: 更新後、すべての環境が新しい権限を継承します。
