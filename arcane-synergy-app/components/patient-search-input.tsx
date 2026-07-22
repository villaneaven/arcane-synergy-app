"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type PatientSearchResult = {
  patientID: number;
  firstName: string;
  lastName: string;
  fullName: string;
  mrn: string;
};

interface PatientSearchInputProps {
  value?: number;
  onChange?: (patientID: number) => void;
  onValueChange?: (fullName: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
}

export function PatientSearchInput({
  value,
  onChange,
  onValueChange,
  id = "patient",
  name = "patient",
  required,
}: PatientSearchInputProps) {
  const { data: session } = useSession();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<PatientSearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedPatient, setSelectedPatient] =
    React.useState<PatientSearchResult | null>(null);

  React.useEffect(() => {
    if (value && !selectedPatient) {
      const fetchPatient = async () => {
        try {
          const accessToken = (session as { access_token?: string })
            ?.access_token;
          const response = await fetch(
            `http://localhost:5201/api/Patients/${value}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );
          if (response.ok) {
            const patient: PatientSearchResult = await response.json();
            setSelectedPatient(patient);
            setSearchQuery(patient.fullName);
          }
        } catch (error) {
          console.error("Failed to fetch patient:", error);
        }
      };
      fetchPatient();
    }
  }, [value, session, selectedPatient]);

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
          `http://localhost:5201/api/Patients/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to search patients");
        }

        const data: PatientSearchResult[] = await response.json();
        setResults(data.slice(0, 10));
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
      setResults([]);
    }
  };

  const handleSelectPatient = (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.fullName);
    onChange?.(patient.patientID);
    onValueChange?.(patient.fullName);
    setOpen(false);
    setResults([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            id={id}
            name={name}
            type="text"
            placeholder="Search patients by name or MRN..."
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
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading...
              </div>
            ) : (
              <div className="border-0">
                {results.map((patient) => (
                  <button
                    key={patient.patientID}
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-800 hover:rounded border-b last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold">{patient.fullName}</div>
                      <div className="text-xs text-gray-500">
                        MRN: {patient.mrn}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
