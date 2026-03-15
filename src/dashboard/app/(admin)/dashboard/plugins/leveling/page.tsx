'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Col, Row, Form, Button, Spinner, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { basePath } from '@/helpers'
import { useGuildContext } from '@/context/useGuildContext'

type DiscordChannel = { id: string; name: string }
type DiscordRole = { id: string; name: string; color: number }
type LevelRoleEntry = { level: number; roleId: string }
type SaveStatus = { type: 'success' | 'error'; message: string } | null

type LevelingConfig = {
  levelUpMessage: string | null
  levelUpChannelId: string | null
  xpMin: number
  xpMax: number
  cooldownMs: number
  xpMultiplier: number
}

const DEFAULT_LEVEL_UP_MESSAGE = 'GG {user}, you reached **level {level}**!'

const DEFAULTS: LevelingConfig = {
  levelUpMessage: null,
  levelUpChannelId: null,
  xpMin: 7,
  xpMax: 13,
  cooldownMs: 60000,
  xpMultiplier: 1.0,
}

export default function LevelingPluginPage() {
  const { selectedGuildId, loading: guildsLoading } = useGuildContext()
  const [channels, setChannels] = useState<DiscordChannel[]>([])
  const [roles, setRoles] = useState<DiscordRole[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null)

  // Plugin state
  const [enabled, setEnabled] = useState(false)
  const [toggling, setToggling] = useState(false)

  // Config state
  const [levelUpMessage, setLevelUpMessage] = useState(DEFAULT_LEVEL_UP_MESSAGE)
  const [levelUpChannelMode, setLevelUpChannelMode] = useState<'same' | 'specific'>('same')
  const [levelUpChannelId, setLevelUpChannelId] = useState('')
  const [xpMin, setXpMin] = useState(7)
  const [xpMax, setXpMax] = useState(13)
  const [cooldownMs, setCooldownMs] = useState(60000)
  const [xpMultiplier, setXpMultiplier] = useState(1.0)

  // Role rewards
  const [levelRoles, setLevelRoles] = useState<LevelRoleEntry[]>([])
  const [newRoleLevel, setNewRoleLevel] = useState('')
  const [newRoleId, setNewRoleId] = useState('')

  // Load plugin config when guild changes
  useEffect(() => {
    if (!selectedGuildId) return

    async function fetchData() {
      setLoading(true)
      setSaveStatus(null)

      try {
        const [pluginsRes, channelsRes, rolesRes, levelRolesRes] = await Promise.all([
          fetch(`${basePath}/api/v1/guilds/${selectedGuildId}/plugins`),
          fetch(`${basePath}/api/v1/guilds/${selectedGuildId}/channels`),
          fetch(`${basePath}/api/v1/guilds/${selectedGuildId}/roles`),
          fetch(`${basePath}/api/v1/guilds/${selectedGuildId}/plugins/leveling/roles`),
        ])

        if (pluginsRes.ok) {
          const plugins = await pluginsRes.json()
          const leveling = plugins.find((p: { id: string }) => p.id === 'leveling')
          if (leveling) {
            setEnabled(leveling.enabled)
            const cfg = leveling.config as LevelingConfig
            setLevelUpMessage(cfg.levelUpMessage ?? DEFAULT_LEVEL_UP_MESSAGE)
            setLevelUpChannelMode(cfg.levelUpChannelId ? 'specific' : 'same')
            setLevelUpChannelId(cfg.levelUpChannelId ?? '')
            setXpMin(cfg.xpMin ?? DEFAULTS.xpMin)
            setXpMax(cfg.xpMax ?? DEFAULTS.xpMax)
            setCooldownMs(cfg.cooldownMs ?? DEFAULTS.cooldownMs)
            setXpMultiplier(cfg.xpMultiplier ?? DEFAULTS.xpMultiplier)
          }
        }

        if (channelsRes.ok) setChannels(await channelsRes.json())
        if (rolesRes.ok) setRoles(await rolesRes.json())
        if (levelRolesRes.ok) setLevelRoles(await levelRolesRes.json())
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedGuildId])

  const handleToggle = useCallback(
    async (newEnabled: boolean) => {
      if (!selectedGuildId) return
      setToggling(true)

      try {
        const res = await fetch(
          `${basePath}/api/v1/guilds/${selectedGuildId}/plugins/leveling`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: newEnabled }),
          },
        )
        if (res.ok) setEnabled(newEnabled)
      } finally {
        setToggling(false)
      }
    },
    [selectedGuildId],
  )

  const handleSave = useCallback(async () => {
    if (!selectedGuildId) return
    setSaving(true)
    setSaveStatus(null)

    const templateToSave = levelUpMessage.trim()
    const isDefault = templateToSave === DEFAULT_LEVEL_UP_MESSAGE || templateToSave === ''

    const config: Record<string, unknown> = {
      levelUpMessage: isDefault ? null : templateToSave,
      levelUpChannelId: levelUpChannelMode === 'specific' ? (levelUpChannelId || null) : null,
      xpMin,
      xpMax,
      cooldownMs,
      xpMultiplier,
    }

    try {
      const [configRes, rolesRes] = await Promise.all([
        fetch(
          `${basePath}/api/v1/guilds/${selectedGuildId}/plugins/leveling`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config }),
          },
        ),
        fetch(
          `${basePath}/api/v1/guilds/${selectedGuildId}/plugins/leveling/roles`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roles: levelRoles }),
          },
        ),
      ])

      if (configRes.ok && rolesRes.ok) {
        setSaveStatus({ type: 'success', message: 'Leveling configuration saved.' })
      } else {
        const err = !configRes.ok
          ? await configRes.json().catch(() => ({ error: 'Save failed' }))
          : await rolesRes.json().catch(() => ({ error: 'Save failed' }))
        setSaveStatus({ type: 'error', message: err.error ?? 'Save failed' })
      }
    } catch {
      setSaveStatus({ type: 'error', message: 'Network error' })
    } finally {
      setSaving(false)
    }
  }, [
    selectedGuildId,
    levelUpMessage,
    levelUpChannelMode,
    levelUpChannelId,
    xpMin,
    xpMax,
    cooldownMs,
    xpMultiplier,
    levelRoles,
  ])

  const addRoleReward = useCallback(() => {
    const level = parseInt(newRoleLevel, 10)
    if (!level || level < 1 || level > 100 || !newRoleId) return
    if (levelRoles.some((lr) => lr.level === level)) return

    setLevelRoles((prev) =>
      [...prev, { level, roleId: newRoleId }].sort((a, b) => a.level - b.level),
    )
    setNewRoleLevel('')
    setNewRoleId('')
  }, [newRoleLevel, newRoleId, levelRoles])

  const removeRoleReward = useCallback((level: number) => {
    setLevelRoles((prev) => prev.filter((lr) => lr.level !== level))
  }, [])

  const previewMessage = (levelUpMessage.trim() || DEFAULT_LEVEL_UP_MESSAGE)
    .replace(/\{user\}/g, '@User')
    .replace(/\{level\}/g, '5')

  const roleName = (roleId: string) =>
    roles.find((r) => r.id === roleId)?.name ?? roleId

  return (
    <div className="content-wrapper">
      <PageBreadcrumb title="Leveling" subTitle1="Plugins" subTitle2="Leveling" />

      <div className="main-content">
        {guildsLoading || loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" className="me-2" />
            Loading configuration...
          </div>
        ) : (
          <>
            {/* Enable/Disable Toggle */}
            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="mb-1">Leveling Plugin</h5>
                    <span className={`badge bg-${enabled ? 'success' : 'secondary'}`}>
                      {enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <Form.Check
                    type="switch"
                    id="leveling-toggle"
                    checked={enabled}
                    disabled={toggling}
                    onChange={(e) => handleToggle(e.target.checked)}
                    className="fs-4"
                  />
                </div>
              </Card.Body>
            </Card>

            {/* Config sections - dimmed when disabled */}
            <div style={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}>
              <Row>
                {/* Notifications */}
                <Col lg={6} className="mb-4">
                  <Card className="h-100">
                    <Card.Header>
                      <div className="d-flex align-items-center">
                        <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
                          <use href={`${basePath}/icons/sprite.svg#bell`} />
                        </svg>
                        <h5 className="mb-0">Notifications</h5>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">
                          Level-Up Notification Channel
                        </Form.Label>
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
                          <Form.Select
                            value={levelUpChannelId}
                            onChange={(e) => setLevelUpChannelId(e.target.value)}
                          >
                            <option value="">-- Select a channel --</option>
                            {channels.map((ch) => (
                              <option key={ch.id} value={ch.id}>
                                #{ch.name}
                              </option>
                            ))}
                          </Form.Select>
                        )}
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <Form.Label className="fw-semibold mb-0">
                            Level-Up Message Template
                          </Form.Label>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setLevelUpMessage(DEFAULT_LEVEL_UP_MESSAGE)}
                            disabled={levelUpMessage === DEFAULT_LEVEL_UP_MESSAGE}
                          >
                            Reset to default
                          </Button>
                        </div>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          placeholder={DEFAULT_LEVEL_UP_MESSAGE}
                          value={levelUpMessage}
                          onChange={(e) => setLevelUpMessage(e.target.value)}
                          maxLength={500}
                        />
                        <Form.Text className="text-muted">
                          Use <code>{'{user}'}</code> and <code>{'{level}'}</code> as
                          placeholders.
                        </Form.Text>
                      </Form.Group>

                      <div className="p-2 rounded bg-dark bg-opacity-25">
                        <small className="text-muted d-block mb-1">Preview:</small>
                        <span>{previewMessage}</span>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                {/* XP Settings */}
                <Col lg={6} className="mb-4">
                  <Card className="h-100">
                    <Card.Header>
                      <div className="d-flex align-items-center">
                        <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
                          <use href={`${basePath}/icons/sprite.svg#trending-up`} />
                        </svg>
                        <h5 className="mb-0">XP Settings</h5>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col sm={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Min XP per Message</Form.Label>
                            <Form.Control
                              type="number"
                              min={1}
                              max={100}
                              value={xpMin}
                              onChange={(e) => setXpMin(parseInt(e.target.value, 10) || 1)}
                            />
                          </Form.Group>
                        </Col>
                        <Col sm={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Max XP per Message</Form.Label>
                            <Form.Control
                              type="number"
                              min={1}
                              max={100}
                              value={xpMax}
                              onChange={(e) => setXpMax(parseInt(e.target.value, 10) || 1)}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">
                          Cooldown (seconds)
                        </Form.Label>
                        <Form.Control
                          type="number"
                          min={0}
                          max={300}
                          value={Math.round(cooldownMs / 1000)}
                          onChange={(e) =>
                            setCooldownMs((parseInt(e.target.value, 10) || 0) * 1000)
                          }
                        />
                        <Form.Text className="text-muted">
                          Time between XP awards per user (0-300 seconds).
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">
                          XP Multiplier
                        </Form.Label>
                        <Form.Control
                          type="number"
                          min={0.1}
                          max={10}
                          step={0.1}
                          value={xpMultiplier}
                          onChange={(e) =>
                            setXpMultiplier(parseFloat(e.target.value) || 1.0)
                          }
                        />
                        <Form.Text className="text-muted">
                          Multiply all XP gains by this value (0.1 - 10.0).
                        </Form.Text>
                      </Form.Group>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Role Rewards */}
              <Card className="mb-4">
                <Card.Header>
                  <div className="d-flex align-items-center">
                    <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
                      <use href={`${basePath}/icons/sprite.svg#shield`} />
                    </svg>
                    <h5 className="mb-0">Role Rewards</h5>
                  </div>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted mb-3">
                    Assign roles automatically when members reach specific levels. Rewards
                    are cumulative.
                  </p>

                  {levelRoles.length > 0 && (
                    <Table striped className="mb-3">
                      <thead>
                        <tr>
                          <th>Level</th>
                          <th>Role</th>
                          <th style={{ width: '80px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {levelRoles.map((lr) => (
                          <tr key={lr.level}>
                            <td>{lr.level}</td>
                            <td>{roleName(lr.roleId)}</td>
                            <td>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removeRoleReward(lr.level)}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}

                  <div className="d-flex gap-2 align-items-end">
                    <Form.Group style={{ width: '100px' }}>
                      <Form.Label className="fw-semibold small mb-1">Level</Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        max={100}
                        placeholder="e.g. 5"
                        value={newRoleLevel}
                        onChange={(e) => setNewRoleLevel(e.target.value)}
                      />
                    </Form.Group>

                    <Form.Group className="flex-grow-1">
                      <Form.Label className="fw-semibold small mb-1">Role</Form.Label>
                      <Form.Select
                        value={newRoleId}
                        onChange={(e) => setNewRoleId(e.target.value)}
                      >
                        <option value="">-- Select a role --</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Button
                      variant="outline-primary"
                      onClick={addRoleReward}
                      disabled={
                        !newRoleLevel ||
                        !newRoleId ||
                        levelRoles.some(
                          (lr) => lr.level === parseInt(newRoleLevel, 10),
                        )
                      }
                    >
                      Add
                    </Button>
                  </div>
                </Card.Body>
              </Card>

              {/* Save */}
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
                    'Save Configuration'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
