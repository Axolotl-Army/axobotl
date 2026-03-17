'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Col, Row, Form, Button, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { basePath } from '@/helpers'
import { useGuildContext } from '@/context/useGuildContext'
import NotificationsCard from './NotificationsCard'
import XpSettingsCard from './XpSettingsCard'
import RoleRewardsCard from './RoleRewardsCard'

type DiscordChannel = { id: string; name: string }
type DiscordRole = { id: string; name: string; color: number }
type LevelRoleEntry = { level: number; roleId: string; cumulative: boolean }
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
                <Col lg={6} className="mb-4">
                  <NotificationsCard
                    channels={channels}
                    levelUpMessage={levelUpMessage}
                    setLevelUpMessage={setLevelUpMessage}
                    levelUpChannelMode={levelUpChannelMode}
                    setLevelUpChannelMode={setLevelUpChannelMode}
                    levelUpChannelId={levelUpChannelId}
                    setLevelUpChannelId={setLevelUpChannelId}
                    defaultMessage={DEFAULT_LEVEL_UP_MESSAGE}
                  />
                </Col>

                <Col lg={6} className="mb-4">
                  <XpSettingsCard
                    xpMin={xpMin}
                    setXpMin={setXpMin}
                    xpMax={xpMax}
                    setXpMax={setXpMax}
                    cooldownMs={cooldownMs}
                    setCooldownMs={setCooldownMs}
                    xpMultiplier={xpMultiplier}
                    setXpMultiplier={setXpMultiplier}
                  />
                </Col>
              </Row>

              <RoleRewardsCard
                roles={roles}
                levelRoles={levelRoles}
                setLevelRoles={setLevelRoles}
              />

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
