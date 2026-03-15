'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, Table, Pagination } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
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

export default function LogsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`${basePath}/api/v1/logs?page=${page}&limit=20`)
        if (res.ok) setData(await res.json())
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [page])

  const goToPage = (p: number) => {
    router.push(`/dashboard/logs?page=${p}`)
  }

  const pagination = data?.pagination
  const logs = data?.logs ?? []

  return (
    <div className="content-wrapper">
      <PageBreadcrumb title="Command Logs" subTitle1="Dashboard" subTitle2="Logs" />

      <div className="main-content">
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Command Logs</h5>
            {pagination && (
              <span className="text-muted">{pagination.totalEntries} total entries</span>
            )}
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive className="mb-0">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>User</th>
                  <th>Guild ID</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      No logs available
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <code>/{log.command}</code>
                      </td>
                      <td>{log.username}</td>
                      <td>
                        <code className="fs-xs">{log.guildId}</code>
                      </td>
                      <td>
                        <span className={`badge bg-${log.successful ? 'success' : 'danger'}`}>
                          {log.successful ? 'OK' : 'Error'}
                        </span>
                      </td>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
          {pagination && pagination.total > 1 && (
            <Card.Footer className="d-flex justify-content-center">
              <Pagination className="mb-0">
                <Pagination.Prev
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                />
                {Array.from({ length: Math.min(pagination.total, 10) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 4, pagination.total - 9))
                  const p = start + i
                  if (p > pagination.total) return null
                  return (
                    <Pagination.Item
                      key={p}
                      active={p === page}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </Pagination.Item>
                  )
                })}
                <Pagination.Next
                  disabled={page >= pagination.total}
                  onClick={() => goToPage(page + 1)}
                />
              </Pagination>
            </Card.Footer>
          )}
        </Card>
      </div>
    </div>
  )
}
