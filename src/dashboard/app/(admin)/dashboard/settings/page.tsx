'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Form, Button, Spinner } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { basePath } from '@/helpers'
import { useGuildContext } from '@/context/useGuildContext'

type GuildConfig = {
  id: string
  language: string
  embedColor: string | null
  disabledCommands: string[]
}

const COLOUR_SWATCHES = [
  { label: 'Blurple', value: '#5865F2' },
  { label: 'Green', value: '#57F287' },
  { label: 'Yellow', value: '#FEE75C' },
  { label: 'Fuchsia', value: '#EB459E' },
  { label: 'Red', value: '#ED4245' },
  { label: 'White', value: '#FFFFFF' },
]
type SaveStatus = { type: 'success' | 'error'; message: string } | null

const XP_COEFFICIENT = 50
const XP_EXPONENT = 1.7385

function getXpForLevel(level: number): number {
  if (level <= 0) return 0
  return Math.round(XP_COEFFICIENT * Math.pow(level, XP_EXPONENT))
}

function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 0
  let l = Math.floor(Math.pow(totalXp / XP_COEFFICIENT, 1 / XP_EXPONENT))
  while (getXpForLevel(l + 1) <= totalXp) l++
  while (l > 0 && getXpForLevel(l) > totalXp) l--
  return l
}

const PREVIEW_XP = 1337
const PREVIEW_LEVEL = getLevelFromXp(PREVIEW_XP)
const PREVIEW_XP_CURRENT = getXpForLevel(PREVIEW_LEVEL)
const PREVIEW_XP_NEXT = getXpForLevel(PREVIEW_LEVEL + 1)
const PREVIEW_XP_INTO = PREVIEW_XP - PREVIEW_XP_CURRENT
const PREVIEW_XP_NEEDED = PREVIEW_XP_NEXT - PREVIEW_XP_CURRENT

const BASE_COMMANDS = [
  { name: 'help', label: 'Help', description: 'List all available commands' },
  { name: 'ping', label: 'Ping', description: 'Check bot latency' },
  { name: 'info', label: 'Info', description: 'Show general information about the bot' },
]

