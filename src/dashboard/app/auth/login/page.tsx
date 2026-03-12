'use client'
import { Button, Col, Row } from 'react-bootstrap'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  const handleDiscordLogin = () => {
    signIn('discord', { callbackUrl: '/dashboard' })
  }

  return (
    <Row className="justify-content-center">
      <Col xs={11} md={8} lg={6} xl={4}>
        <div className="login-card p-4 p-md-6 bg-dark bg-opacity-50 translucent-dark rounded-4">
          <h2 className="text-center mb-4">Axobotl</h2>
          <p className="text-center text-white opacity-50 mb-4">
            Sign in to access the bot dashboard
          </p>

          <div className="d-grid mb-3">
            <Button
              variant="primary"
              size="lg"
              className="bg-primary bg-opacity-75 d-flex align-items-center justify-content-center gap-2"
              onClick={handleDiscordLogin}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 71 55"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M60.1 4.9A58.5 58.5 0 0 0 45.4.2a.2.2 0 0 0-.2.1 40.8 40.8 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.3 37.3 0 0 0 25.4.3a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.6 4.9a.2.2 0 0 0-.1.1C1.5 18 -.9 30.6.3 43a.3.3 0 0 0 .1.2 58.7 58.7 0 0 0 17.7 9 .2.2 0 0 0 .3-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4l1.1-.9a.2.2 0 0 1 .2 0 41.9 41.9 0 0 0 35.6 0 .2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .4 36.3 36.3 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.2 47.2 0 0 0 3.6 5.9.2.2 0 0 0 .3.1 58.5 58.5 0 0 0 17.7-9 .3.3 0 0 0 .1-.2c1.4-14.5-2.4-27-10-38.1a.2.2 0 0 0-.1-.1zM23.7 35.2c-3.3 0-6-3-6-6.7s2.7-6.7 6-6.7 6.1 3 6 6.7c0 3.7-2.7 6.7-6 6.7zm22.2 0c-3.3 0-6-3-6-6.7s2.6-6.7 6-6.7c3.3 0 6 3 6 6.7-.1 3.7-2.7 6.7-6 6.7z" />
              </svg>
              Sign in with Discord
            </Button>
          </div>
        </div>
      </Col>
    </Row>
  )
}
