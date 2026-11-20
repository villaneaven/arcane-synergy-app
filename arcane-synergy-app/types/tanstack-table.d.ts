import "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Human-readable name, used in the column visibility menu. */
    label?: string;
    /** Keeps the column visible while the table scrolls horizontally. */
    pin?: "left" | "right";
    /**
     * Fields to write when exporting. Lets a column that displays several
     * values in one cell still export each value as its own field.
     */
    exportFields?: { header: string; value: (row: TData) => unknown }[];
  }
}
