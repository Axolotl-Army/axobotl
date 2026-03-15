'use client'
import { Form } from 'react-bootstrap'
import { useGuildContext } from '@/context/useGuildContext'

const GuildSelector = () => {
  const { guilds, selectedGuildId, setSelectedGuildId, loading } = useGuildContext()

  if (loading && guilds.length === 0) return null

  return (
    <Form.Select
      size="sm"
      value={selectedGuildId}
      onChange={(e) => setSelectedGuildId(e.target.value)}
      className="hidden-mobile"
      style={{ width: 'auto', maxWidth: '200px' }}
    >
      {guilds.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </Form.Select>
  )
}

export default GuildSelector
