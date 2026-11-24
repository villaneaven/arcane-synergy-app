"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditTransferDialog } from "@/components/edit-transfer-dialog";

import type { Transfer } from "./columns";
import {
  FinalDischargeBadge,
  TypeBadge,
  daysBetween,
  formatDate,
  formatDateTime,
  formatStayLength,
  formatTime,
  orEmpty,
} from "../cell-format";

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

export function TransferQuickView({
  transfer,
  open,
  onOpenChange,
  onDataChange,
}: {
  transfer: Transfer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChange?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {transfer ? (
          <TransferDetails transfer={transfer} onDataChange={onDataChange} />
        ) : (
          <SheetHeader>
            <SheetTitle>Transfer</SheetTitle>
            <SheetDescription>
              This transfer is no longer in the list.
            </SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TransferDetails({
  transfer,
  onDataChange,
}: {
  transfer: Transfer;
  onDataChange?: () => void;
}) {
  const admitted = [
    formatDate(transfer.admissionDate),
    formatTime(transfer.admissionDate),
  ]
    .filter(Boolean)
    .join(" at ");

  return (
    <>
      <SheetHeader className="border-b pr-10">
        <SheetTitle className="text-lg">
          {transfer.facility || "Transfer"}
        </SheetTitle>
        <SheetDescription>
          {admitted ? `Admitted ${admitted}` : "Transfer details"}
        </SheetDescription>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <TypeBadge type={transfer.type} />
          {transfer.isFinalDischarge ? <FinalDischargeBadge final /> : null}
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-6 p-4">
        <Section title="Stay">
          <Item label="Facility" value={transfer.facility} />
          <Item label="Facility type" value={transfer.facilityType} />
          <Item label="Admitted" value={admitted} />
          <Item label="Discharged" value={formatDate(transfer.dischargeDate)} />
          <Item
            label="Length of stay"
            value={formatStayLength(
              daysBetween(transfer.admissionDate, transfer.dischargeDate),
            )}
          />
          <Item
            label="Final discharge"
            value={<FinalDischargeBadge final={transfer.isFinalDischarge} />}
          />
          <Item label="Discharge to" value={transfer.dischargeTo} />
          <Item label="DX" value={transfer.dx} />
        </Section>

        <Section title="Notification">
          <Item label="Source" value={transfer.notificationSource} />
          <Item
            label="Date notified"
            value={formatDate(transfer.dateNotified)}
          />
        </Section>

        <section className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Notes
          </h3>
          <p className="text-sm whitespace-pre-wrap">
            {orEmpty(transfer.notes)}
          </p>
        </section>

        {transfer.lastEditedBy || transfer.lastEditedAt ? (
          <p className="text-muted-foreground text-xs">
            Last edited
            {transfer.lastEditedBy ? ` by ${transfer.lastEditedBy}` : ""}
            {transfer.lastEditedAt
              ? ` on ${formatDateTime(transfer.lastEditedAt)}`
              : ""}
          </p>
        ) : null}
      </div>

      <SheetFooter className="bg-background sticky bottom-0 flex-row flex-wrap border-t">
        <EditTransferDialog
          transfer={transfer}
          onTransferUpdated={onDataChange}
          trigger={<Button>Edit transfer</Button>}
        />
      </SheetFooter>
    </>
  );
}
