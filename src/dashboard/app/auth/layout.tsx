import Link from 'next/link'
import { ChildrenType } from '@/types'
import BackgroundAnimation from '@/components/BackgroundAnimation'

const AuthLayout = ({ children }: ChildrenType) => {
  return (
    <>
      <nav
        className="navbar navbar-expand-lg navbar-dark position-fixed w-100 py-3"
        style={{ zIndex: 1000 }}
      >
        <div className="container">
          <Link className="navbar-brand fw-bold fs-4" href="/">
            Axobotl
          </Link>
          <div className="ms-auto d-flex gap-2">
            <Link
              href="/auth/login"
              className="btn btn-link text-white border-0 text-decoration-none"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      <section className="hero-section position-relative overflow-hidden">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
        <BackgroundAnimation />
      </section>
    </>
  )
}

export default AuthLayout
