'use client'
import { Card, Form, Button } from 'react-bootstrap'
import { basePath } from '@/helpers'

const DEFAULT_LEVEL_UP_MESSAGE = 'GG {user}, you reached **level {level}**!'

type DiscordChannel = {
  id: string
  name: string
}

type LevelingCardProps = {
  channels: DiscordChannel[]
  levelUpChannelMode: 'same' | 'specific'
  setLevelUpChannelMode: (mode: 'same' | 'specific') => void
  levelUpChannelId: string
  setLevelUpChannelId: (id: string) => void
  levelUpMessage: string
  setLevelUpMessage: (msg: string) => void
}

export { DEFAULT_LEVEL_UP_MESSAGE }

export default function LevelingCard({
  channels,
  levelUpChannelMode,
  setLevelUpChannelMode,
  levelUpChannelId,
  setLevelUpChannelId,
  levelUpMessage,
  setLevelUpMessage,
}: LevelingCardProps) {
  const previewMessage = (levelUpMessage.trim() || DEFAULT_LEVEL_UP_MESSAGE)
    .replace(/\{user\}/g, '@User')
    .replace(/\{level\}/g, '5')

  return (
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
            <Form.Select
              value={levelUpChannelId}
              onChange={(e) => setLevelUpChannelId(e.target.value)}
            >
              <option value="">-- Select a channel --</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>#{ch.name}</option>
              ))}
            </Form.Select>
          )}
          <Form.Text className="text-muted">
            Where level-up notifications are posted.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <div className="d-flex align-items-center justify-content-between mb-1">
            <Form.Label className="fw-semibold mb-0">Level-Up Message Template</Form.Label>
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
            Use <code>{'{user}'}</code> and <code>{'{level}'}</code> as placeholders.
          </Form.Text>
        </Form.Group>

        <div className="p-2 rounded bg-dark bg-opacity-25">
          <small className="text-muted d-block mb-1">Preview:</small>
          <span>{previewMessage}</span>
        </div>
      </Card.Body>
    </Card>
  )
}
