# シンプルなCDKアプリケーション例

## セットアップ

```bash
cd examples/simple-app
npm install
```

## cdk.jsonの設定

CloudFormationスタックの出力値を使用してARNを設定してください。

## デプロイ

```bash
npx cdkeph deploy
```

## 削除

```bash
npx cdkeph destroy
```

## 内容

- S3バケットを環境名プレフィックス付きで作成
- 環境コンテキストを使用
- 適切なタグ付け
