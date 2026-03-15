'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Col, Row, Form, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { basePath } from '@/helpers'
import { useGuildContext } from '@/context/useGuildContext'
import Link from 'next/link'

type PluginInfo = {
  id: string
  name: string
  description: string
  enabled: boolean
}

const PLUGIN_ICONS: Record<string, string> = {
  leveling: 'award',
}

export default function PluginsPage() {
  const { selectedGuildId, loading: guildsLoading } = useGuildContext()
  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedGuildId) return

    async function fetchPlugins() {
      setLoading(true)
      try {
        const res = await fetch(`${basePath}/api/v1/guilds/${selectedGuildId}/plugins`)
        if (res.ok) {
          setPlugins(await res.json())
        }
      } finally {
        setLoading(false)
      }
    }
    fetchPlugins()
  }, [selectedGuildId])

  const handleToggle = useCallback(
    async (pluginId: string, enabled: boolean) => {
      if (!selectedGuildId) return
      setToggling(pluginId)

      try {
        const res = await fetch(
          `${basePath}/api/v1/guilds/${selectedGuildId}/plugins/${pluginId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled }),
          },
        )

        if (res.ok) {
          setPlugins((prev) =>
            prev.map((p) => (p.id === pluginId ? { ...p, enabled } : p)),
          )
        }
      } finally {
        setToggling(null)
      }
    },
    [selectedGuildId],
  )

  return (
    <div className="content-wrapper">
      <PageBreadcrumb title="Plugins" subTitle1="Dashboard" subTitle2="Plugins" />

      <div className="main-content">
        {guildsLoading || (loading && plugins.length === 0) ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" className="me-2" />
            Loading plugins...
          </div>
        ) : (
          <Row>
            {plugins.map((plugin) => (
              <Col lg={4} md={6} className="mb-4" key={plugin.id}>
                <Card className="h-100">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex align-items-start justify-content-between mb-3">
                      <div className="d-flex align-items-center">
                        <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
                          <use
                            href={`${basePath}/icons/sprite.svg#${PLUGIN_ICONS[plugin.id] ?? 'box'}`}
                          />
                        </svg>
                        <h5 className="mb-0">{plugin.name}</h5>
                      </div>
                      <Form.Check
                        type="switch"
                        id={`plugin-toggle-${plugin.id}`}
                        checked={plugin.enabled}
                        disabled={toggling === plugin.id}
                        onChange={(e) =>
                          handleToggle(plugin.id, e.target.checked)
                        }
                      />
                    </div>

                    <p className="text-muted flex-grow-1">{plugin.description}</p>

                    <div>
                      <Link
                        href={`/dashboard/plugins/${plugin.id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        Configure
                      </Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  )
}
