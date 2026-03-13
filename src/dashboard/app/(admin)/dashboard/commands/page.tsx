'use client'
import { useEffect, useState } from 'react'
import { Card, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { basePath } from '@/helpers'

type CommandStat = {
  command: string
  count: string
  last_used: string
}

export default function CommandsPage() {
  const [commandStats, setCommandStats] = useState<CommandStat[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="content-wrapper">
      <PageBreadcrumb title="Commands" subTitle1="Dashboard" subTitle2="Statistics" />

      <div className="main-content">
        <Card>
          <Card.Header>
            <h5 className="mb-0">Command Usage</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive className="mb-0">
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Total Uses</th>
                  <th>Last Used</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : commandStats.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-muted">
                      No command data available
                    </td>
                  </tr>
                ) : (
                  commandStats.map((stat) => (
                    <tr key={stat.command}>
                      <td>
                        <code>/{stat.command}</code>
                      </td>
                      <td>{stat.count}</td>
                      <td>{new Date(stat.last_used).toLocaleString()}</td>
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
