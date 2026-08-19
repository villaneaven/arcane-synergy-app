import { cookies } from "next/headers";
import { Patient } from "./columns";
import { PatientsTableWrapper } from "./patients-table-wrapper";
import { getAccessToken } from "@/lib/auth";
import { PAGE_SIZE_COOKIE, parsePageSize } from "./page-size";

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

  const apiBaseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:5201";

  const res = await fetch(
    `${apiBaseUrl}/api/patients?page=1&pageSize=${pageSize}`,
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
