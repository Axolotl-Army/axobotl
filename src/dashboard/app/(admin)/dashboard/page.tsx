'use client'
import { useEffect, useState } from 'react'
import { Col, Row, Card, Table, Badge } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
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

export default function DashboardOverview() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

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
                  <h2 className="mb-0">
                    {loading ? '...' : (stats?.guildCount ?? 0)}
                  </h2>
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
                  <h2 className="mb-0">
                    {loading ? '...' : (stats?.totalCommands ?? 0)}
                  </h2>
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
            <a href="/dashboard/logs" className="btn btn-sm btn-outline-primary">
              View All
            </a>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive className="mb-0">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-muted">
                      No commands logged yet
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <code>/{log.command}</code>
                      </td>
                      <td>{log.username}</td>
                      <td>
                        <Badge bg={log.successful ? 'success' : 'danger'}>
                          {log.successful ? 'OK' : 'Error'}
                        </Badge>
                      </td>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
