'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Form, Button, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { basePath } from '@/helpers'

type GuildSummary = { id: string; name: string }
type GuildConfig = { id: string; language: string }
type SaveStatus = { type: 'success' | 'error'; message: string } | null

export default function SettingsPage() {
  const [guilds, setGuilds] = useState<GuildSummary[]>([])
  const [selectedGuildId, setSelectedGuildId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null)
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    async function fetchGuilds() {
      try {
        const res = await fetch(`${basePath}/api/v1/guilds`)
        if (res.ok) {
          const data: GuildSummary[] = await res.json()
          setGuilds(data)
          if (data.length > 0) setSelectedGuildId(data[0].id)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchGuilds()
  }, [])

  useEffect(() => {
    if (!selectedGuildId) return

    async function fetchConfig() {
      setLoading(true)
      setSaveStatus(null)
      try {
        const res = await fetch(`${basePath}/api/v1/guilds/${selectedGuildId}`)
        if (res.ok) {
          const data: GuildConfig = await res.json()
          setLanguage(data.language ?? 'en')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [selectedGuildId])

  const handleSave = useCallback(async () => {
    if (!selectedGuildId) return
    setSaving(true)
    setSaveStatus(null)

    try {
      const res = await fetch(`${basePath}/api/v1/guilds/${selectedGuildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      })

      if (res.ok) {
        setSaveStatus({ type: 'success', message: 'Settings saved.' })
      } else {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        setSaveStatus({ type: 'error', message: err.error ?? 'Save failed' })
      }
    } catch {
      setSaveStatus({ type: 'error', message: 'Network error' })
    } finally {
      setSaving(false)
    }
  }, [selectedGuildId, language])

  return (
    <div className="content-wrapper">
      <PageBreadcrumb title="General Settings" subTitle1="Dashboard" subTitle2="Settings" />

      <div className="main-content">
        <Card className="mb-4">
          <Card.Body>
            <Form.Group>
              <Form.Label className="fw-semibold">Select Guild</Form.Label>
              {loading && guilds.length === 0 ? (
                <div className="text-muted">Loading guilds...</div>
              ) : (
                <Form.Select
                  value={selectedGuildId}
                  onChange={(e) => setSelectedGuildId(e.target.value)}
                >
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>
          </Card.Body>
        </Card>

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" className="me-2" />
            Loading settings...
          </div>
        ) : (
          <>
            <Card className="mb-4">
              <Card.Header>
                <div className="d-flex align-items-center">
                  <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
                    <use href={`${basePath}/icons/sprite.svg#settings`} />
                  </svg>
                  <h5 className="mb-0">General</h5>
                </div>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Language</Form.Label>
                  <Form.Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Francais</option>
                    <option value="es">Espanol</option>
                    <option value="pt">Portugues</option>
                    <option value="ja">Japanese</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Bot language for this guild.
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            <div className="d-flex align-items-center gap-3">
              {saveStatus && (
                <div
                  className="flex-grow-1 rounded px-3 py-2 d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor:
                      saveStatus.type === 'success' ? '#198754' : '#dc2626',
                    color: '#fff',
                  }}
                >
                  <span>{saveStatus.message}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-sm"
                    onClick={() => setSaveStatus(null)}
                    aria-label="Close"
                  />
                </div>
              )}
              {!saveStatus && <div className="flex-grow-1" />}
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="flex-shrink-0"
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
