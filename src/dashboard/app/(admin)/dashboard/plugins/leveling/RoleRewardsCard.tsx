'use client'
import { useCallback, useMemo, useState } from 'react'
import { Card, Form, Button } from 'react-bootstrap'
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import DataTable from '@/components/table/DataTable'
import { basePath } from '@/helpers'

type DiscordRole = { id: string; name: string; color: number }
type LevelRoleEntry = { level: number; roleId: string; cumulative: boolean }

type RoleRewardsCardProps = {
  roles: DiscordRole[]
  levelRoles: LevelRoleEntry[]
  setLevelRoles: React.Dispatch<React.SetStateAction<LevelRoleEntry[]>>
}

const columnHelper = createColumnHelper<LevelRoleEntry>()

export default function RoleRewardsCard({
  roles,
  levelRoles,
  setLevelRoles,
}: RoleRewardsCardProps) {
  const [newRoleLevel, setNewRoleLevel] = useState('')
  const [newRoleId, setNewRoleId] = useState('')

  const roleName = useCallback(
    (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? roleId,
    [roles],
  )

  const toggleCumulative = useCallback(
    (level: number) => {
      setLevelRoles((prev) =>
        prev.map((lr) =>
          lr.level === level ? { ...lr, cumulative: !lr.cumulative } : lr,
        ),
      )
    },
    [setLevelRoles],
  )

  const removeRoleReward = useCallback(
    (level: number) => {
      setLevelRoles((prev) => prev.filter((lr) => lr.level !== level))
    },
    [setLevelRoles],
  )

  const addRoleReward = useCallback(() => {
    const level = parseInt(newRoleLevel, 10)
    if (!level || level < 1 || level > 100 || !newRoleId) return
    if (levelRoles.some((lr) => lr.level === level)) return

    setLevelRoles((prev) =>
      [...prev, { level, roleId: newRoleId, cumulative: false }].sort(
        (a, b) => a.level - b.level,
      ),
    )
    setNewRoleLevel('')
    setNewRoleId('')
  }, [newRoleLevel, newRoleId, levelRoles, setLevelRoles])

  const columns = useMemo(
    () => [
      columnHelper.accessor('level', {
        header: 'Level',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor('roleId', {
        header: 'Role',
        cell: ({ getValue }) => roleName(getValue()),
        enableSorting: false,
      }),
      columnHelper.accessor('cumulative', {
        header: 'Cumulative',
        cell: ({ row }) => (
          <Form.Check
            type="checkbox"
            id={`cumulative-${row.original.level}`}
            checked={row.original.cumulative}
            onChange={() => toggleCumulative(row.original.level)}
            title="Keep this role through all level-ups"
          />
        ),
        enableSorting: false,
        meta: { className: 'text-center' },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => removeRoleReward(row.original.level)}
          >
            Remove
          </Button>
        ),
        meta: { className: 'text-end' },
      }),
    ],
    [roleName, toggleCumulative, removeRoleReward],
  )

  const table = useReactTable({
    data: levelRoles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { sorting: [{ id: 'level', desc: false }] },
  })

  return (
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
          Assign roles automatically when members reach specific levels.
          Non-cumulative roles are replaced when a higher role reward is earned.
          Cumulative roles persist through all level-ups.
        </p>

        {levelRoles.length > 0 && (
          <DataTable
            table={table}
            emptyMessage="No role rewards configured."
          />
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
  )
}
