'use client'
import { Card, Col, Row, Form } from 'react-bootstrap'
import { basePath } from '@/helpers'

type XpSettingsCardProps = {
  xpMin: number
  setXpMin: (v: number) => void
  xpMax: number
  setXpMax: (v: number) => void
  cooldownMs: number
  setCooldownMs: (v: number) => void
  xpMultiplier: number
  setXpMultiplier: (v: number) => void
}

export default function XpSettingsCard({
  xpMin,
  setXpMin,
  xpMax,
  setXpMax,
  cooldownMs,
  setCooldownMs,
  xpMultiplier,
  setXpMultiplier,
}: XpSettingsCardProps) {
  return (
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
  )
}
