import Link from 'next/link'
import { basePath } from '@/helpers'

export default function NotFound() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <svg className="sa-icon sa-icon-5x sa-icon-primary mb-4">
        <use href={`${basePath}/icons/sprite.svg#alert-octagon`}></use>
      </svg>
      <h1 className="display-4 fw-bold">404</h1>
      <p className="text-muted mb-4">Page Not Found</p>
      <Link href="/dashboard" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  )
}
