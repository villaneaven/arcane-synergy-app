import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

const {
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_TENANT_ID,
  AZURE_AD_API_SCOPE,
  AZURE_AD_API_ID_URI,
  NEXTAUTH_SECRET,
} = process.env;

if (!AZURE_AD_CLIENT_ID || !AZURE_AD_CLIENT_SECRET || !AZURE_AD_TENANT_ID) {
  throw new Error("The Azure AD environment variables are not set.");
}

const apiScope =
  AZURE_AD_API_SCOPE ?? `api://${AZURE_AD_CLIENT_ID}/.access_as_user`;
const authScope = `openid profile email offline_access ${apiScope}`;

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refresh_token) {
      throw new Error("Missing refresh token");
    }

    const url = `https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: AZURE_AD_CLIENT_ID!,
      client_secret: AZURE_AD_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
      scope: authScope,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      access_token: refreshedTokens.access_token,
      expires_at: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET,
  providers: [
    AzureADProvider({
      clientId: AZURE_AD_CLIENT_ID,
      clientSecret: AZURE_AD_CLIENT_SECRET,
      tenantId: AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: authScope,
          resource: AZURE_AD_API_ID_URI,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
        };
      }

      if (token.expires_at && Date.now() < token.expires_at * 1000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (session) {
        session = Object.assign({}, session, {
          access_token: token.access_token,
          accessToken: token.access_token,
          error: token.error,
        });
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
