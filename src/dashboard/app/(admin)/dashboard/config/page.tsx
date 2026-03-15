'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Col, Row, Form, Button, Alert, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { basePath } from '@/helpers'

type GuildSummary = {
  id: string
  name: string
}

type GuildConfig = {
  id: string
  name: string
  language: string
  levelUpMessage: string | null
  levelUpChannelId: string | null
  logsChannelId: string | null
}

type SaveStatus = { type: 'success' | 'error'; message: string } | null

export default function ConfigPage() {
  const [guilds, setGuilds] = useState<GuildSummary[]>([])
  const [selectedGuildId, setSelectedGuildId] = useState<string>('')
  const [config, setConfig] = useState<GuildConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null)

  // Form state
  const [language, setLanguage] = useState('en')
  const [levelUpMessage, setLevelUpMessage] = useState('')
  const [levelUpChannelMode, setLevelUpChannelMode] = useState<'same' | 'specific'>('same')
  const [levelUpChannelId, setLevelUpChannelId] = useState('')

  // Load guild list
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

  // Load config when guild changes
  useEffect(() => {
    if (!selectedGuildId) return

    async function fetchConfig() {
      setLoading(true)
      setSaveStatus(null)
      try {
        const res = await fetch(`${basePath}/api/v1/guilds/${selectedGuildId}`)
        if (res.ok) {
          const data: GuildConfig = await res.json()
          setConfig(data)
          setLanguage(data.language ?? 'en')
          setLevelUpMessage(data.levelUpMessage ?? '')
          setLevelUpChannelMode(data.levelUpChannelId ? 'specific' : 'same')
          setLevelUpChannelId(data.levelUpChannelId ?? '')
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

    const body: Record<string, string | null> = {
      language,
      levelUpMessage: levelUpMessage.trim() || null,
      levelUpChannelId: levelUpChannelMode === 'specific' ? (levelUpChannelId.trim() || null) : null,
    }

    try {
      const res = await fetch(`${basePath}/api/v1/guilds/${selectedGuildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const updated: GuildConfig = await res.json()
        setConfig(updated)
        setSaveStatus({ type: 'success', message: 'Configuration saved.' })
      } else {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        setSaveStatus({ type: 'error', message: err.error ?? 'Save failed' })
      }
    } catch {
      setSaveStatus({ type: 'error', message: 'Network error' })
    } finally {
      setSaving(false)
    }
  }, [selectedGuildId, language, levelUpMessage, levelUpChannelMode, levelUpChannelId])

  const previewMessage = (levelUpMessage.trim() || 'GG {user}, you reached **level {level}**!')
    .replace(/\{user\}/g, '@User')
    .replace(/\{level\}/g, '5')

  return (
    <div className="content-wrapper">
      <PageBreadcrumb title="Configuration" subTitle1="Dashboard" subTitle2="Config" />

      <div className="main-content">
        {/* Guild Selector */}
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
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>
          </Card.Body>
        </Card>

        {loading && config === null ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" className="me-2" />
            Loading configuration...
          </div>
        ) : config ? (
          <>
            {saveStatus && (
              <Alert
                variant={saveStatus.type === 'success' ? 'success' : 'danger'}
                dismissible
                onClose={() => setSaveStatus(null)}
              >
                {saveStatus.message}
              </Alert>
            )}

            <Row>
              {/* Leveling Card */}
              <Col lg={6} className="mb-4">
                <Card className="h-100">
                  <Card.Header>
                    <div className="d-flex align-items-center">
                      <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
                        <use href={`${basePath}/icons/sprite.svg#award`}></use>
                      </svg>
                      <h5 className="mb-0">Leveling</h5>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Level-Up Notification Channel</Form.Label>
                      <div className="mb-2">
                        <Form.Check
                          type="radio"
                          id="channel-same"
                          name="levelUpChannel"
                          label="Same channel as user's message"
                          checked={levelUpChannelMode === 'same'}
                          onChange={() => setLevelUpChannelMode('same')}
                        />
                        <Form.Check
                          type="radio"
                          id="channel-specific"
                          name="levelUpChannel"
                          label="Specific channel"
                          checked={levelUpChannelMode === 'specific'}
                          onChange={() => setLevelUpChannelMode('specific')}
                        />
                      </div>
                      {levelUpChannelMode === 'specific' && (
                        <Form.Control
                          type="text"
                          placeholder="Channel ID (e.g. 123456789012345678)"
                          value={levelUpChannelId}
                          onChange={(e) => setLevelUpChannelId(e.target.value)}
                          maxLength={20}
                        />
                      )}
                      <Form.Text className="text-muted">
                        Where level-up notifications are posted.
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Level-Up Message Template</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="GG {user}, you reached **level {level}**!"
                        value={levelUpMessage}
                        onChange={(e) => setLevelUpMessage(e.target.value)}
                        maxLength={500}
                      />
                      <Form.Text className="text-muted">
                        Use <code>{'{user}'}</code> and <code>{'{level}'}</code> as placeholders. Leave blank for default.
                      </Form.Text>
                    </Form.Group>

                    <div className="p-2 rounded bg-dark bg-opacity-25">
                      <small className="text-muted d-block mb-1">Preview:</small>
                      <span>{previewMessage}</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* General Card */}
              <Col lg={6} className="mb-4">
                <Card className="h-100">
                  <Card.Header>
                    <div className="d-flex align-items-center">
                      <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
                        <use href={`${basePath}/icons/sprite.svg#settings`}></use>
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
              </Col>
            </Row>

            <div className="d-flex justify-content-end">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </div>
          </>
        ) : (
          <Alert variant="info">No guild selected or guild not found.</Alert>
        )}
      </div>
    </div>
  )
}
