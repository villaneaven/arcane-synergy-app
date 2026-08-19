"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  ColumnDef,
  OnChangeFn,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ButtonLoading } from "@/components/button-loading";
import { NewAdmissionDialog } from "@/components/new-admission-dialog";
import { toast } from "sonner";
import { DatePickerInput } from "@/components/date-picker-input";
import { TYPE_OPTIONS } from "@/lib/admission-options";

interface DataTableProps<
  TData extends {
    admissionId: string;
    patient?: {
      firstName?: string;
      lastName?: string;
      mrn?: string;
      group?: string;
      insurance?: string;
      pcp?: string;
      clinic?: string;
    };
  },
  TValue,
> {
  columns:
    | ColumnDef<TData, TValue>[]
    | ((onAdmissionAdded?: () => void) => ColumnDef<TData, TValue>[]);
  data: TData[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalCount: number;
  isLoading?: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onPageChange: (pageIndex: number) => void;
  onAdmissionAdded?: () => void;
  admissionType: string;
  onAdmissionTypeChange: (value: string) => void;
  startDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  endDate?: Date;
  onEndDateChange: (date: Date | undefined) => void;
}

export function DataTable<
  TData extends {
    admissionId: string;
    patient?: {
      firstName?: string;
      lastName?: string;
      mrn?: string;
      group?: string;
      insurance?: string;
      pcp?: string;
      clinic?: string;
    };
  },
  TValue,
>({
  columns,
  data,
  pageIndex,
  pageSize,
  pageCount,
  totalCount,
  isLoading,
  sorting,
  onSortingChange,
  searchValue,
  onSearchChange,
  onPageChange,
  onAdmissionAdded,
  admissionType,
  onAdmissionTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: DataTableProps<TData, TValue>) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [includeTransfers, setIncludeTransfers] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [pageInput, setPageInput] = React.useState(String(pageIndex + 1));

  React.useEffect(() => {
    setPageInput(String(pageIndex + 1));
  }, [pageIndex]);

  const commitPageInput = () => {
    const parsed = Number(pageInput);
    if (Number.isFinite(parsed) && parsed >= 1) {
      const clamped = Math.min(Math.trunc(parsed), pageCount);
      setPageInput(String(clamped));
      if (clamped !== pageIndex + 1) {
        onPageChange(clamped - 1);
      }
    } else {
      setPageInput(String(pageIndex + 1));
    }
  };

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      totalERVisits: false,
      totalADMVisits: false,
      dayOfWeekAdmitted: false,
      monthAdmitted: false,
      tcmDueDate: false,
      patientEngagement: false,
      readmissionFlag: false,
      nextAdmissionDate: false,
      finalDischargeDate: false,
      countOfTransfers: false,
      status: false,
      transfers: false,
    });
  const [rowSelection, setRowSelection] = React.useState({});

  // Pass the onAdmissionAdded callback to columns so they can refresh data
  const columnsWithCallbacks = React.useMemo(
    () => (typeof columns === "function" ? columns(onAdmissionAdded) : columns),
    [columns, onAdmissionAdded],
  );

  const table = useReactTable({
    data,
    columns: columnsWithCallbacks,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getRowId: (row) => row.admissionId,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const current = { pageIndex, pageSize };
      const next = typeof updater === "function" ? updater(current) : updater;
      onPageChange(next.pageIndex);
    },
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex, pageSize },
    },
  });

  const handleDelete = async () => {
    const selectedRowIds = table
      .getSelectedRowModel()
      .rows.map((row) => row.original.admissionId);
    const accessToken = (session as { access_token?: string })?.access_token;

    setIsDeleting(true);
    try {
      for (const admissionId of selectedRowIds) {
        const response = await fetch(
          `http://localhost:5201/api/admissions/${admissionId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to delete admission ${admissionId}`);
        }
      }

      setRowSelection({});

      if (onAdmissionAdded) {
        onAdmissionAdded();
      }
      toast.success("Selected admission(s) deleted successfully.", {
        position: "top-center",
      });
    } catch (error) {
      console.error("Error deleting admissions:", error);
      toast.error("Failed to delete selected admission(s). Try again later.", {
        position: "top-center",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const buildExportQueryParams = () => {
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("search", searchValue.trim());
    if (admissionType !== "all") params.set("admissionType", admissionType);
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
    if (sorting[0]) {
      params.set("sortBy", sorting[0].id);
      params.set("sortDir", sorting[0].desc ? "desc" : "asc");
    }
    return params;
  };

  const fetchAdmissionsForExport = async (): Promise<TData[]> => {
    const accessToken = (session as { access_token?: string })?.access_token;

    if (!accessToken) {
      throw new Error("Missing access token");
    }

    const params = buildExportQueryParams();
    const response = await fetch(
      `http://localhost:5201/api/admissions/export${
        params.toString() ? `?${params.toString()}` : ""
      }`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch admissions for export");
    }

    return (await response.json()) as TData[];
  };

  // Exported rows come from a dedicated backend endpoint (applying the same
  // filters/sort as the table) rather than the table's own row model, since
  // with server-side pagination `data` only ever holds the current page.
  const getExportData = (admissions: TData[]) => {
    const exportableColumns = table
      .getAllLeafColumns()
      .filter(
        (column) =>
          column.getIsVisible() &&
          column.id !== "select" &&
          column.id !== "actions",
      );

    if (exportableColumns.length === 0) {
      toast.error("No visible columns to export.", {
        position: "top-center",
      });
      return null;
    }

    return {
      headers: [
        ...exportableColumns.map((column) => column.id),
        "patientFirstName",
        "patientLastName",
        "patientMRN",
        "patientGroup",
        "patientInsurance",
        "patientPCP",
        "patientClinic",
      ],
      rowValues: admissions.map((admission) => {
        const patient = admission.patient;

        return [
          ...exportableColumns.map((column) =>
            column.accessorFn ? column.accessorFn(admission, 0) : undefined,
          ),
          patient?.firstName ?? "",
          patient?.lastName ?? "",
          patient?.mrn ?? "",
          patient?.group ?? "",
          patient?.insurance ?? "",
          patient?.pcp ?? "",
          patient?.clinic ?? "",
        ];
      }),
    };
  };

  const getTransferHeaders = () => [
    "transferId",
    "transferAdmissionDate",
    "transferDischargeDate",
    "transferIsFinalDischarge",
    "transferFacilityType",
    "transferFacility",
    "transferType",
    "transferTimeOfAdmission",
    "transferDX",
    "transferNotificationSource",
    "transferDateNotified",
    "transferDischargeTo",
  ];

  const fetchTransfersForExport = async (admissionIds: string[]) => {
    const accessToken = (session as { access_token?: string })?.access_token;

    if (!accessToken) {
      throw new Error("Missing access token");
    }

    if (admissionIds.length === 0) {
      return [];
    }

    const queryParams = new URLSearchParams();

    admissionIds.forEach((admissionId) => {
      queryParams.append("admissionIds", admissionId);
    });

    const response = await fetch(
      `http://localhost:5201/api/transfers/export${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch transfers for export");
    }

    return (await response.json()) as Array<{
      transferId?: number;
      admissionId: number;
      admissionDate?: string;
      dischargeDate?: string | null;
      isFinalDischarge?: boolean;
      facilityType?: string | null;
      facility?: string | null;
      type?: string;
      timeOfAdmission?: string | null;
      dx?: string | null;
      notificationSource?: string | null;
      dateNotified?: string;
      dischargeTo?: string | null;
    }>;
  };

  const buildExportData = async () => {
    const admissions = await fetchAdmissionsForExport();
    const exportData = getExportData(admissions);
    if (!exportData) {
      return null;
    }

    if (!includeTransfers) {
      return exportData;
    }

    const transferRows = await fetchTransfersForExport(
      admissions.map((admission) => admission.admissionId),
    );
    const transferHeaders = getTransferHeaders();

    const transfersByAdmissionId = transferRows.reduce((map, transfer) => {
      const admissionId = String(transfer.admissionId);
      const existing = map.get(admissionId) ?? [];
      existing.push(transfer);
      map.set(admissionId, existing);
      return map;
    }, new Map<string, typeof transferRows>());

    const rowValues = admissions.flatMap((admission, index) => {
      const baseValues = exportData.rowValues[index];
      const transfers =
        transfersByAdmissionId.get(String(admission.admissionId)) ?? [];

      if (!transfers.length) {
        return [[...baseValues, ...Array(transferHeaders.length).fill("")]];
      }

      return transfers.map((transfer) => [
        ...baseValues,
        transfer.transferId ?? "",
        transfer.admissionDate ?? "",
        transfer.dischargeDate ?? "",
        transfer.isFinalDischarge ? "Yes" : "No",
        transfer.facilityType ?? "",
        transfer.facility ?? "",
        transfer.type ?? "",
        transfer.timeOfAdmission ?? "",
        transfer.dx ?? "",
        transfer.notificationSource ?? "",
        transfer.dateNotified ?? "",
        transfer.dischargeTo ?? "",
      ]);
    });

    return {
      headers: [...exportData.headers, ...transferHeaders],
      rowValues,
    };
  };

  const handleExportCsv = async () => {
    setIsExporting(true);

    try {
      const exportData = await buildExportData();
      if (!exportData) {
        return;
      }

      const escapeCsvValue = (value: unknown) => {
        if (value === null || value === undefined) {
          return "";
        }

        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      };

      const csvRows = exportData.rowValues.map((rowValues) =>
        rowValues.map((value) => escapeCsvValue(value)).join(","),
      );

      const csv = [exportData.headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `admissions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("CSV export completed.", {
        position: "top-center",
      });
    } catch (error) {
      console.error("Error exporting admissions as CSV:", error);
      toast.error("Failed to export CSV.", {
        position: "top-center",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);

    try {
      const exportData = await buildExportData();
      if (!exportData) {
        return;
      }

      const escapeExcelValue = (value: unknown) => {
        if (value === null || value === undefined) {
          return "";
        }

        const stringValue = String(value);
        return stringValue.replace(/\t/g, " ").replace(/\r?\n/g, " ");
      };

      const rows = exportData.rowValues.map((rowValues) =>
        rowValues.map((value) => escapeExcelValue(value)).join("\t"),
      );

      const content = [exportData.headers.join("\t"), ...rows].join("\n");
      const blob = new Blob([content], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `admissions-${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Excel export completed.", {
        position: "top-center",
      });
    } catch (error) {
      console.error("Error exporting admissions as Excel:", error);
      toast.error("Failed to export Excel.", {
        position: "top-center",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="flex w-full flex-wrap items-center gap-4">
        <Field className="w-full max-w-48">
          <FieldLabel>Type of Admission</FieldLabel>
          <Select value={admissionType} onValueChange={onAdmissionTypeChange}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Type</SelectLabel>
                <SelectItem value="all">All Types</SelectItem>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-full max-w-48">
          <FieldLabel>Start Date</FieldLabel>
          <DatePickerInput value={startDate} onChange={onStartDateChange} />
        </Field>
        <Field className="w-full max-w-48">
          <FieldLabel>End Date</FieldLabel>
          <DatePickerInput value={endDate} onChange={onEndDateChange} />
        </Field>
      </div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter names..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex justify-end space-x-2 ml-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Export</Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Export admissions</AlertDialogTitle>
                <AlertDialogDescription>
                  Choose a file format to export the current table view.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center gap-3 py-2">
                <Checkbox
                  id="include-transfers"
                  checked={includeTransfers}
                  onCheckedChange={(checked) => setIncludeTransfers(!!checked)}
                />
                <Label htmlFor="include-transfers" className="text-sm">
                  Export associated transfers
                </Label>
              </div>
              <AlertDialogAction
                variant="outline"
                onClick={handleExportCsv}
                disabled={isExporting}
              >
                Export CSV
              </AlertDialogAction>
              <AlertDialogAction
                onClick={handleExportExcel}
                disabled={isExporting}
              >
                Export Excel
              </AlertDialogAction>
              <AlertDialogFooter className="pt-6">
                <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {isDeleting ? (
            <ButtonLoading />
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={
                    table.getSelectedRowModel().rows.length === 0 ||
                    isDeleting ||
                    isLoading
                  }
                >
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete admission(s)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the selected admission(s) and
                    their associated transfer(s).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel variant="outline">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <NewAdmissionDialog onAdmissionAdded={onAdmissionAdded} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                      onSelect={(e) => e.preventDefault()}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(e: React.MouseEvent) => {
                    const target = e.target as HTMLElement | null;
                    if (!target || !e.currentTarget.contains(target)) {
                      return;
                    }
                    if (
                      target.closest("button, a, [role=menuitem], input, label")
                    ) {
                      return;
                    }

                    router.push(
                      `/forms/admissions/${row.original.admissionId}`,
                    );
                  }}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getSelectedRowModel().rows.length} of{" "}
          {table.getRowModel().rows.length} row(s) selected. {totalCount} total
          row(s)
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          Page
          <Input
            type="number"
            min={1}
            max={pageCount}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            disabled={isLoading}
            className="h-8 w-14 text-center"
          />
          of {pageCount}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage() || isLoading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage() || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
