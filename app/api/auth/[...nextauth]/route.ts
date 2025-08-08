import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        isSignUp: { label: 'Sign Up', type: 'boolean' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          let userCredential;
          
          if (credentials.isSignUp === 'true') {
            // 新規登録
            userCredential = await createUserWithEmailAndPassword(
              auth,
              credentials.email,
              credentials.password
            );
          } else {
            // ログイン
            userCredential = await signInWithEmailAndPassword(
              auth,
              credentials.email,
              credentials.password
            );
          }

          const user = userCredential.user;
          
          // ユーザー情報をより安全に取得
          return {
            id: user.uid,
            email: user.email || credentials.email,
            name: user.displayName || user.email?.split('@')[0] || 'ユーザー',
            image: user.photoURL || null,
          };
        } catch (error: any) {
          console.error('Firebase auth error:', error);
          
          // Firebase エラーを分かりやすいメッセージに変換
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            throw new Error('メールアドレスまたはパスワードが正しくありません');
          } else if (error.code === 'auth/email-already-in-use') {
            throw new Error('このメールアドレスは既に使用されています');
          } else if (error.code === 'auth/weak-password') {
            throw new Error('パスワードは6文字以上で入力してください');
          } else if (error.code === 'auth/invalid-email') {
            throw new Error('有効なメールアドレスを入力してください');
          }
          
          throw new Error('認証に失敗しました');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };