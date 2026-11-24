"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ColumnDef,
  OnChangeFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Columns3 } from "lucide-react";

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
import { ButtonLoading } from "@/components/button-loading";
import { NewPatientDialog } from "@/components/new-patient-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_BASE_URL } from "@/lib/api";

import {
  getDefaultVisibility,
  getPresetVisibility,
  isPresetActive,
} from "../admissions/column-presets";
import {
  getCellClassName,
  getHeadClassName,
  isInteractiveTarget,
} from "../admissions/table-pinning";
import { useSavedColumnVisibility } from "../admissions/use-saved-column-visibility";
import { PATIENT_COLUMN_PRESETS } from "./column-presets";
import { PatientsFilters } from "./patients-filters";

const COLUMN_VISIBILITY_STORAGE_KEY = "patients-table-column-visibility";

interface DataTableProps<TData extends { patientID: string }, TValue> {
  columns: ColumnDef<TData, TValue>[];
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
  group: string;
  onGroupChange: (value: string) => void;
  insurance: string;
  onInsuranceChange: (value: string) => void;
  clinic: string;
  onClinicChange: (value: string) => void;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions: number[];
  onPatientAdded?: () => void;
}

export function DataTable<TData extends { patientID: string }, TValue>({
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
  group,
  onGroupChange,
  insurance,
  onInsuranceChange,
  clinic,
  onClinicChange,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  onPatientAdded,
}: DataTableProps<TData, TValue>) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const hideableColumnIds = React.useMemo(
    () =>
      columns
        .filter((column) => column.enableHiding !== false)
        .map(
          (column) =>
            column.id ??
            String((column as { accessorKey?: string }).accessorKey),
        ),
    [columns],
  );

  const {
    visibility: columnVisibility,
    onVisibilityChange: handleColumnVisibilityChange,
    applyVisibility,
  } = useSavedColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    getDefaultVisibility(hideableColumnIds, PATIENT_COLUMN_PRESETS),
  );

  const [rowSelection, setRowSelection] = React.useState({});
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

  const openRow = (row: TData) => {
    router.push(`/forms/patients/${row.patientID}`);
  };

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getRowId: (row) => row.patientID,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
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

  const hasSearchOrFilters =
    searchValue.trim() !== "" ||
    group !== "all" ||
    insurance !== "all" ||
    clinic !== "all";

  const handleDelete = async () => {
    const selectedRowIds = table
      .getSelectedRowModel()
      .rows.map((row) => row.original.patientID);
    const accessToken = (session as { access_token?: string })?.access_token;

    setIsDeleting(true);
    try {
      for (const patientId of selectedRowIds) {
        const response = await fetch(
          `${API_BASE_URL}/api/patients/${patientId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to delete patient ${patientId}`);
        }
      }

      setRowSelection({});

      if (onPatientAdded) {
        onPatientAdded();
      }
      toast.success("Selected patient(s) deleted successfully.", {
        position: "top-center",
      });
    } catch (error) {
      console.error("Error deleting patients:", error);
      toast.error("Failed to delete selected patient(s). Try again later.", {
        position: "top-center",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <PatientsFilters
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        group={group}
        onGroupChange={onGroupChange}
        insurance={insurance}
        onInsuranceChange={onInsuranceChange}
        clinic={clinic}
        onClinicChange={onClinicChange}
        actions={
          <>
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
                    <AlertDialogTitle>Delete patient(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the selected patient(s) and
                      their associated admission(s) and transfer(s).
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
            <NewPatientDialog onPatientAdded={onPatientAdded} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Columns3 className="size-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[70vh] overflow-y-auto"
              >
                <DropdownMenuLabel>Views</DropdownMenuLabel>
                {PATIENT_COLUMN_PRESETS.map((preset) => (
                  <DropdownMenuCheckboxItem
                    key={preset.id}
                    checked={isPresetActive(
                      preset,
                      hideableColumnIds,
                      columnVisibility,
                    )}
                    onCheckedChange={() =>
                      applyVisibility(
                        getPresetVisibility(preset, hideableColumnIds),
                      )
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    {preset.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                      onSelect={(e) => e.preventDefault()}
                    >
                      {column.columnDef.meta?.label ?? column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <div className="overflow-hidden rounded-md border">
        <Table containerClassName="max-h-[70vh]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={getHeadClassName(
                      header.column.id,
                      header.column.columnDef.meta?.pin,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
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
                  tabIndex={0}
                  onClick={(e: React.MouseEvent) => {
                    if (!e.currentTarget.contains(e.target as Node)) return;
                    if (isInteractiveTarget(e.target)) return;
                    openRow(row.original);
                  }}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" && e.target === e.currentTarget) {
                      openRow(row.original);
                    }
                  }}
                  className="group focus-visible:outline-ring cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={getCellClassName(
                        cell.column.id,
                        cell.column.columnDef.meta?.pin,
                      )}
                    >
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
                  colSpan={table.getVisibleLeafColumns().length}
                  className="text-muted-foreground h-24 text-center"
                >
                  {hasSearchOrFilters
                    ? "No patients match your search or filters."
                    : "No patients yet."}
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
        <div className="hidden items-center gap-2 lg:flex">
          <Label
            htmlFor="patients-rows-per-page"
            className="text-sm font-medium"
          >
            Rows per page
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger
              size="sm"
              className="w-20"
              id="patients-rows-per-page"
            >
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={`${option}`}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
