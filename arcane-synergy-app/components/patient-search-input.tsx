"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { API_BASE_URL } from "@/lib/api";

export const SEARCH_DEBOUNCE_MS = 500;
const MAX_RESULTS = 10;

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

type SearchResponse = { key: string; results: PatientOption[] | null };

export function PatientSearchInput({
  value,
  onChange,
  id = "patient",
  name = "patient",
  required,
}: PatientSearchInputProps) {
  const { data: session } = useSession();
  const accessToken = (session as { access_token?: string } | null)
    ?.access_token;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [attempt, setAttempt] = React.useState(0);
  const [response, setResponse] = React.useState<SearchResponse | null>(null);

  React.useEffect(() => {
    inputRef.current?.setCustomValidity(
      required && !value ? "Select a patient from the list." : "",
    );
  }, [required, value]);

  React.useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedQuery(searchQuery.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const requestKey = `${attempt}:${debouncedQuery}`;

  React.useEffect(() => {
    if (!debouncedQuery || !accessToken) return;

    const controller = new AbortController();
    const key = `${attempt}:${debouncedQuery}`;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/Patients/search?query=${encodeURIComponent(debouncedQuery)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          },
        );
        if (!res.ok) throw new Error(`Patient search failed: ${res.status}`);

        const data: Parameters<typeof toPatientOption>[0][] = await res.json();
        const results = data
          .map(toPatientOption)
          .filter((p): p is PatientOption => p !== null)
          .slice(0, MAX_RESULTS);
        if (!controller.signal.aborted) setResponse({ key, results });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error searching patients:", error);
        setResponse({ key, results: null });
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery, accessToken, attempt]);

  const trimmedQuery = searchQuery.trim();
  const current = response?.key === requestKey ? response : null;
  const isLoading =
    trimmedQuery !== "" && (trimmedQuery !== debouncedQuery || !current);
  const results = !isLoading ? (current?.results ?? null) : null;
  const hasError = !isLoading && current !== null && current.results === null;
  const showPopover = open && trimmedQuery !== "";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setOpen(true);
  };

  const handleSelectPatient = (patient: PatientOption) => {
    setSearchQuery("");
    setDebouncedQuery("");
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
    <Popover open={showPopover} onOpenChange={setOpen}>
      {hiddenInput}
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative w-full">
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
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            required={required}
          />
          {isLoading && (
            <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="center"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
      >
        {isLoading ? (
          <p className="text-muted-foreground p-4 text-center text-sm">
            Searching…
          </p>
        ) : hasError ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center text-sm">
            <p role="alert">Couldn&apos;t search patients.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </Button>
          </div>
        ) : results && results.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">
            No patients match &ldquo;{trimmedQuery}&rdquo;.
          </p>
        ) : results ? (
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
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
