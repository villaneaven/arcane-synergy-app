import { cookies } from "next/headers";
import { Patient } from "./columns";
import { PatientsTableWrapper } from "./patients-table-wrapper";
import { getAccessToken } from "@/lib/auth";
import { PAGE_SIZE_COOKIE, parsePageSize } from "./page-size";
import { getServerApiBaseUrl } from "@/lib/api";

interface PatientsResponse {
  items: Patient[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export default async function Patients() {
  const accessToken = await getAccessToken();
  const cookieStore = await cookies();
  const pageSize = parsePageSize(cookieStore.get(PAGE_SIZE_COOKIE)?.value);

  const res = await fetch(
    `${getServerApiBaseUrl()}/api/patients?page=1&pageSize=${pageSize}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch patients");
  }

  const data: PatientsResponse = await res.json();

  return (
    <div className="block px-8 py-4 justify-center bg-background font-sans dark:bg-black">
      <PatientsTableWrapper
        initialData={data.items}
        initialTotalCount={data.totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
