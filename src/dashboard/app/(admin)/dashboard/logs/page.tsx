'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Col, Row } from 'react-bootstrap'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import { basePath } from '@/helpers'

type LogEntry = {
  id: number
  command: string
  username: string
  guildId: string
  successful: boolean
  createdAt: string
}

type PaginatedResponse = {
  logs: LogEntry[]
  pagination: {
    current: number
    total: number
    totalEntries: number
  }
}

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 20

const columnHelper = createColumnHelper<LogEntry>()

export default function LogsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const serverPage = parseInt(searchParams.get('page') ?? '1', 10)
  const serverPageSize = parseInt(
    searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE),
    10,
  )

  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(
          `${basePath}/api/v1/logs?page=${serverPage}&limit=${serverPageSize}`,
        )
        if (res.ok) setData(await res.json())
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [serverPage, serverPageSize])

  const navigateTo = useCallback(
    (page: number, limit: number) => {
      router.push(`/dashboard/logs?page=${page}&limit=${limit}`)
    },
    [router],
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('command', {
        header: 'Command',
        cell: ({ getValue }) => <code>/{getValue()}</code>,
      }),
      columnHelper.accessor('username', {
        header: 'User',
      }),
      columnHelper.accessor('guildId', {
        header: 'Guild ID',
        cell: ({ getValue }) => <code className="fs-xs">{getValue()}</code>,
      }),
      columnHelper.accessor('successful', {
        header: 'Status',
        cell: ({ getValue }) => (
          <span className={`badge bg-${getValue() ? 'success' : 'danger'}`}>
            {getValue() ? 'OK' : 'Error'}
          </span>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'Time',
        cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
      }),
    ],
    [],
  )

  const logs = data?.logs ?? []
  const pagination = data?.pagination

  const table = useReactTable({
    data: logs,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  })

  const totalItems = pagination?.totalEntries ?? 0
  const pageCount = pagination?.total ?? 0
  const pageIndex = serverPage - 1
  const start = totalItems === 0 ? 0 : pageIndex * serverPageSize + 1
  const end = Math.min(start + serverPageSize - 1, totalItems)

  return (
    <div className="content-wrapper">
      <PageBreadcrumb title="Command Logs" subTitle1="Dashboard" subTitle2="Logs" />

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
                  <DataTable<LogEntry>
                    table={table}
                    emptyMessage="No logs available"
                  />
                  {pageCount > 0 && (
                    <TablePagination
                      totalItems={totalItems}
                      start={start}
                      end={end}
                      itemsName="entries"
                      showInfo
                      previousPage={() => navigateTo(serverPage - 1, serverPageSize)}
                      canPreviousPage={serverPage > 1}
                      pageCount={pageCount}
                      pageIndex={pageIndex}
                      setPageIndex={(i) => navigateTo(i + 1, serverPageSize)}
                      nextPage={() => navigateTo(serverPage + 1, serverPageSize)}
                      canNextPage={serverPage < pageCount}
                      pageSize={serverPageSize}
                      onPageSizeChange={(size) => navigateTo(1, size)}
                      showPageLimit
                    />
                  )}
                </>
              )}
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}
