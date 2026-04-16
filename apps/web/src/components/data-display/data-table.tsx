"use client";

import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
};

type SortState = {
  columnId: string;
  direction: "asc" | "desc";
};

function shouldSkipRowClick(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("a, button, input, select, textarea, label, [data-no-row-click='true']"));
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  sorting = true,
  selectedRowId,
  emptyMessage = "No records available."
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  sorting?: boolean;
  selectedRowId?: string | null;
  emptyMessage?: string;
}) {
  const sortableColumns = columns.filter((column) => column.sortValue);
  const [sortState, setSortState] = useState<SortState | null>(
    sortableColumns[0] ? { columnId: sortableColumns[0].id, direction: "desc" } : null
  );

  const sortedData = useMemo(() => {
    if (!sorting || !sortState) {
      return data;
    }

    const column = columns.find((item) => item.id === sortState.columnId);
    if (!column?.sortValue) {
      return data;
    }

    return [...data].sort((left, right) => {
      const leftValue = column.sortValue?.(left);
      const rightValue = column.sortValue?.(right);

      if (leftValue === undefined && rightValue === undefined) {
        return 0;
      }

      if (leftValue === undefined) {
        return 1;
      }

      if (rightValue === undefined) {
        return -1;
      }

      if (leftValue === rightValue) {
        return 0;
      }

      const result = leftValue > rightValue ? 1 : -1;
      return sortState.direction === "asc" ? result : -result;
    });
  }, [columns, data, sortState, sorting]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-panel">
      <div className="max-h-[34rem] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr>
              {columns.map((column) => {
                const isSorted = sortState?.columnId === column.id;
                return (
                  <th
                    key={column.id}
                    className={cn(
                      "border-b border-border px-6 py-3 text-[10px] font-normal uppercase tracking-[0.08em] text-foreground/52",
                      column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"
                    )}
                  >
                    {column.sortValue && sorting ? (
                      <button
                        className="inline-flex min-h-10 items-center gap-2 rounded-sm text-inherit transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        type="button"
                        onClick={() =>
                          setSortState((current) =>
                            current?.columnId === column.id
                              ? { columnId: column.id, direction: current.direction === "asc" ? "desc" : "asc" }
                              : { columnId: column.id, direction: "desc" }
                          )
                        }
                      >
                        <span>{column.header}</span>
                        <span className="font-mono text-[10px]">{isSorted ? sortState?.direction : ""}</span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-sm text-muted-foreground" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "group border-b border-border/70",
                    onRowClick ? "cursor-pointer" : "",
                    selectedRowId === row.id ? "bg-accent/6" : "hover:bg-muted/38"
                  )}
                  onClick={
                    onRowClick
                      ? (event: MouseEvent<HTMLTableRowElement>) => {
                          if (shouldSkipRowClick(event.target)) {
                            return;
                          }

                          onRowClick(row);
                        }
                      : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (shouldSkipRowClick(event.target)) {
                            return;
                          }

                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : -1}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        "border-b border-border/70 px-6 py-[18px] align-top text-[13px] text-foreground transition-colors",
                        column.align === "right" ? "text-right tabular-nums" : column.align === "center" ? "text-center" : "text-left",
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
