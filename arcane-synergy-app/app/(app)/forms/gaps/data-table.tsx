"use client";

import * as React from "react";
import {
  ColumnDef,
  OnChangeFn,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

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
import { COLUMN_LABELS, Gap, HIDDEN_BY_DEFAULT, gapKey } from "./columns";

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
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
}: DataTableProps<TValue>) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() =>
      Object.fromEntries(HIDDEN_BY_DEFAULT.map((id) => [id, false])),
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
    onColumnVisibilityChange: setColumnVisibility,
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

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Search name, member ID, metric, provider..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex justify-end space-x-2 ml-auto">
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
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {COLUMN_LABELS[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                <TableRow key={row.id}>
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
                  colSpan={table.getVisibleLeafColumns().length}
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
          {totalCount} total gap(s)
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Rows per page
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
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
