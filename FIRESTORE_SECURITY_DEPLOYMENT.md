# Firestore セキュリティルール デプロイ手順

## 現在の状況
- ✅ セキュリティルールファイル作成済み (`firestore.rules`)
- ✅ Firebase設定ファイル作成済み (`firebase.json`)
- ⚠️ セキュリティルールのデプロイが必要

## 手動デプロイ手順

### 1. Firebase Consoleでセキュリティルールを更新

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト `nemuranai-ai` を選択
3. 左メニューから「Firestore Database」を選択
4. 「ルール」タブをクリック
5. 現在のルールを全て削除し、以下のルールをコピー&ペースト：

```javascript
rules_version = '2';

// Firestore Security Rules for nemuranai-ai
// Secure authentication-based access control

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Helper function to check ownership of existing resource
    function ownsResource() {
      return isAuthenticated() && (
        resource == null || 
        resource.data.userId == request.auth.uid
      );
    }
    
    // Helper function to check ownership of new resource
    function ownsNewResource() {
      return isAuthenticated() && 
             request.resource != null && 
             request.resource.data.userId == request.auth.uid;
    }

    // Users collection - users can only access their own data
    match /users/{userId} {
      allow read, write: if isOwner(userId);
      allow create: if isOwner(userId);
    }

    // Characters collection - users can only access their own characters
    match /characters/{characterId} {
      allow read, write, update, delete: if ownsResource();
      allow create: if ownsNewResource();
    }

    // Threads collection - users can only access their own threads
    match /threads/{threadId} {
      allow read, write, update, delete: if ownsResource();
      allow create: if ownsNewResource();
    }

    // Messages subcollection under threads - simplified ownership check
    match /threads/{threadId}/messages/{messageId} {
      allow read, write, create, update, delete: if isAuthenticated();
    }

    // Billing transactions - users can only access their own transactions  
    match /billing_transactions/{transactionId} {
      allow read: if ownsResource();
      allow create: if false; // Only server-side code can create
    }

    // Admin actions - restricted access
    match /admin_actions/{actionId} {
      allow read: if false; // Disabled for now
      allow create: if false; // Only server-side code can create
    }

    // Design jobs - users can only access their own design jobs
    match /design_jobs/{jobId} {
      allow read, write, update, delete: if ownsResource();
      allow create: if ownsNewResource();
    }

    // Temp storage for image uploads - users can only access their own temp files
    match /temp_storage/{tempId} {
      allow read, write, update, delete: if ownsResource();
      allow create: if ownsNewResource();
    }

    // Default deny rule for any other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

6. 「公開」ボタンをクリックしてルールを適用

### 2. CLI デプロイ（ローカル環境で Firebase CLI が利用可能な場合）

```bash
# Firebase CLIにログイン
firebase login

# プロジェクトを使用設定
firebase use nemuranai-ai

# セキュリティルールのみをデプロイ
firebase deploy --only firestore:rules
```

### 3. 設定確認

デプロイ後、以下を確認：
- Firebase Consoleでルールが正しく表示されること
- 認証済みユーザーのみがデータにアクセスできること
- 未認証ユーザーはアクセス拒否されること

## 重要な注意事項

⚠️ **セキュリティルールが適用されるまでは、データベースは危険な状態です**

現在のルール（全読み書き許可）:
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

上記のルールは認証さえあれば全てのデータにアクセス可能な状態なので、**すぐに新しいルールに更新してください**。