"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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
import { NewTransferDialog } from "@/components/new-transfer-dialog";

interface DataTableProps<TData, TValue> {
  columns:
    | ColumnDef<TData, TValue>[]
    | ((onTransferAdded?: () => void) => ColumnDef<TData, TValue>[]);
  data: TData[];
  onTransferAdded?: () => void;
  admissionId: string;
}

export function SubDataTable<TData, TValue>({
  columns,
  data,
  onTransferAdded,
  admissionId,
}: DataTableProps<TData, TValue>) {
  const { data: session } = useSession();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columnsWithCallbacks = React.useMemo(
    () => (typeof columns === "function" ? columns(onTransferAdded) : columns),
    [columns, onTransferAdded],
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

  const handleDelete = async () => {
    const selectedRowIds = table
      .getSelectedRowModel()
      .rows.map((row) => (row.original as { transferId: string }).transferId);
    const accessToken = (session as { access_token?: string })?.access_token;

    setIsDeleting(true);
    try {
      for (const transferId of selectedRowIds) {
        const response = await fetch(
          `http://localhost:5201/api/transfers/${transferId}`,
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
      <div className="flex items-center py-4">
        <div className="flex justify-end space-x-2 ml-auto">
          {isDeleting ? (
            <ButtonLoading />
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={
                    table.getFilteredSelectedRowModel().rows.length === 0 ||
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
