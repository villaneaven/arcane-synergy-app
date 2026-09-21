import { Transfer } from "./columns";
import { TransferTableWrapper } from "./transfer-table-wrapper";
import { getAccessToken } from "@/lib/auth";
import { getServerApiBaseUrl } from "@/lib/api";

export default async function Transfers({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const accessToken = await getAccessToken();
  const { id } = await params;

  const res = await fetch(
    `${getServerApiBaseUrl()}/api/transfers/admission/${id}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch transfers");
  }

  const data: Transfer[] = await res.json();

  return (
    <div className="block px-8 py-4 justify-center bg-background font-sans dark:bg-black">
      <TransferTableWrapper initialData={data} admissionId={id} />
    </div>
  );
}
