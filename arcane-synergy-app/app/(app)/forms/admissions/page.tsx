import { cookies } from "next/headers";
import { Admission } from "./columns";
import { AdmissionsTableWrapper } from "./admissions-table-wrapper";
import { getAccessToken } from "@/lib/auth";
import { PAGE_SIZE_COOKIE, parsePageSize } from "./page-size";

interface AdmissionsResponse {
  items: Admission[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export default async function Admissions() {
  const accessToken = await getAccessToken();
  const cookieStore = await cookies();
  const pageSize = parsePageSize(cookieStore.get(PAGE_SIZE_COOKIE)?.value);

  const res = await fetch(
    `http://localhost:5201/api/admissions?page=1&pageSize=${pageSize}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch admissions");
  }

  const data: AdmissionsResponse = await res.json();

  return (
    <div className="block px-8 py-4 justify-center bg-background font-sans dark:bg-black">
      <AdmissionsTableWrapper
        initialData={data.items}
        initialTotalCount={data.totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
