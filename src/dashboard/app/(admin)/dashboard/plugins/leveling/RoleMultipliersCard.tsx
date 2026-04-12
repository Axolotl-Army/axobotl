'use client'
import { useCallback, useState } from 'react'
import { Card, Form, Badge, CloseButton, Button, Table } from 'react-bootstrap'
import { basePath } from '@/helpers'

type DiscordRole = { id: string; name: string; color: number }
type RoleMultiplierEntry = { roleId: string; multiplier: number }
type RoleMultiplierMode = 'highest' | 'multiply' | 'additive'

type RoleMultipliersCardProps = {
  roles: DiscordRole[]
  roleMultipliers: RoleMultiplierEntry[]
  setRoleMultipliers: (v: RoleMultiplierEntry[]) => void
  roleMultiplierMode: RoleMultiplierMode
  setRoleMultiplierMode: (v: RoleMultiplierMode) => void
}

function roleColor(color: number): string {
  return color === 0 ? '#99aab5' : `#${color.toString(16).padStart(6, '0')}`
}

function roleTextColor(color: number): string {
  const hex = color === 0 ? 0x99aab5 : color
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000' : '#fff'
}

const MODE_DESCRIPTIONS: Record<RoleMultiplierMode, string> = {
  highest: 'Only the highest multiplier among the user\'s roles applies.',
  multiply: 'All matching multipliers are multiplied together (can escalate quickly).',
  additive: 'Bonus portions are summed. E.g. 1.5x (+0.5) and 2x (+1.0) = 2.5x.',
}

export default function RoleMultipliersCard({
  roles,
  roleMultipliers,
  setRoleMultipliers,
  roleMultiplierMode,
  setRoleMultiplierMode,
}: RoleMultipliersCardProps) {
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [multiplierInput, setMultiplierInput] = useState('1.5')

  const addMultiplier = useCallback(() => {
    if (!selectedRoleId) return
    const multiplier = parseFloat(multiplierInput)
    if (isNaN(multiplier) || multiplier < 0.1 || multiplier > 10.0) return
    if (roleMultipliers.some((rm) => rm.roleId === selectedRoleId)) return
    if (roleMultipliers.length >= 25) return

    setRoleMultipliers([...roleMultipliers, { roleId: selectedRoleId, multiplier }])
    setSelectedRoleId('')
    setMultiplierInput('1.5')
  }, [selectedRoleId, multiplierInput, roleMultipliers, setRoleMultipliers])

  const removeMultiplier = useCallback(
    (roleId: string) => {
      setRoleMultipliers(roleMultipliers.filter((rm) => rm.roleId !== roleId))
    },
    [roleMultipliers, setRoleMultipliers],
  )

  const availableRoles = roles.filter(
    (r) => !roleMultipliers.some((rm) => rm.roleId === r.id),
  )

  const multiplierValue = parseFloat(multiplierInput)
  const isValidMultiplier = !isNaN(multiplierValue) && multiplierValue >= 0.1 && multiplierValue <= 10.0

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex align-items-center">
          <svg className="sa-icon sa-icon-lg sa-icon-primary me-2">
            <use href={`${basePath}/icons/sprite.svg#star`} />
          </svg>
          <h5 className="mb-0">Role XP Multipliers</h5>
        </div>
      </Card.Header>
      <Card.Body>
        <p className="text-muted mb-3">
          Assign XP multipliers to specific roles. Users with matching roles
          earn XP at the configured rate on top of the global multiplier.
        </p>

        {/* Stacking Mode */}
        <div className="border rounded p-3 mb-3">
          <h6 className="mb-2">Stacking Mode</h6>
          <Form.Text className="text-muted d-block mb-2">
            How multipliers combine when a user has multiple matching roles.
          </Form.Text>
          {(['highest', 'multiply', 'additive'] as RoleMultiplierMode[]).map((mode) => (
            <Form.Check
              key={mode}
              type="radio"
              id={`multiplier-mode-${mode}`}
              name="roleMultiplierMode"
              label={
                <span>
                  <strong className="text-capitalize">{mode}</strong>
                  {' \u2014 '}
                  <span className="text-muted">{MODE_DESCRIPTIONS[mode]}</span>
                </span>
              }
              checked={roleMultiplierMode === mode}
              onChange={() => setRoleMultiplierMode(mode)}
              className="mb-1"
            />
          ))}
        </div>

        {/* Add new multiplier */}
        <div className="d-flex gap-2 mb-3 align-items-end">
          <div className="flex-grow-1">
            <Form.Label className="small mb-1">Role</Form.Label>
            <Form.Select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
            >
              <option value="">-- Select a role --</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Form.Select>
          </div>
          <div style={{ width: '120px' }}>
            <Form.Label className="small mb-1">Multiplier</Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0.1"
              max="10.0"
              value={multiplierInput}
              onChange={(e) => setMultiplierInput(e.target.value)}
              isInvalid={multiplierInput !== '' && !isValidMultiplier}
            />
          </div>
          <Button
            variant="primary"
            onClick={addMultiplier}
            disabled={!selectedRoleId || !isValidMultiplier || roleMultipliers.length >= 25}
          >
            Add
          </Button>
        </div>

        {/* Current multipliers */}
        {roleMultipliers.length > 0 ? (
          <Table striped size="sm" className="mb-0">
            <thead>
              <tr>
                <th>Role</th>
                <th style={{ width: '120px' }}>Multiplier</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {roleMultipliers.map((rm) => {
                const role = roles.find((r) => r.id === rm.roleId)
                return (
                  <tr key={rm.roleId}>
                    <td>
                      <Badge
                        bg=""
                        className="px-2 py-1"
                        style={{
                          backgroundColor: role ? roleColor(role.color) : '#6c757d',
                          color: role ? roleTextColor(role.color) : '#fff',
                        }}
                      >
                        {role?.name ?? rm.roleId}
                      </Badge>
                    </td>
                    <td>{rm.multiplier}x</td>
                    <td>
                      <CloseButton onClick={() => removeMultiplier(rm.roleId)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        ) : (
          <p className="text-muted small mb-0">
            No role multipliers configured. All roles earn XP at the base rate.
          </p>
        )}

        {roleMultipliers.length >= 25 && (
          <Form.Text className="text-warning d-block mt-2">
            Maximum of 25 role multipliers reached.
          </Form.Text>
        )}
      </Card.Body>
    </Card>
  )
}
