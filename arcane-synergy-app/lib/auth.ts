import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getAccessToken(): Promise<string> {
  const session = await getServerSession(authOptions);

  if (!session?.access_token || session.error === "RefreshAccessTokenError") {
    redirect("/api/auth/signin?callbackUrl=%2F");
  }

  return session.access_token;
}
