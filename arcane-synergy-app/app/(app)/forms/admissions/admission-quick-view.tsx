"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditAdmissionDialog } from "@/components/edit-admission-dialog";

import type { Admission } from "./columns";
import {
  FlagBadge,
  StatusBadge,
  TypeBadge,
  daysBetween,
  formatDate,
  formatDateTime,
  formatStayLength,
  formatTime,
  orEmpty,
} from "./cell-format";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      <dl className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-4 gap-y-1.5 text-sm">
        {children}
      </dl>
    </section>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{orEmpty(value)}</dd>
    </>
  );
}

export function AdmissionQuickView({
  admission,
  open,
  onOpenChange,
  onDataChange,
}: {
  admission: Admission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChange?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {admission ? (
          <AdmissionDetails
            admission={admission}
            onDataChange={onDataChange}
          />
        ) : (
          <SheetHeader>
            <SheetTitle>Admission</SheetTitle>
            <SheetDescription>
              This admission is no longer on the current page.
            </SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AdmissionDetails({
  admission,
  onDataChange,
}: {
  admission: Admission;
  onDataChange?: () => void;
}) {
  const patient = admission.patient;
  const patientDetails = [
    formatDate(patient?.dob) && `DOB ${formatDate(patient?.dob)}`,
    patient?.mrn && `MRN ${patient.mrn}`,
    patient?.group,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <SheetHeader className="border-b pr-10">
        <SheetTitle className="text-lg">
          {patient?.fullName || "Unknown patient"}
        </SheetTitle>
        <SheetDescription>{patientDetails || "Admission details"}</SheetDescription>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <StatusBadge status={admission.status} />
          <TypeBadge type={admission.type} />
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-6 p-4">
        <Section title="Stay">
          <Item label="Facility" value={admission.facility} />
          <Item label="Facility type" value={admission.facilityType} />
          <Item
            label="Admitted"
            value={[
              formatDate(admission.admissionDate),
              formatTime(admission.admissionDate),
            ]
              .filter(Boolean)
              .join(" at ")}
          />
          <Item label="Discharged" value={formatDate(admission.dischargeDate)} />
          <Item
            label="Length of stay"
            value={formatStayLength(
              daysBetween(admission.admissionDate, admission.dischargeDate),
            )}
          />
          <Item label="Discharge to" value={admission.dischargeTo} />
          <Item label="DX" value={admission.dx} />
        </Section>

        <Section title="Notification">
          <Item label="Source" value={admission.notificationSource} />
          <Item label="Date notified" value={formatDate(admission.dateNotified)} />
        </Section>

        <Section title="Follow-up">
          <Item label="TCM due" value={formatDate(admission.tcmDueDate)} />
          <Item label="Date seen" value={formatDate(admission.dateSeen)} />
          <Item label="Seen by" value={admission.seenBy} />
          <Item label="Patient engagement" value={admission.patientEngagement} />
        </Section>

        <Section title="History">
          <Item
            label="Readmission"
            value={<FlagBadge flagged={admission.readmissionFlag} />}
          />
          <Item
            label="Next admission"
            value={formatDate(admission.nextAdmissionDate)}
          />
          <Item
            label="Final discharge"
            value={formatDate(admission.finalDischargeDate)}
          />
          <Item label="Transfers" value={admission.countOfTransfers} />
          <Item label="Total ER visits" value={admission.totalERVisits} />
          <Item label="Total ADM visits" value={admission.totalADMVisits} />
        </Section>

        <section className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Notes
          </h3>
          <p className="text-sm whitespace-pre-wrap">
            {orEmpty(admission.notes)}
          </p>
        </section>

        {admission.lastEditedBy || admission.lastEditedAt ? (
          <p className="text-muted-foreground text-xs">
            Last edited
            {admission.lastEditedBy ? ` by ${admission.lastEditedBy}` : ""}
            {admission.lastEditedAt
              ? ` on ${formatDateTime(admission.lastEditedAt)}`
              : ""}
          </p>
        ) : null}
      </div>

      <SheetFooter className="bg-background sticky bottom-0 flex-row flex-wrap border-t">
        <EditAdmissionDialog
          admission={admission}
          onAdmissionUpdated={onDataChange}
          trigger={<Button>Edit admission</Button>}
        />
        <Button variant="outline" asChild>
          <Link href={`/forms/admissions/${admission.admissionId}`}>
            View transfers
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/forms/patients/${admission.patientID}`}>
            View patient
          </Link>
        </Button>
      </SheetFooter>
    </>
  );
}
