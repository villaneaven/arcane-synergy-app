import { cookies } from "next/headers";
import { Gap } from "./columns";
import { GapsTableWrapper } from "./gaps-table-wrapper";
import { getAccessToken } from "@/lib/auth";
import { PAGE_SIZE_COOKIE, parsePageSize } from "./page-size";
import { getServerApiBaseUrl } from "@/lib/api";

interface GapsResponse {
  items: Gap[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export default async function Gaps() {
  const accessToken = await getAccessToken();
  const cookieStore = await cookies();
  const pageSize = parsePageSize(cookieStore.get(PAGE_SIZE_COOKIE)?.value);

  const res = await fetch(
    `${getServerApiBaseUrl()}/api/gaps?page=1&pageSize=${pageSize}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch gaps");
  }

  const data: GapsResponse = await res.json();

  return (
    <div className="block px-8 py-4 justify-center bg-background font-sans dark:bg-black">
      <GapsTableWrapper
        initialData={data.items}
        initialTotalCount={data.totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
