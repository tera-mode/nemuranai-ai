# Google OAuth ログイン問題の解決手順

## 現在の問題
- Google OAuthサインインで400 Bad Requestエラーが発生
- NextAuthは正常動作、GoogleプロバイダーAPIも正常

## Google Cloud Console設定確認・修正手順

### 1. Google Cloud Consoleにアクセス
https://console.cloud.google.com/

### 2. プロジェクトを選択
現在使用中のプロジェクトを選択

### 3. APIs & Servicesに移動
左メニュー → 「APIs & Services」 → 「Credentials」

### 4. OAuth 2.0 Client IDsを確認
既存のOAuth 2.0 Client IDを編集（Client ID: [YOUR_GOOGLE_CLIENT_ID]）

### 5. Authorized redirect URIs を更新
以下のURIを追加・確認：

```
http://localhost:3000/api/auth/callback/google
https://nemuranai-ai.firebaseapp.com/api/auth/callback/google
https://nemuranai-ai.com/api/auth/callback/google
https://www.nemuranai-ai.com/api/auth/callback/google
```

### 6. Authorized JavaScript origins を更新
以下のオリジンを追加・確認：

```
http://localhost:3000
https://nemuranai-ai.firebaseapp.com
https://nemuranai-ai.com
https://www.nemuranai-ai.com
```

### 7. OAuth consent screen を確認
「OAuth consent screen」タブで以下を確認：
- Application name: AI社員は眠らない
- Authorized domains に以下を追加：
  - localhost
  - nemuranai-ai.firebaseapp.com
  - nemuranai-ai.com

## トラブルシューティング

### よくある問題と解決方法：

1. **redirect_uri_mismatch エラー**
   - Google Cloud Consoleの「Authorized redirect URIs」に正確なコールバックURLを追加

2. **access_blocked エラー**
   - OAuth consent screenを「公開」状態に変更
   - または「テストユーザー」に自分のGmailアドレスを追加

3. **invalid_client エラー**
   - Client IDとClient Secretが正しいか確認
   - .env.localファイルの設定を再確認

## 現在の設定値（.env.local より）
```
GOOGLE_CLIENT_ID=[YOUR_GOOGLE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET]  
NEXTAUTH_URL=http://localhost:3000
```

## 設定完了後のテスト
1. Google Cloud Consoleで設定を保存
2. 数分待ってからブラウザでhttp://localhost:3000にアクセス
3. ログインボタンをクリックしてGoogle認証をテスト