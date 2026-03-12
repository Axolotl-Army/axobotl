'use client'
import { basePath } from '@/helpers'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <svg className="sa-icon sa-icon-5x sa-icon-danger mb-4">
        <use href={`${basePath}/icons/sprite.svg#alert-triangle`}></use>
      </svg>
      <h1 className="display-4 fw-bold">Something went wrong</h1>
      <p className="text-muted mb-4">{error.message || 'An unexpected error occurred'}</p>
      <button className="btn btn-primary" onClick={reset}>
        Try Again
      </button>
    </div>
  )
}
