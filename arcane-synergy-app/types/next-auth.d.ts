import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    access_token?: string;
    accessToken?: string;
    error?: "RefreshAccessTokenError";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    error?: "RefreshAccessTokenError";
  }
}
