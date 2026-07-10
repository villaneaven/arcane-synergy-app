"use client";

import * as React from "react";

import { DatePickerInput } from "@/components/date-picker-input";
import { DatePickerTimeInput } from "@/components/date-picker-time-input";
import { PatientSearchInput } from "@/components/patient-search-input";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DX_OPTIONS,
  FACILITY_OPTIONS,
  FACILITY_TYPE_OPTIONS,
  NOTIFICATION_SOURCE_OPTIONS,
  TYPE_OPTIONS,
} from "@/lib/admission-options";

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label>
      {children} <span className="text-red-500">*</span>
    </Label>
  );
}

export function AdmissionForm({
  onSubmit,
  onCancel,
  initialValues,
}: {
  onSubmit: (formData: {
    patientID: string;
    facilityType?: string;
    facility?: string;
    type: string;
    admissionDate: string;
    dx?: string;
    notificationSource?: string;
    dateNotified: string;
    dischargeDate?: string | undefined;
    dischargeTo?: string;
    dateSeen?: string | undefined;
    seenBy?: string;
  }) => Promise<void>;
  onCancel?: () => void;
  initialValues?: {
    patientID?: string;
    facilityType?: string;
    facility?: string;
    type?: string;
    admissionDate?: string;
    dx?: string;
    notificationSource?: string;
    dateNotified?: string;
    dischargeDate?: string;
    dischargeTo?: string;
    dateSeen?: string;
    seenBy?: string;
  };
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [patientID, setPatientID] = React.useState<number | undefined>(
    initialValues?.patientID
      ? parseInt(initialValues.patientID, 10)
      : undefined,
  );
  const [facilityType, setFacilityType] = React.useState<string>(
    initialValues?.facilityType ?? "",
  );
  const [facility, setFacility] = React.useState<string>(
    initialValues?.facility ?? "",
  );
  const [type, setType] = React.useState<string>(initialValues?.type ?? "");
  const [admissionDate, setAdmissionDate] = React.useState<Date | undefined>(
    () =>
      initialValues?.admissionDate
        ? new Date(initialValues.admissionDate)
        : undefined,
  );
  const [dx, setDx] = React.useState<string>(initialValues?.dx ?? "");
  const [notificationSource, setNotificationSource] = React.useState<string>(
    initialValues?.notificationSource ?? "",
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
  const [dateSeen, setDateSeen] = React.useState<Date | undefined>(() =>
    initialValues?.dateSeen ? new Date(initialValues.dateSeen) : undefined,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const admissionData: {
      patientID: string;
      facilityType?: string;
      facility?: string;
      type: string;
      admissionDate: string;
      dx?: string;
      notificationSource?: string;
      dateNotified: string;
      dischargeDate?: string | undefined;
      dischargeTo?: string;
      dateSeen?: string | undefined;
      seenBy?: string;
    } = {
      patientID: patientID?.toString() || "",
      facilityType: formData.get("facility-type") as string,
      facility: formData.get("facility") as string,
      type: formData.get("type") as string,
      admissionDate: admissionDate ? admissionDate.toISOString() : "",
      dx: formData.get("dx") as string,
      notificationSource: formData.get("notification-source") as string,
      dateNotified: notificationDate ? notificationDate.toISOString() : "",
      dischargeDate: dischargeDate ? dischargeDate.toISOString() : undefined,
      dischargeTo: formData.get("discharge-to") as string,
      dateSeen: dateSeen ? dateSeen.toISOString() : undefined,
      seenBy: formData.get("seen-by") as string,
    };

    try {
      await onSubmit(admissionData);

      // Reset form state
      setPatientID(undefined);
      setAdmissionDate(undefined);
      setNotificationDate(undefined);
      setDischargeDate(undefined);
      setDateSeen(undefined);
    } catch (error) {
      console.error("Failed to submit admission data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-3">
          <RequiredLabel>Patient</RequiredLabel>
          <PatientSearchInput
            id="patient"
            name="patient"
            value={patientID}
            onChange={setPatientID}
            required
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="facility-type">Facility Type</Label>
          <Select
            value={facilityType}
            onValueChange={(value) => {
              setFacilityType(value);
              setFacility("");
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select a facility type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Facility Type</SelectLabel>
                {FACILITY_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="facility">Facility</Label>
          <Select
            disabled={!facilityType}
            value={facility}
            onValueChange={setFacility}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select a facility" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{facilityType} Facility</SelectLabel>
                {FACILITY_OPTIONS[facilityType]?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                )) || (
                  <SelectItem disabled value="none">
                    No facilities available
                  </SelectItem>
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <RequiredLabel>Type</RequiredLabel>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Type</SelectLabel>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
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
          <Label htmlFor="dx">DX</Label>
          <Select value={dx} onValueChange={setDx}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select a DX" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>DX</SelectLabel>
                {DX_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="notification-source">Notification Source</Label>
          <Select
            value={notificationSource}
            onValueChange={setNotificationSource}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select a notification source" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Notification Source</SelectLabel>
                {NOTIFICATION_SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
          <Label htmlFor="discharge-date">Discharge Date</Label>
          <DatePickerInput
            id="discharge-date"
            name="discharge-date"
            value={dischargeDate}
            onChange={setDischargeDate}
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
        <div className="grid gap-3">
          <Label htmlFor="date-seen">Date Seen</Label>
          <DatePickerInput
            id="date-seen"
            name="date-seen"
            value={dateSeen}
            onChange={setDateSeen}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="seen-by">Seen by</Label>
          <Input
            id="seen-by"
            name="seen-by"
            defaultValue={initialValues?.seenBy ?? ""}
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
