'use client'
import { useCallback } from 'react'
import { Card, Col, Row, Form, Badge, CloseButton } from 'react-bootstrap'
import { basePath } from '@/helpers'

type DiscordChannel = { id: string; name: string }
type DiscordRole = { id: string; name: string; color: number }

type XpFiltersCardProps = {
  channels: DiscordChannel[]
  roles: DiscordRole[]
  roleFilterMode: 'include' | 'exclude'
  setRoleFilterMode: (v: 'include' | 'exclude') => void
  roleFilterIds: string[]
  setRoleFilterIds: (v: string[]) => void
  channelFilterMode: 'include' | 'exclude'
  setChannelFilterMode: (v: 'include' | 'exclude') => void
  channelFilterIds: string[]
  setChannelFilterIds: (v: string[]) => void
}

function roleColor(color: number): string {
  return color === 0 ? '#99aab5' : `#${color.toString(16).padStart(6, '0')}`
}

function roleTextColor(color: number): string {
  const hex = color === 0 ? 0x99aab5 : color
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  // Relative luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000' : '#fff'
}

export default function XpFiltersCard({
  channels,
  roles,
  roleFilterMode,
  setRoleFilterMode,
  roleFilterIds,
  setRoleFilterIds,
  channelFilterMode,
  setChannelFilterMode,
  channelFilterIds,
  setChannelFilterIds,
}: XpFiltersCardProps) {
  const addRole = useCallback(
    (id: string) => {
      if (id && !roleFilterIds.includes(id)) {
        setRoleFilterIds([...roleFilterIds, id])
      }
    },
    [roleFilterIds, setRoleFilterIds],
  )

  const removeRole = useCallback(
    (id: string) => {
      setRoleFilterIds(roleFilterIds.filter((r) => r !== id))
    },
    [roleFilterIds, setRoleFilterIds],
  )

  const addChannel = useCallback(
    (id: string) => {
      if (id && !channelFilterIds.includes(id)) {
        setChannelFilterIds([...channelFilterIds, id])
      }
    },
    [channelFilterIds, setChannelFilterIds],
  )

  const removeChannel = useCallback(
    (id: string) => {
      setChannelFilterIds(channelFilterIds.filter((c) => c !== id))
    },
    [channelFilterIds, setChannelFilterIds],
  )

  const availableRoles = roles.filter((r) => !roleFilterIds.includes(r.id))
  const availableChannels = channels.filter((c) => !channelFilterIds.includes(c.id))

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex align-items-center">
          <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
            <use href={`${basePath}/icons/sprite.svg#filter`} />
          </svg>
          <h5 className="mb-0">XP Filters</h5>
        </div>
      </Card.Header>
      <Card.Body>
        <p className="text-muted mb-3">
          Restrict which users and channels can earn XP. Leave a filter empty to
          allow all. Both filters must pass for XP to be awarded.
        </p>

        <Row>
          {/* Role Filter */}
          <Col lg={6} className="mb-3 mb-lg-0">
            <div className="border rounded p-3 h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="mb-0">Role Filter</h6>
                <Form.Check
                  type="switch"
                  id="role-filter-mode"
                  label={roleFilterMode === 'include' ? 'Include' : 'Exclude'}
                  checked={roleFilterMode === 'exclude'}
                  onChange={(e) =>
                    setRoleFilterMode(e.target.checked ? 'exclude' : 'include')
                  }
                />
              </div>

              <Form.Text className="text-muted d-block mb-2">
                {roleFilterMode === 'include'
                  ? 'Only users with these roles will earn XP.'
                  : 'Users with these roles will NOT earn XP.'}
              </Form.Text>

              <Form.Select
                value=""
                onChange={(e) => {
                  addRole(e.target.value)
                  e.target.value = ''
                }}
                className="mb-2"
              >
                <option value="">-- Add a role --</option>
                {availableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Form.Select>

              <div className="d-flex flex-wrap gap-1">
                {roleFilterIds.map((id) => {
                  const role = roles.find((r) => r.id === id)
                  return (
                    <Badge
                      key={id}
                      bg=""
                      className="d-flex align-items-center gap-1 px-2 py-1"
                      style={{
                        backgroundColor: role ? roleColor(role.color) : '#6c757d',
                        color: role ? roleTextColor(role.color) : '#fff',
                      }}
                    >
                      {role?.name ?? id}
                      <CloseButton
                        variant="white"
                        onClick={() => removeRole(id)}
                        style={{ fontSize: '0.5rem' }}
                      />
                    </Badge>
                  )
                })}
              </div>
            </div>
          </Col>

          {/* Channel Filter */}
          <Col lg={6}>
            <div className="border rounded p-3 h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="mb-0">Channel Filter</h6>
                <Form.Check
                  type="switch"
                  id="channel-filter-mode"
                  label={channelFilterMode === 'include' ? 'Include' : 'Exclude'}
                  checked={channelFilterMode === 'exclude'}
                  onChange={(e) =>
                    setChannelFilterMode(
                      e.target.checked ? 'exclude' : 'include',
                    )
                  }
                />
              </div>

              <Form.Text className="text-muted d-block mb-2">
                {channelFilterMode === 'include'
                  ? 'XP is only earned in these channels.'
                  : 'XP is NOT earned in these channels.'}
              </Form.Text>

              <Form.Select
                value=""
                onChange={(e) => {
                  addChannel(e.target.value)
                  e.target.value = ''
                }}
                className="mb-2"
              >
                <option value="">-- Add a channel --</option>
                {availableChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </Form.Select>

              <div className="d-flex flex-wrap gap-1">
                {channelFilterIds.map((id) => {
                  const channel = channels.find((c) => c.id === id)
                  return (
                    <Badge
                      key={id}
                      bg="secondary"
                      className="d-flex align-items-center gap-1 px-2 py-1"
                    >
                      #{channel?.name ?? id}
                      <CloseButton
                        variant="white"
                        onClick={() => removeChannel(id)}
                        style={{ fontSize: '0.5rem' }}
                      />
                    </Badge>
                  )
                })}
              </div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}
