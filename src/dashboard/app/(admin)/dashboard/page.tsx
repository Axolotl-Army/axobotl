'use client'
import { useEffect, useMemo, useState } from 'react'
import { Col, Row, Card, Badge } from 'react-bootstrap'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import DataTable from '@/components/table/DataTable'
import { basePath } from '@/helpers'

type StatsData = {
  guildCount: number
  totalCommands: number
}

type LogEntry = {
  id: number
  command: string
  username: string
  successful: boolean
  createdAt: string
}

const columnHelper = createColumnHelper<LogEntry>()

export default function DashboardOverview() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch(`${basePath}/api/v1/stats`),
          fetch(`${basePath}/api/v1/logs?limit=10`),
        ])
        if (statsRes.ok) setStats(await statsRes.json())
        if (logsRes.ok) setRecentLogs(await logsRes.json())
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
      columnHelper.accessor('username', {
        header: 'User',
      }),
      columnHelper.accessor('successful', {
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge bg={getValue() ? 'success' : 'danger'}>
            {getValue() ? 'OK' : 'Error'}
          </Badge>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'Time',
        cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: recentLogs,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  })

  return (
    <div className="content-wrapper">
      <PageBreadcrumb title="Overview" subTitle1="Dashboard" />

      <div className="main-content">
        <Row className="mb-4">
          <Col md={6} className="mb-3">
            <Card className="h-100">
              <Card.Body className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="text-muted text-uppercase mb-2">Guilds</h6>
                  <h2 className="mb-0">{loading ? '...' : (stats?.guildCount ?? 0)}</h2>
                </div>
                <div>
                  <svg className="sa-icon sa-icon-3x sa-icon-primary">
                    <use href={`${basePath}/icons/sprite.svg#server`}></use>
                  </svg>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} className="mb-3">
            <Card className="h-100">
              <Card.Body className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h6 className="text-muted text-uppercase mb-2">Total Commands</h6>
                  <h2 className="mb-0">{loading ? '...' : (stats?.totalCommands ?? 0)}</h2>
                </div>
                <div>
                  <svg className="sa-icon sa-icon-3x sa-icon-primary">
                    <use href={`${basePath}/icons/sprite.svg#terminal`}></use>
                  </svg>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Recent Commands</h5>
            <div className="d-flex align-items-center gap-2">
              <div className="st-search-wrapper">
                <div className="input-group input-group-sm flex-nowrap" role="search">
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
              <a href="/dashboard/logs" className="btn btn-sm btn-outline-primary">
                View All
              </a>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <DataTable<LogEntry>
                table={table}
                emptyMessage="No commands logged yet"
              />
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
