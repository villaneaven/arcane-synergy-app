import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getAccessToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.access_token ?? null;
}
