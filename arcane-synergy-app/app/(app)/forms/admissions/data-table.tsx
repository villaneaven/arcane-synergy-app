"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ButtonLoading } from "@/components/button-loading";
import { NewAdmissionDialog } from "@/components/new-admission-dialog";

interface DataTableProps<TData, TValue> {
  columns:
    | ColumnDef<TData, TValue>[]
    | ((onAdmissionAdded?: () => void) => ColumnDef<TData, TValue>[]);
  data: TData[];
  onAdmissionAdded?: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onAdmissionAdded,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

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
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter names..."
          value={
            (table.getColumn("patientFullName")?.getFilterValue() as string) ??
            ""
          }
          onChange={(event) =>
            table
              .getColumn("patientFullName")
              ?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex justify-end space-x-2 ml-auto">
          {isDeleting ? (
            <ButtonLoading />
          ) : (
            <Button
              variant="destructive"
              disabled={
                table.getFilteredSelectedRowModel().rows.length === 0 ||
                isDeleting
              }
              onClick={() => {}}
            >
              Delete
            </Button>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => {
                    // router.push(
                    //   `/`,
                    // );
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
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
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
