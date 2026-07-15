import { Admission } from "./columns";
import { AdmissionsTableWrapper } from "./admissions-table-wrapper";
import { getAccessToken } from "@/lib/auth";

export default async function Admissions() {
  const accessToken = await getAccessToken();

  console.log("Access token in Admissions page:", accessToken);

  const res = await fetch("http://localhost:5201/api/admissions", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch admissions");
  }

  const data: Admission[] = await res.json();

  return (
    <div className="block px-8 py-4 justify-center bg-background font-sans dark:bg-black">
      <AdmissionsTableWrapper initialData={data} />
    </div>
  );
}
