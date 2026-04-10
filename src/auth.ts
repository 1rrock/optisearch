import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Kakao from "next-auth/providers/kakao"
import type { NextAuthConfig } from "next-auth"
import type { JWT } from "@auth/core/jwt"
import type { Session } from "@auth/core/types"

// ---------------------------------------------------------------------------
// Module augmentation
// ---------------------------------------------------------------------------
declare module "@auth/core/jwt" {
  interface JWT {
    providerId?: string
  }
}

// ---------------------------------------------------------------------------
// Auth.js v5 configuration — pure JWT, no DB adapter
// User profiles are managed separately in user_profiles table.
// ---------------------------------------------------------------------------
const config: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],

  // No adapter — Auth.js stores sessions in JWT only.
  // Our app manages user data in user_profiles table via user-service.ts.

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    /**
     * Persist provider profile info into the JWT on sign-in.
     */
    async jwt({ token, account, profile }): Promise<JWT> {
      if (account && profile) {
        const provider = account.provider

        if (provider === "google") {
          token.providerId = `google_${account.providerAccountId}`
          token.name = profile.name ?? token.name
          token.email = profile.email ?? token.email
          token.picture = (profile as any).picture ?? token.picture
        } else if (provider === "kakao") {
          token.providerId = `kakao_${account.providerAccountId}`
          const kakaoAccount = (profile as any).kakao_account
          token.name = (profile as any).properties?.nickname ?? token.name
          token.email = kakaoAccount?.email ?? token.email
          token.picture = (profile as any).properties?.profile_image ?? token.picture
        }
      }

      return token
    },

    /**
     * Expose user info on the session object.
     */
    async session({ session, token }): Promise<Session> {
      const jwt = token as JWT
      if (session.user) {
        session.user.id = (jwt.providerId as string) ?? jwt.sub ?? ""
        session.user.name = (jwt.name as string) ?? ""
        session.user.email = (jwt.email as string) ?? ""
        session.user.image = (jwt.picture as string) ?? ""
      }
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
