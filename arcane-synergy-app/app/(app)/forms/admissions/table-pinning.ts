import { cn } from "@/lib/utils";

/*
Sticky classes for columns whose meta sets `pin`. The select column sits at the
far left, the next left-pinned column right after it (left-10 = the select
column's width), and right-pinned columns (actions) at the far right. Tables
without a select column pass `noSelectColumn` so their left-pinned column sits
at the far left instead. Header cells are also sticky to the top. Class names
are spelled out in full so Tailwind can find them.
*/

const PINNED_CELL_BG =
  "bg-background group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))] group-data-[state=selected]:bg-muted";

const HEAD_CLASSES = {
  default:
    "sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_var(--border)]",
  select:
    "sticky top-0 left-0 z-30 w-10 min-w-10 bg-background shadow-[inset_0_-1px_0_var(--border)]",
  left: "sticky top-0 left-10 z-30 bg-background shadow-[inset_-1px_0_0_var(--border),inset_0_-1px_0_var(--border)]",
  leftEdge:
    "sticky top-0 left-0 z-30 bg-background shadow-[inset_-1px_0_0_var(--border),inset_0_-1px_0_var(--border)]",
  right:
    "sticky top-0 right-0 z-30 bg-background shadow-[inset_1px_0_0_var(--border),inset_0_-1px_0_var(--border)]",
};

const CELL_CLASSES = {
  select: cn("sticky left-0 z-10 w-10 min-w-10", PINNED_CELL_BG),
  left: cn(
    "sticky left-10 z-10 shadow-[inset_-1px_0_0_var(--border)]",
    PINNED_CELL_BG,
  ),
  leftEdge: cn(
    "sticky left-0 z-10 shadow-[inset_-1px_0_0_var(--border)]",
    PINNED_CELL_BG,
  ),
  right: cn(
    "sticky right-0 z-10 shadow-[inset_1px_0_0_var(--border)]",
    PINNED_CELL_BG,
  ),
};

type PinOptions = { noSelectColumn?: boolean };

function getPinKey(
  columnId: string,
  pin: "left" | "right" | undefined,
  { noSelectColumn = false }: PinOptions = {},
) {
  if (!pin) return undefined;
  if (pin === "right") return "right" as const;
  if (columnId === "select") return "select" as const;
  return noSelectColumn ? ("leftEdge" as const) : ("left" as const);
}

export function getHeadClassName(
  columnId: string,
  pin?: "left" | "right",
  options?: PinOptions,
) {
  const key = getPinKey(columnId, pin, options);
  return key ? HEAD_CLASSES[key] : HEAD_CLASSES.default;
}

export function getCellClassName(
  columnId: string,
  pin?: "left" | "right",
  options?: PinOptions,
) {
  const key = getPinKey(columnId, pin, options);
  return key ? CELL_CLASSES[key] : undefined;
}

/** Row clicks inside these elements belong to the element, not the row. */
export function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest("button, a, [role=menuitem], input, label")
  );
}
