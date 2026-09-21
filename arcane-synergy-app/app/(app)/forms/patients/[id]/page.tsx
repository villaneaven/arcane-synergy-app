import { getAccessToken } from "@/lib/auth";
import { Patient } from "../columns";
import { Admission } from "../../admissions/columns";
import { PatientAdmissionsTable } from "./patient-admissions-table";
import { getServerApiBaseUrl } from "@/lib/api";

const SECTION_COLORS = {
  personalInfo: {
    border: "border-l-blue-500 dark:border-l-blue-400",
    heading: "text-blue-700 dark:text-blue-400",
  },
  medicalSummary: {
    border: "border-l-purple-500 dark:border-l-purple-400",
    heading: "text-purple-700 dark:text-purple-400",
  },
  admissions: {
    border: "border-l-amber-500 dark:border-l-amber-400",
    heading: "text-amber-700 dark:text-amber-400",
  },
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

type PatientPageProps = {
  params: {
    id: string;
  };
};

export default async function PatientPage({ params }: PatientPageProps) {
  const accessToken = await getAccessToken();
  const { id } = await params;

  const res = await fetch(`${getServerApiBaseUrl()}/api/Patients/${id}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch admissions");
  }

  const patient: Patient = await res.json();

  const admissionsRes = await fetch(
    `${getServerApiBaseUrl()}/api/admissions/patient/${id}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!admissionsRes.ok) {
    throw new Error("Failed to fetch admissions");
  }

  const admissions: Admission[] = await admissionsRes.json();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Patient ID: {id}</p>
          <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Patient profile and medical summary
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section
          className={`rounded-2xl border border-gray-200 dark:border-gray-700 border-l-4 ${SECTION_COLORS.personalInfo.border} bg-background p-6 shadow-sm`}
        >
          <h2
            className={`text-lg font-semibold ${SECTION_COLORS.personalInfo.heading}`}
          >
            Personal Information
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Date of birth</dt>
              <dd className="font-medium text-black dark:text-zinc-50">
                {formatDate(patient.dob)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">MRN</dt>
              <dd className="font-medium text-black dark:text-zinc-50">
                {patient.mrn}
              </dd>
            </div>
          </dl>
        </section>

        <section
          className={`rounded-2xl border border-gray-200 dark:border-gray-700 border-l-4 ${SECTION_COLORS.medicalSummary.border} bg-background p-6 shadow-sm`}
        >
          <h2
            className={`text-lg font-semibold ${SECTION_COLORS.medicalSummary.heading}`}
          >
            Medical Summary
          </h2>
          <div className="mt-4 space-y-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Clinic</dt>
              <dd className="font-medium text-black dark:text-zinc-50">
                {patient.clinic}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Group</dt>
              <dd className="font-medium text-black dark:text-zinc-50">
                {patient.group}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Insurance</dt>
              <dd className="font-medium text-black dark:text-zinc-50">
                {patient.insurance}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">PCP</dt>
              <dd className="font-medium text-black dark:text-zinc-50">
                {patient.pcp}
              </dd>
            </div>
          </div>
        </section>
      </div>

      <section
        id="admissions"
        className={`mt-6 rounded-2xl border border-gray-200 dark:border-gray-700 border-l-4 ${SECTION_COLORS.admissions.border} bg-background p-6 shadow-sm`}
      >
        <h2
          className={`text-lg font-semibold ${SECTION_COLORS.admissions.heading}`}
        >
          Admissions
        </h2>
        <div className="mt-4">
          <PatientAdmissionsTable admissions={admissions} />
        </div>
      </section>
    </main>
  );
}
