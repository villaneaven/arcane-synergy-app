"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Columns3, ListFilter, Search } from "lucide-react";

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { NewTransferDialog } from "@/components/new-transfer-dialog";
import { API_BASE_URL } from "@/lib/api";
import { FACILITY_TYPE_OPTIONS, TYPE_OPTIONS } from "@/lib/admission-options";

import { FilterChip } from "../admissions-filters";
import {
  getDefaultVisibility,
  getPresetVisibility,
  isPresetActive,
} from "../column-presets";
import {
  getCellClassName,
  getHeadClassName,
  isInteractiveTarget,
} from "../table-pinning";
import { useSavedColumnVisibility } from "../use-saved-column-visibility";
import { TRANSFER_COLUMN_PRESETS } from "./column-presets";
import type { Transfer } from "./columns";
import { TransferQuickView } from "./transfer-quick-view";

const COLUMN_VISIBILITY_STORAGE_KEY = "transfers-table-column-visibility";

/** Text fields the search box looks through. */
function matchesSearch(transfer: Transfer, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [
    transfer.type,
    transfer.facility,
    transfer.facilityType,
    transfer.dx,
    transfer.notificationSource,
    transfer.dischargeTo,
    transfer.notes,
  ].some((value) => value?.toLowerCase().includes(term));
}

interface DataTableProps<TValue> {
  columns:
    | ColumnDef<Transfer, TValue>[]
    | ((onTransferAdded?: () => void) => ColumnDef<Transfer, TValue>[]);
  data: Transfer[];
  onTransferAdded?: () => void;
  admissionId: string;
}

export function SubDataTable<TValue>({
  columns,
  data,
  onTransferAdded,
  admissionId,
}: DataTableProps<TValue>) {
  const { data: session } = useSession();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [rowSelection, setRowSelection] = React.useState({});
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("all");
  const [facilityType, setFacilityType] = React.useState("all");
  const [quickViewId, setQuickViewId] = React.useState<string | null>(null);

  const columnsWithCallbacks = React.useMemo(
    () => (typeof columns === "function" ? columns(onTransferAdded) : columns),
    [columns, onTransferAdded],
  );

  const hideableColumnIds = React.useMemo(
    () =>
      columnsWithCallbacks
        .filter((column) => column.enableHiding !== false)
        .map(
          (column) =>
            column.id ??
            String((column as { accessorKey?: string }).accessorKey),
        ),
    [columnsWithCallbacks],
  );

  const {
    visibility: columnVisibility,
    onVisibilityChange,
    applyVisibility,
  } = useSavedColumnVisibility(
    COLUMN_VISIBILITY_STORAGE_KEY,
    getDefaultVisibility(hideableColumnIds, TRANSFER_COLUMN_PRESETS),
  );

  const filteredData = React.useMemo(
    () =>
      data.filter(
        (transfer) =>
          (type === "all" || transfer.type === type) &&
          (facilityType === "all" || transfer.facilityType === facilityType) &&
          matchesSearch(transfer, search),
      ),
    [data, type, facilityType, search],
  );

  const table = useReactTable({
    data: filteredData,
    columns: columnsWithCallbacks,
    getRowId: (row) => String(row.transferId),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: onVisibilityChange,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
  });

  const selectFilters = [
    {
      key: "type",
      label: "Type",
      allLabel: "All types",
      options: TYPE_OPTIONS,
      value: type,
      onChange: setType,
    },
    {
      key: "facilityType",
      label: "Facility type",
      allLabel: "All facility types",
      options: FACILITY_TYPE_OPTIONS,
      value: facilityType,
      onChange: setFacilityType,
    },
  ];
  const activeSelects = selectFilters.filter((f) => f.value !== "all");

  const quickViewTransfer =
    data.find((transfer) => String(transfer.transferId) === quickViewId) ??
    null;

  const handleDelete = async () => {
    const selectedRowIds = table
      .getSelectedRowModel()
      .rows.map((row) => row.original.transferId);
    const accessToken = (session as { access_token?: string })?.access_token;

    setIsDeleting(true);
    try {
      for (const transferId of selectedRowIds) {
        const response = await fetch(
          `${API_BASE_URL}/api/transfers/${transferId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to delete transfer ${transferId}`);
        }
      }

      setRowSelection({});

      if (onTransferAdded) {
        onTransferAdded();
      }
      toast.success("Selected transfer(s) deleted successfully.", {
        position: "top-center",
      });
    } catch (error) {
      console.error("Error deleting transfers:", error);
      toast.error("Failed to delete selected transfer(s). Try again later.", {
        position: "top-center",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <TransferQuickView
        transfer={quickViewTransfer}
        open={quickViewId !== null}
        onOpenChange={(open) => {
          if (!open) setQuickViewId(null);
        }}
        onDataChange={onTransferAdded}
      />
      <div className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search facility, DX, notes…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
              aria-label="Search transfers"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <ListFilter className="size-4" />
                Filters
                {activeSelects.length > 0 ? (
                  <span className="bg-primary text-primary-foreground ml-0.5 rounded-full px-1.5 text-xs tabular-nums">
                    {activeSelects.length}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <div className="grid gap-3">
                {selectFilters.map((filter) => (
                  <Field key={filter.key}>
                    <FieldLabel htmlFor={`transfers-filter-${filter.key}`}>
                      {filter.label}
                    </FieldLabel>
                    <Select
                      value={filter.value}
                      onValueChange={filter.onChange}
                    >
                      <SelectTrigger
                        id={`transfers-filter-${filter.key}`}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{filter.allLabel}</SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ))}
                {activeSelects.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-self-start"
                    onClick={() =>
                      activeSelects.forEach((f) => f.onChange("all"))
                    }
                  >
                    Reset filters
                  </Button>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>

          <div className="ml-auto flex flex-wrap gap-2">
            {isDeleting ? (
              <ButtonLoading />
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={
                      table.getSelectedRowModel().rows.length === 0 ||
                      isDeleting
                    }
                  >
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete transfer(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the selected transfer(s).
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
            <NewTransferDialog
              onTransferAdded={onTransferAdded}
              admissionId={admissionId}
            />
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
                {TRANSFER_COLUMN_PRESETS.map((preset) => (
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
          </div>
        </div>

        {activeSelects.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {activeSelects.map((filter) => (
              <FilterChip
                key={filter.key}
                label={filter.label}
                value={filter.value}
                onRemove={() => filter.onChange("all")}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => activeSelects.forEach((f) => f.onChange("all"))}
            >
              Clear all
            </Button>
          </div>
        ) : null}
      </div>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  tabIndex={0}
                  onClick={(e: React.MouseEvent) => {
                    // Ignore clicks from portals (menus, dialogs) and controls.
                    if (!e.currentTarget.contains(e.target as Node)) return;
                    if (isInteractiveTarget(e.target)) return;
                    setQuickViewId(row.id);
                  }}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" && e.target === e.currentTarget) {
                      setQuickViewId(row.id);
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
                  className="h-24 text-center"
                >
                  {data.length === 0
                    ? "No transfers yet."
                    : "No transfers match the filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getSelectedRowModel().rows.length} of {filteredData.length}{" "}
          row(s) selected.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
