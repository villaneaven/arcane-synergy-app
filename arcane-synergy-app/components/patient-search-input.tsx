"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { API_BASE_URL } from "@/lib/api";

export type PatientOption = {
  patientID: number;
  fullName: string;
  mrn?: string | null;
};

export function toPatientOption(
  patient:
    | {
        patientID: number | string;
        fullName?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        mrn?: string | null;
      }
    | null
    | undefined,
): PatientOption | null {
  if (!patient) return null;
  const patientID = Number(patient.patientID);
  if (!Number.isFinite(patientID) || patientID <= 0) return null;
  const fullName =
    patient.fullName?.trim() ||
    [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() ||
    `Patient #${patientID}`;
  return { patientID, fullName, mrn: patient.mrn ?? null };
}

interface PatientSearchInputProps {
  /** The selected patient, or null when none is selected. */
  value: PatientOption | null;
  /** Called with the picked patient, or null when the selection is cleared. */
  onChange: (patient: PatientOption | null) => void;
  id?: string;
  name?: string;
  required?: boolean;
}

export function PatientSearchInput({
  value,
  onChange,
  id = "patient",
  name = "patient",
  required,
}: PatientSearchInputProps) {
  const { data: session } = useSession();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<PatientOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    inputRef.current?.setCustomValidity(
      required && !value ? "Select a patient from the list." : "",
    );
  }, [required, value]);

  const searchPatients = React.useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const accessToken = (session as { access_token?: string })
          ?.access_token;
        const response = await fetch(
          `${API_BASE_URL}/api/Patients/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to search patients");
        }

        const data: Parameters<typeof toPatientOption>[0][] =
          await response.json();
        setResults(
          data
            .map(toPatientOption)
            .filter((p): p is PatientOption => p !== null)
            .slice(0, 10),
        );
      } catch (error) {
        console.error("Error searching patients:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [session],
  );

  const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timeoutRef.current), []);
  const debouncedSearch = React.useCallback(
    (query: string) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        searchPatients(query);
      }, 500);
    },
    [searchPatients],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setOpen(true);
    if (query.trim()) {
      debouncedSearch(query);
    } else {
      clearTimeout(timeoutRef.current);
      setResults([]);
    }
  };

  const handleSelectPatient = (patient: PatientOption) => {
    clearTimeout(timeoutRef.current);
    setSearchQuery("");
    setResults([]);
    setOpen(false);
    onChange(patient);
  };

  const handleClear = () => {
    onChange(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const hiddenInput = (
    <input type="hidden" name={name} value={value?.patientID ?? ""} />
  );

  if (value) {
    return (
      <div
        id={id}
        className="flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm"
      >
        {hiddenInput}
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="truncate font-medium">{value.fullName}</span>
          {value.mrn ? (
            <span className="text-muted-foreground shrink-0 text-xs">
              MRN: {value.mrn}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-mr-2 size-7"
          onClick={handleClear}
          aria-label={`Clear patient ${value.fullName}`}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {hiddenInput}
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            id={id}
            type="text"
            autoComplete="off"
            placeholder="Search patients by name or MRN..."
            className="pl-9"
            value={searchQuery}
            onChange={handleInputChange}
            required={required}
            onFocus={() => {
              setOpen(true);
              inputRef.current?.focus();
            }}
            onBlur={() => {
              if (results.length > 0 || isLoading) {
                setTimeout(() => inputRef.current?.focus(), 0);
              } else {
                setOpen(false);
              }
            }}
          />
          {isLoading && (
            <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          )}
        </div>
      </PopoverTrigger>
      {results.length > 0 && (
        <PopoverContent className="w-96 p-0" align="center">
          <div className="max-h-64 overflow-y-auto">
            {results.map((patient) => (
              <button
                key={patient.patientID}
                type="button"
                onClick={() => handleSelectPatient(patient)}
                className="w-full px-4 py-3 text-left hover:bg-gray-800 hover:rounded border-b last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold">{patient.fullName}</div>
                  {patient.mrn ? (
                    <div className="text-xs text-gray-500">
                      MRN: {patient.mrn}
                    </div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
