'use client'

import { flexRender, Table as TableType } from '@tanstack/react-table'
import clsx from 'clsx'
import { Table } from 'react-bootstrap'
import { FaArrowDown, FaArrowUp } from 'react-icons/fa6'
import { basePath } from '@/helpers'

type DataTableProps<TData> = {
  table: TableType<TData>
  className?: string
  emptyMessage?: React.ReactNode
  showHeaders?: boolean
}

const DataTable = <TData,>({
  table,
  className = '',
  emptyMessage = 'Nothing found.',
  showHeaders = true,
}: DataTableProps<TData>) => {
  const columns = table.getAllColumns()

  return (
    <div className={clsx('mb-4 mb-md-0', className)}>
      <Table responsive hover className="st-table w-100 table-striped st-responsive">
        {showHeaders && (
          <thead className="bg-light align-middle bg-opacity-25 thead-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                  >
                    <div className="d-flex align-items-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() &&
                        ({
                          asc: <FaArrowUp size={10} className="ms-1" />,
                          desc: <FaArrowDown size={10} className="ms-1" />,
                        }[header.column.getIsSorted() as string] ?? null)}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        )}
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center pt-3 text-muted">
                <div className="st-no-results alert alert-info">
                  <svg className="sa-icon sa-thin sa-icon-2x sa-bold sa-icon-info hidden-sm">
                    <use href={`${basePath}/icons/sprite.svg#frown`}></use>
                  </svg>
                  <h6 className="mb-0">{emptyMessage}</h6>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  )
}

export default DataTable
