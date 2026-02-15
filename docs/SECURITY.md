# セキュリティ

## CDKデプロイの安全性

### 権限境界による制限

IAM Permission Boundaryを使用して、デプロイ時に作成できるリソースを制限します。

#### 許可される操作

- AWS基本サービスの利用（EC2, S3, Lambda, RDS等）
- IAM読み取り操作（Get*, List*）
- `eph-*`プリフィックスを持つIAMロールの作成・管理

#### 制限される操作

- IAMユーザー・ポリシーの作成
- 既存IAMロールの変更
- 権限境界自体の変更・削除
- CloudFormationスタック（EphemeralStack）の変更・削除
- `eph-*`以外のIAMリソースの操作

### 多層防御

#### 1. OIDC認証層

```yaml
Condition:
  StringEquals:
    token.actions.githubusercontent.com:aud: sts.amazonaws.com
  StringLike:
    token.actions.githubusercontent.com:sub: repo:org/repo:*
```

- 特定リポジトリからのみアクセス可能
- 長期認証情報不要
- 自動ローテーション

#### 2. IAMロール分離

3つのロールで責任を分離：

1. **GitHubデプロイロール**: CDKコマンドの実行権限
2. **CDK実行ロール**: CloudFormationがリソース作成時に使用
3. **スケジューラ実行ロール**: EventBridgeがスタック削除時に使用

各ロールに権限境界を適用。

#### 3. 権限境界の強制

```json
{
  "Effect": "Deny",
  "Action": [
    "iam:DeleteRolePermissionsBoundary",
    "iam:PutRolePermissionsBoundary"
  ],
  "Resource": "*"
}
```

権限境界の変更・削除を明示的に拒否。

#### 4. スタック自己保護

```json
{
  "Effect": "Deny",
  "Action": [
    "cloudformation:UpdateStack",
    "cloudformation:DeleteStack"
  ],
  "Resource": "arn:aws:cloudformation:*:*:stack/EphemeralStack/*"
}
```

EphemeralStackスタック自体の変更を防止。

### リソース名前空間

すべてのエフェメラルリソースは`eph-*`プリフィックスを使用：

- スタック名: `eph-a1b2c3d-stack`
- ロール名: `eph-*`のみ作成可能
- その他リソース: タグで識別

### ブランチ制限

main/masterブランチからのデプロイを防止：

```typescript
if (branch === 'main' || branch === 'master') {
  throw new Error('Cannot deploy from main/master branch');
}
```

### 自動削除

EventBridge Schedulerにより指定時間後に自動削除：

- デフォルト: 24時間
- 設定可能: cdk.jsonのttlHours
- 削除失敗時のアラート設定を推奨

## エージェント向けガイドライン

### 権限が必要な場合

[PERMISSION_REQUESTS.md](PERMISSION_REQUESTS.md)を参照してリクエストを作成してください。

### 権限エラーの対処

1. 必要な権限を特定
2. `permission-request.yaml`を作成
3. 管理者にレビュー依頼
4. 承認後、再デプロイ

### ベストプラクティス

- 最小権限の原則に従う
- `eph-*`命名規則を遵守
- 不要なリソースは即座に削除
- 長期実行リソースは避ける
