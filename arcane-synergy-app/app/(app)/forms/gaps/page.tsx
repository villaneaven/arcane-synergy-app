import { cookies } from "next/headers";
import { Gap, GapFilterOptions } from "./columns";
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
  const requestInit: RequestInit = {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const [res, filtersRes] = await Promise.all([
    fetch(
      `${getServerApiBaseUrl()}/api/gaps?page=1&pageSize=${pageSize}`,
      requestInit,
    ),
    fetch(`${getServerApiBaseUrl()}/api/gaps/filters`, requestInit),
  ]);

  if (!res.ok) {
    throw new Error("Failed to fetch gaps");
  }
  if (!filtersRes.ok) {
    throw new Error("Failed to fetch gap filter options");
  }

  const data: GapsResponse = await res.json();
  const filterOptions: GapFilterOptions = await filtersRes.json();

  return (
    <div className="block px-8 py-4 justify-center bg-background font-sans dark:bg-black">
      <GapsTableWrapper
        initialData={data.items}
        initialTotalCount={data.totalCount}
        pageSize={pageSize}
        filterOptions={filterOptions}
      />
    </div>
  );
}
