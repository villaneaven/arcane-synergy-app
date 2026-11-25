"use client";

import * as React from "react";
import {
  ColumnDef,
  OnChangeFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Columns3 } from "lucide-react";

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

import {
  getDefaultVisibility,
  getPresetVisibility,
  isPresetActive,
} from "../admissions/column-presets";
import {
  getCellClassName,
  getHeadClassName,
} from "../admissions/table-pinning";
import { useSavedColumnVisibility } from "../admissions/use-saved-column-visibility";
import { GAP_COLUMN_PRESETS } from "./column-presets";
import {
  DEFAULT_GAP_FILTERS,
  Gap,
  GapFilterOptions,
  GapFilters,
  gapKey,
} from "./columns";
import { GapsFilters } from "./gaps-filters";

const COLUMN_VISIBILITY_STORAGE_KEY = "gaps-table-column-visibility";
const PIN_OPTIONS = { noSelectColumn: true };

interface DataTableProps<TValue> {
  columns: ColumnDef<Gap, TValue>[];
  data: Gap[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalCount: number;
  isLoading?: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: GapFilters;
  filterOptions: GapFilterOptions;
  onFilterChange: (key: keyof GapFilters, value: string) => void;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions: number[];
}

export function DataTable<TValue>({
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
  filters,
  filterOptions,
  onFilterChange,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
}: DataTableProps<TValue>) {
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
    getDefaultVisibility(hideableColumnIds, GAP_COLUMN_PRESETS),
  );

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

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getRowId: gapKey,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onPaginationChange: (updater) => {
      const current = { pageIndex, pageSize };
      const next = typeof updater === "function" ? updater(current) : updater;
      onPageChange(next.pageIndex);
    },
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex, pageSize },
    },
  });

  const hasSearchOrFilters =
    searchValue.trim() !== "" ||
    (Object.keys(filters) as (keyof GapFilters)[]).some(
      (key) => filters[key] !== DEFAULT_GAP_FILTERS[key],
    );

  return (
    <div>
      <GapsFilters
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={onFilterChange}
        actions={
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
              {GAP_COLUMN_PRESETS.map((preset) => (
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
                      PIN_OPTIONS,
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
                <TableRow key={row.id} className="group">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={getCellClassName(
                        cell.column.id,
                        cell.column.columnDef.meta?.pin,
                        PIN_OPTIONS,
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
                    ? "No gaps match your search or filters."
                    : "No open gaps."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {totalCount} total gap(s)
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="gaps-rows-per-page" className="text-sm font-medium">
            Rows per page
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="gaps-rows-per-page">
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
