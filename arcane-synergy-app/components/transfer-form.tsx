"use client";

import * as React from "react";

import { DatePickerInput } from "@/components/date-picker-input";
import { DatePickerTimeInput } from "@/components/date-picker-time-input";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label>
      {children} <span className="text-red-500">*</span>
    </Label>
  );
}

export function TransferForm({
  onSubmit,
  onCancel,
  initialValues,
}: {
  onSubmit: (formData: {
    admissionDate: string;
    dischargeDate?: string | undefined;
    isFinalDischarge?: boolean;
    facilityType?: string;
    facility?: string;
    type: string;
    timeOfAdmission?: string | undefined;
    dx?: string;
    notificationSource?: string;
    dateNotified: string;
    dischargeTo?: string;
  }) => Promise<void>;
  onCancel?: () => void;
  initialValues?: {
    admissionDate?: string;
    dischargeDate?: string;
    isFinalDischarge?: boolean;
    facilityType?: string;
    facility?: string;
    type?: string;
    timeOfAdmission?: string;
    dx?: string;
    notificationSource?: string;
    dateNotified?: string;
    dischargeTo?: string;
  };
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [admissionDate, setAdmissionDate] = React.useState<Date | undefined>(
    () =>
      initialValues?.admissionDate
        ? new Date(initialValues.admissionDate)
        : undefined,
  );
  const [notificationDate, setNotificationDate] = React.useState<
    Date | undefined
  >(() =>
    initialValues?.dateNotified
      ? new Date(initialValues.dateNotified)
      : undefined,
  );
  const [dischargeDate, setDischargeDate] = React.useState<Date | undefined>(
    () =>
      initialValues?.dischargeDate
        ? new Date(initialValues.dischargeDate)
        : undefined,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const admissionData: {
      admissionDate: string;
      dischargeDate?: string | undefined;
      isFinalDischarge?: boolean;
      facilityType?: string;
      facility?: string;
      type: string;
      timeOfAdmission?: string | undefined;
      dx?: string;
      notificationSource?: string;
      dateNotified: string;
      dischargeTo?: string;
    } = {
      facilityType: formData.get("facility-type") as string,
      facility: formData.get("facility") as string,
      type: formData.get("type") as string,
      admissionDate: admissionDate ? admissionDate.toISOString() : "",
      dx: formData.get("dx") as string,
      notificationSource: formData.get("notification-source") as string,
      dateNotified: notificationDate ? notificationDate.toISOString() : "",
      dischargeDate: dischargeDate ? dischargeDate.toISOString() : undefined,
      isFinalDischarge: formData.get("is-final-discharge") === "on",
      dischargeTo: formData.get("discharge-to") as string,
    };

    try {
      await onSubmit(admissionData);

      // Reset form state
      setAdmissionDate(undefined);
      setNotificationDate(undefined);
      setDischargeDate(undefined);
    } catch (error) {
      console.error("Failed to submit transfer data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-3">
          <DatePickerTimeInput
            label="Admission Date"
            id="admission-date"
            name="admission-date"
            value={admissionDate}
            onChange={setAdmissionDate}
            required
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="discharge-date">Discharge Date</Label>
          <DatePickerInput
            id="discharge-date"
            name="discharge-date"
            value={dischargeDate}
            onChange={setDischargeDate}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="is-final-discharge">Final Discharge</Label>
          <Checkbox
            id="is-final-discharge"
            name="is-final-discharge"
            defaultChecked={initialValues?.isFinalDischarge ?? false}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="facility-type">Facility Type</Label>
          <Input
            id="facility-type"
            name="facility-type"
            defaultValue={initialValues?.facilityType ?? ""}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="facility">Facility</Label>
          <Input
            id="facility"
            name="facility"
            defaultValue={initialValues?.facility ?? ""}
          />
        </div>
        <div className="grid gap-3">
          <RequiredLabel>Type</RequiredLabel>
          <Input
            id="type"
            name="type"
            defaultValue={initialValues?.type ?? ""}
            required
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="dx">DX</Label>
          <Input id="dx" name="dx" defaultValue={initialValues?.dx ?? ""} />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="notification-source">Notification Source</Label>
          <Input
            id="notification-source"
            name="notification-source"
            defaultValue={initialValues?.notificationSource ?? ""}
          />
        </div>
        <div className="grid gap-3">
          <RequiredLabel>Date Notified</RequiredLabel>
          <DatePickerInput
            id="date-notified"
            name="date-notified"
            value={notificationDate}
            onChange={setNotificationDate}
            required
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="discharge-to">Discharge To</Label>
          <Input
            id="discharge-to"
            name="discharge-to"
            defaultValue={initialValues?.dischargeTo ?? ""}
          />
        </div>
      </div>
      <div className="flex gap-3 pt-6 justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
