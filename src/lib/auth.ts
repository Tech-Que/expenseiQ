import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

// Cache the verifier at module scope — it memoises the JWKS fetch so we don't
// hit Cognito on every sign-in.
const idTokenVerifier =
  userPoolId && clientId
    ? CognitoJwtVerifier.create({ userPoolId, tokenUse: "id", clientId })
    : null;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "cognito",
      name: "Cognito",
      credentials: {
        idToken: { label: "idToken", type: "text" },
        accessToken: { label: "accessToken", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken || !idTokenVerifier) return null;
        try {
          const payload = await idTokenVerifier.verify(credentials.idToken);
          if (!payload.sub) return null;
          const emailClaim = typeof payload.email === "string" ? payload.email : undefined;
          const nameClaim = typeof payload.name === "string" ? payload.name : undefined;
          const cognitoUsername =
            typeof payload["cognito:username"] === "string"
              ? (payload["cognito:username"] as string)
              : undefined;
          return {
            id: payload.sub,
            email: emailClaim ?? null,
            name: nameClaim ?? cognitoUsername ?? emailClaim ?? null,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (token.email) session.user.email = token.email;
        if (token.name) session.user.name = token.name;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
