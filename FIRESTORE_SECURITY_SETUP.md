# Firestore セキュリティルール設定ガイド

## ⚠️ 緊急対応が必要です

あなたのFirestoreデータベースは現在テストモードで稼働しており、**2日後にアクセスが拒否される**予定です。以下の手順に従って、適切なセキュリティルールを設定してください。

## 設定方法

### 1. Firebase Consoleにアクセス

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト選択（nemuranai-ai）
3. 左メニューから「Firestore Database」を選択
4. 「ルール」タブをクリック

### 2. セキュリティルールの適用

現在のルールを以下の内容に置き換えてください：

```javascript
// ファイルの内容: firestore.rules
```

**または、以下のファイルの内容をコピー＆ペーストしてください:**
- `firestore.rules`

### 3. ルールの公開

1. 「公開」ボタンをクリック
2. 変更内容を確認
3. 「公開」を再度クリック

### 4. デプロイ（Firebase CLIを使用する場合）

```bash
# Firebase CLIがインストールされている場合
firebase deploy --only firestore:rules
```

## 実装されたセキュリティ機能

### ✅ 認証ベースのアクセス制御
- すべてのデータアクセスに認証が必要
- ユーザーは自分のデータのみアクセス可能

### ✅ コレクション別アクセス制御

1. **users** - ユーザーは自分のプロフィールのみアクセス
2. **characters** - ユーザーは自分のキャラクターのみアクセス  
3. **threads** - ユーザーは自分のチャットスレッドのみアクセス
4. **messages** - ユーザーは自分のメッセージのみアクセス
5. **billing_transactions** - ユーザーは自分の課金情報のみ閲覧（作成はサーバーのみ）
6. **admin_actions** - 管理者のみアクセス
7. **design_jobs** - ユーザーは自分のデザインジョブのみアクセス
8. **temp_storage** - 一時ファイル用（自動削除対象）

### ✅ 管理者権限
- 管理者はデバッグ用に全データを読み取り可能
- 管理者権限は `users/{userId}.isAdmin` フィールドで制御

### ✅ デフォルト拒否ルール
- 未定義のコレクションはすべてアクセス拒否

## 検証方法

### テスト手順
1. ログイン状態でアプリケーションにアクセス
2. キャラクター作成・編集ができることを確認
3. 他のユーザーのデータにアクセスできないことを確認

### Firebase Console での確認
1. Firestore Database > ルール で現在のルールを確認
2. 「シミュレーター」でテストリクエストを実行

## 注意事項

- **変更は24時間以内に反映されない場合があります**
- ルール変更後は十分なテストを行ってください
- エラーが発生した場合は、Firebase Consoleのログを確認
- 本番環境での変更は慎重に行ってください

## トラブルシューティング

### よくあるエラー

1. **Permission denied**: ルールが正しく適用されていない
   - Firebase Consoleでルールの公開状態を確認
   - 最大24時間待機

2. **Authentication required**: ユーザーが正しく認証されていない  
   - NextAuthの設定を確認
   - ブラウザのDevToolsでセッション状態を確認

3. **Admin access denied**: 管理者フラグが設定されていない
   - `users/{userId}.isAdmin = true` を設定

## 緊急時の対応

もしルール適用後にアプリケーションが動作しない場合：

1. Firebase Console > Firestore Database > ルール
2. 一時的に以下のルールを適用（**本番使用厳禁**）:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. 問題を修正後、適切なルールに戻す

---

**このファイルは設定完了後、セキュリティ上の理由により削除することをお勧めします。**