function EmbedPreview({ color, userName, avatarUrl }: {
  color: string
  userName: string
  avatarUrl?: string
}) {
  const progressPercent = Math.round((PREVIEW_XP_INTO / PREVIEW_XP_NEEDED) * 100)
  return (
    <div
      style={{
        display: 'flex',
        maxWidth: 520,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#2b2d31',
        fontFamily: 'gg sans, Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ width: 4, flexShrink: 0, backgroundColor: color }} />
      <div style={{ padding: '12px 16px', flex: 1, minWidth: 0 }}>
        {/* Section: name + level + avatar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#f2f3f5', fontWeight: 700, fontSize: 15 }}>
              {userName}
            </div>
            <div style={{ color: '#b5bac1', fontSize: 14, marginTop: 2 }}>
              Level {PREVIEW_LEVEL}
            </div>
          </div>
          <img
            src={avatarUrl ?? `https://cdn.discordapp.com/embed/avatars/0.png`}
            alt=""
            width={64}
            height={64}
            style={{ borderRadius: 6, flexShrink: 0 }}
          />
        </div>

        {/* Separator */}
        <hr style={{ border: 'none', borderTop: '1px solid #3f4147', margin: '10px 0' }} />

        {/* Stats */}
        <div style={{ color: '#dbdee1', fontSize: 14, lineHeight: 1.7 }}>
          <div><strong>Total XP:</strong> {PREVIEW_XP.toLocaleString()}</div>
          <div><strong>Guild Rank:</strong> #7</div>
          <div>
            <strong>Progress to Level {PREVIEW_LEVEL + 1}:</strong>{' '}
            {PREVIEW_XP_INTO.toLocaleString()} / {PREVIEW_XP_NEEDED.toLocaleString()} XP
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#1e1f22',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              borderRadius: 4,
              backgroundColor: color,
              transition: 'width 0.3s ease, background-color 0.3s ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const { selectedGuildId, loading: guildsLoading } = useGuildContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null)
  const [language, setLanguage] = useState('en')
  const [embedColor, setEmbedColor] = useState<string | null>(null)
  const [disabledCommands, setDisabledCommands] = useState<string[]>([])

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
          setEmbedColor(data.embedColor ?? null)
          setDisabledCommands(data.disabledCommands ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [selectedGuildId])

  const toggleCommand = useCallback((name: string) => {
    setDisabledCommands((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    )
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedGuildId) return
    setSaving(true)
    setSaveStatus(null)

    try {
      const res = await fetch(`${basePath}/api/v1/guilds/${selectedGuildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, embedColor, disabledCommands }),
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
  }, [selectedGuildId, language, embedColor, disabledCommands])

  return (
    <div className="content-wrapper">
      <PageBreadcrumb title="General Settings" subTitle1="Dashboard" subTitle2="Settings" />

      <div className="main-content">
        {guildsLoading || loading ? (
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

            <Card className="mb-4">
              <Card.Header>
                <div className="d-flex align-items-center">
                  <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
                    <use href={`${basePath}/icons/sprite.svg#color-palette`} />
                  </svg>
                  <h5 className="mb-0">Default Embed Colour</h5>
                </div>
              </Card.Header>
              <Card.Body>
                <p className="text-muted mb-3">
                  Choose a default colour for bot embeds. Commands that specify their own colour
                  will override this setting.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {COLOUR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.value}
                      type="button"
                      className="btn btn-sm d-flex align-items-center gap-1 px-2 py-1"
                      style={{
                        border: embedColor === swatch.value
                          ? '2px solid var(--bs-primary)'
                          : '1px solid var(--bs-border-color)',
                        borderRadius: '0.375rem',
                        background: 'transparent',
                      }}
                      onClick={() => setEmbedColor(swatch.value)}
                      title={swatch.label}
                    >
                      <span
                        className="rounded-circle d-inline-block"
                        style={{
                          width: 18,
                          height: 18,
                          backgroundColor: swatch.value,
                          border: '1px solid var(--bs-border-color)',
                        }}
                      />
                      <span className="small">{swatch.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-2 py-1"
                    onClick={() => setEmbedColor(null)}
                    style={{
                      border: embedColor === null
                        ? '2px solid var(--bs-primary)'
                        : undefined,
                    }}
                  >
                    Default
                  </button>
                </div>
                <Form.Group>
                  <Form.Label className="fw-semibold">Custom Colour</Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    <Form.Control
                      type="color"
                      value={embedColor ?? '#5865F2'}
                      onChange={(e) => setEmbedColor(e.target.value.toUpperCase())}
                      style={{ width: 48, height: 38, padding: 2 }}
                    />
                    <Form.Control
                      type="text"
                      value={embedColor ?? ''}
                      onChange={(e) => {
                        const v = e.target.value.trim()
                        if (v === '') {
                          setEmbedColor(null)
                        } else {
                          setEmbedColor(v.toUpperCase())
                        }
                      }}
                      placeholder="#5865F2"
                      maxLength={7}
                      style={{ maxWidth: 120 }}
                    />
                    {embedColor && (
                      <span
                        className="rounded d-inline-block"
                        style={{
                          width: 38,
                          height: 38,
                          backgroundColor: embedColor,
                          border: '1px solid var(--bs-border-color)',
                        }}
                      />
                    )}
                  </div>
                  <Form.Text className="text-muted">
                    {embedColor
                      ? `Preview: ${embedColor}`
                      : 'No custom colour set — using bot default (Blurple).'}
                  </Form.Text>
                </Form.Group>

                <hr className="my-4" />
                <Form.Label className="fw-semibold mb-3">Preview</Form.Label>
                <EmbedPreview
                  color={embedColor ?? '#5865F2'}
                  userName={session?.user?.name ?? 'User'}
                  avatarUrl={session?.user?.image ?? undefined}
                />
              </Card.Body>
            </Card>

            <Card className="mb-4">
              <Card.Header>
                <div className="d-flex align-items-center">
                  <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
                    <use href={`${basePath}/icons/sprite.svg#terminal`} />
                  </svg>
                  <h5 className="mb-0">Commands</h5>
                </div>
              </Card.Header>
              <Card.Body>
                <p className="text-muted mb-3">
                  Enable or disable base commands for this guild. Disabled commands will not
                  respond when used.
                </p>
                {BASE_COMMANDS.map((cmd) => {
                  const enabled = !disabledCommands.includes(cmd.name)
                  return (
                    <div
                      key={cmd.name}
                      className="d-flex align-items-center justify-content-between py-2 border-bottom"
                    >
                      <div>
                        <span className="fw-semibold">/{cmd.label}</span>
                        <span className="text-muted ms-2">{cmd.description}</span>
                      </div>
                      <Form.Check
                        type="switch"
                        id={`cmd-toggle-${cmd.name}`}
                        checked={enabled}
                        onChange={() => toggleCommand(cmd.name)}
                      />
                    </div>
                  )
                })}
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
