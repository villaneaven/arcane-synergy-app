import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Session } from "next-auth";

interface SessionWithAccessToken extends Session {
  access_token: string;
}

export async function getAccessToken(): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as SessionWithAccessToken | null;
  return session?.access_token ?? null;
}
