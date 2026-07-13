"use client";

import { useRouter } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Admission } from "../../admissions/columns";

function formatDate(value: string | undefined) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

interface PatientAdmissionsTableProps {
  admissions: Admission[];
}

export function PatientAdmissionsTable({
  admissions,
}: PatientAdmissionsTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Admission Date</TableHead>
            <TableHead>Facility</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Discharge Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admissions.length ? (
            admissions.map((admission) => (
              <TableRow
                key={admission.admissionId}
                className="cursor-pointer"
                onClick={() =>
                  router.push(`/forms/admissions/${admission.admissionId}`)
                }
              >
                <TableCell>{formatDate(admission.admissionDate)}</TableCell>
                <TableCell>{admission.facility ?? "N/A"}</TableCell>
                <TableCell>{admission.type}</TableCell>
                <TableCell>{formatDate(admission.dischargeDate)}</TableCell>
                <TableCell>{admission.status ?? "N/A"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No admissions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
