---
id: 04-smarttables
title: SmartTables — TanStack Table Integration
edition: Dashboard
depends_on: [02-dashboard-nextjs-migration]
source_files:
  - src/dashboard/components/table/DataTable.tsx
  - src/dashboard/components/table/TablePagination.tsx
  - src/dashboard/app/(admin)/dashboard/page.tsx
  - src/dashboard/app/(admin)/dashboard/commands/page.tsx
  - src/dashboard/app/(admin)/dashboard/logs/page.tsx
routes: []
models: []
test_files:
  - tests/unit/dashboard/components/DataTable.test.tsx
known_issues: []
---

# 04 — SmartTables (TanStack Table Integration)

## Purpose

Replace all plain Bootstrap `<Table>` components in the dashboard with the SmartAdmin seed's TanStack Table implementation. This gives all tables consistent sorting, global search, and pagination with SmartAdmin styling. All future tables must use this pattern.

## Architecture

The SmartAdmin seed provides two reusable components ported from the seed:

- **`DataTable<TData>`** — Wraps TanStack Table's `useReactTable` output into a styled Bootstrap table with sort indicators, striped rows, and empty state handling. Uses SmartAdmin CSS classes (`st-table`, `st-wrapper`, `st-responsive`).
- **`TablePagination`** — Page navigation with first/prev/next/last, page numbers with ellipsis, page size selector (10/15/25/50/100), and "Showing X to Y of Z" info.

Each page owns its data fetching and `useReactTable` call. The shared components only handle rendering.

### Data loading strategy

| Page | Data loading | Table features |
|------|-------------|----------------|
| Overview (`/dashboard`) | Client-side fetch, flat array from `/api/v1/logs?limit=10` | Sort, search (no pagination — only 10 recent items) |
| Commands (`/dashboard/commands`) | Client-side fetch, full dataset from `/api/v1/commands` | Sort, search, pagination |
| Logs (`/dashboard/logs`) | Server-side pagination via `/api/v1/logs?page=N&limit=N` | Sort (client-side within page), search (client-side within page), pagination (server-side) |

## Components

### DataTable

Ported from `SmartAdmin/src/components/table/DataTable.tsx`. Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `table` | `Table<TData>` | required | TanStack table instance |
| `className` | `string` | `''` | Additional wrapper classes |
| `emptyMessage` | `ReactNode` | `'Nothing found.'` | Empty state message |
| `showHeaders` | `boolean` | `true` | Whether to render `<thead>` |

### TablePagination

Ported from `SmartAdmin/src/components/table/TablePagination.tsx`. Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `totalItems` | `number` | required | Total row count |
| `start` | `number` | required | First visible row number |
| `end` | `number` | required | Last visible row number |
| `itemsName` | `string` | `'items'` | Label for entries |
| `showInfo` | `boolean` | `false` | Show "Showing X to Y of Z" |
| `showPageLimit` | `boolean` | `false` | Show page size dropdown |
| `pageSize` | `number` | — | Current page size |
| `onPageSizeChange` | `(size: number) => void` | — | Page size change handler |
| `previousPage` / `nextPage` | `() => void` | required | Navigation callbacks |
| `canPreviousPage` / `canNextPage` | `boolean` | required | Navigation state |
| `pageCount` | `number` | required | Total pages |
| `pageIndex` | `number` | required | Current page (0-indexed) |
| `setPageIndex` | `(i: number) => void` | required | Page change handler |

## Dependencies

New packages to install in `src/dashboard/`:

- `@tanstack/react-table` — Core table logic
- `react-icons` — Sort direction arrows (FaArrowUp, FaArrowDown, chevrons)

Already installed: `clsx`, `react-bootstrap`

## Business Rules

- All dashboard tables MUST use `DataTable` + `TablePagination` (no raw `<Table>`)
- Tables always have `striped` styling (via `table-striped` class on DataTable)
- Tables with clickable link columns also get `hover` styling
- Search input uses SmartAdmin `.st-search-wrapper` + `.input-group` markup
- Empty state shows SmartAdmin-styled alert with frown icon

## Known Issues

[]
