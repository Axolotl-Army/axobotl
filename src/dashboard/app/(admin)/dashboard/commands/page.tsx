'use client'
import { useEffect, useMemo, useState } from 'react'
import { Card, Col, Row } from 'react-bootstrap'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import { basePath } from '@/helpers'

type CommandStat = {
  command: string
  count: number
  last_used: string
}

const columnHelper = createColumnHelper<CommandStat>()

export default function CommandsPage() {
  const [commandStats, setCommandStats] = useState<CommandStat[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${basePath}/api/v1/commands`)
        if (res.ok) setCommandStats(await res.json())
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const columns = useMemo(
    () => [
      columnHelper.accessor('command', {
        header: 'Command',
        cell: ({ getValue }) => <code>/{getValue()}</code>,
      }),
      columnHelper.accessor('count', {
        header: 'Total Uses',
      }),
      columnHelper.accessor('last_used', {
        header: 'Last Used',
        cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: commandStats,
    columns,
    state: { globalFilter, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  return (
    <div className="content-wrapper">
      <PageBreadcrumb title="Commands" subTitle1="Dashboard" subTitle2="Statistics" />

      <div className="main-content">
        <Row>
          <Col lg={12}>
            <div className="st-wrapper">
              <div className="st-toolbar row mb-4">
                <Col xs={12} sm={6} lg={6} xl={5} xxl={4} className="order-1 order-sm-0 mt-4 mt-sm-0">
                  <div className="st-search-wrapper">
                    <div className="input-group flex-nowrap" role="search">
                      <span className="input-group-text px-2">
                        <svg className="sa-icon sa-bold">
                          <use href={`${basePath}/icons/sprite.svg#search`}></use>
                        </svg>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search..."
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </Col>
                <div className="col d-flex justify-content-end gap-2"></div>
              </div>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <>
                  <DataTable<CommandStat>
                    table={table}
                    emptyMessage="No command data available"
                  />
                  <TablePagination
                    totalItems={totalItems}
                    start={start}
                    end={end}
                    itemsName="commands"
                    showInfo
                    previousPage={table.previousPage}
                    canPreviousPage={table.getCanPreviousPage()}
                    pageCount={table.getPageCount()}
                    pageIndex={pageIndex}
                    setPageIndex={table.setPageIndex}
                    nextPage={table.nextPage}
                    canNextPage={table.getCanNextPage()}
                    pageSize={pageSize}
                    onPageSizeChange={table.setPageSize}
                    showPageLimit
                  />
                </>
              )}
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}
