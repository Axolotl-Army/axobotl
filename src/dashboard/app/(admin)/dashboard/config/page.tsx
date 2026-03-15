'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Col, Row, Form, Button, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { basePath } from '@/helpers'
import LevelingCard, { DEFAULT_LEVEL_UP_MESSAGE } from './LevelingCard'

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

type DiscordChannel = {
  id: string
  name: string
}

type SaveStatus = { type: 'success' | 'error'; message: string } | null

export default function ConfigPage() {
  const [guilds, setGuilds] = useState<GuildSummary[]>([])
  const [selectedGuildId, setSelectedGuildId] = useState<string>('')
  const [config, setConfig] = useState<GuildConfig | null>(null)
  const [channels, setChannels] = useState<DiscordChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null)

  // Form state
  const [language, setLanguage] = useState('en')
  const [levelUpMessage, setLevelUpMessage] = useState(DEFAULT_LEVEL_UP_MESSAGE)
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

  // Load config + channels when guild changes
  useEffect(() => {
    if (!selectedGuildId) return

    async function fetchData() {
      setLoading(true)
      setSaveStatus(null)
      try {
        const [configRes, channelsRes] = await Promise.all([
          fetch(`${basePath}/api/v1/guilds/${selectedGuildId}`),
          fetch(`${basePath}/api/v1/guilds/${selectedGuildId}/channels`),
        ])
        if (configRes.ok) {
          const data: GuildConfig = await configRes.json()
          setConfig(data)
          setLanguage(data.language ?? 'en')
          setLevelUpMessage(data.levelUpMessage ?? DEFAULT_LEVEL_UP_MESSAGE)
          setLevelUpChannelMode(data.levelUpChannelId ? 'specific' : 'same')
          setLevelUpChannelId(data.levelUpChannelId ?? '')
        }
        if (channelsRes.ok) {
          setChannels(await channelsRes.json())
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedGuildId])

  const handleSave = useCallback(async () => {
    if (!selectedGuildId) return

    setSaving(true)
    setSaveStatus(null)

    const templateToSave = levelUpMessage.trim()
    const isDefault = templateToSave === DEFAULT_LEVEL_UP_MESSAGE || templateToSave === ''

    const body: Record<string, string | null> = {
      language,
      levelUpMessage: isDefault ? null : templateToSave,
      levelUpChannelId: levelUpChannelMode === 'specific' ? (levelUpChannelId || null) : null,
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
            <Row>
              <Col lg={6} className="mb-4">
                <LevelingCard
                  channels={channels}
                  levelUpChannelMode={levelUpChannelMode}
                  setLevelUpChannelMode={setLevelUpChannelMode}
                  levelUpChannelId={levelUpChannelId}
                  setLevelUpChannelId={setLevelUpChannelId}
                  levelUpMessage={levelUpMessage}
                  setLevelUpMessage={setLevelUpMessage}
                />
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

            <div className="d-flex align-items-center gap-3">
              {saveStatus && (
                <div
                  className="flex-grow-1 rounded px-3 py-2 d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: saveStatus.type === 'success' ? '#198754' : '#dc2626',
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
                  'Save Configuration'
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded px-3 py-2" style={{ backgroundColor: '#0d6efd22', color: 'var(--bs-body-color)' }}>
            No guild selected or guild not found.
          </div>
        )}
      </div>
    </div>
  )
}
