import { Session } from 'next-auth';

// 管理者設定
const ADMIN_EMAIL = 'tera.mode@gmail.com';
const ADMIN_PASSWORD = 'Moyasi23';

// 管理者メールアドレスかチェック
export function isAdminUser(session: Session | null): boolean {
  if (!session?.user?.email) {
    return false;
  }
  return session.user.email === ADMIN_EMAIL;
}

// パスワード検証
export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

// デバッグ認証状態をセッションストレージで管理
export function setDebugAuthStatus(authenticated: boolean) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('debug_auth', authenticated.toString());
  }
}

export function getDebugAuthStatus(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return sessionStorage.getItem('debug_auth') === 'true';
}

export function clearDebugAuthStatus() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('debug_auth');
  }
}