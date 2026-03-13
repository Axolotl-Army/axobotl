import Link from 'next/link'
import { basePath } from '@/helpers'

const AppLogo = () => {
  return (
    <Link
      href="/dashboard"
      className="app-logo flex-shrink-0"
      data-prefix="v0.1.0"
    >
      <svg className="custom-logo">
        <use href={`${basePath}/app-logo.svg#custom-logo`}></use>
      </svg>

      <div className="logo-backdrop">
        <div className="blobs">
          <svg viewBox="0 0 1200 1200">
            <g className="blob blob-1">
              <path d="M 100 600 q 0 -700, 500 -500 t 500 500 t -500 500 T 100 600 z" />
            </g>
            <g className="blob blob-2">
              <path d="M 100 600 q -50 -400, 500 -500 t 450 550 t -500 500 T 100 600 z" />
            </g>
            <g className="blob blob-3">
              <path d="M 100 600 q 0 -400, 500 -500 t 400 500 t -500 500 T 100 600 z" />
            </g>
            <g className="blob blob-4">
              <path d="M 150 600 q 0 -600, 500 -500 t 500 550 t -500 500 T 150 600 z" />
            </g>
            <g className="blob blob-1 alt">
              <path d="M 150 600 q 0 -600, 500 -500 t 500 550 t -500 500 T 150 600 z" />
            </g>
            <g className="blob blob-2 alt">
              <path d="M 100 600 q 100 -600, 500 -500 t 400 500 t -500 500 T 100 600 z" />
            </g>
            <g className="blob blob-3 alt">
              <path d="M 100 600 q 0 -400, 500 -500 t 400 500 t -500 500 T 100 600 z" />
            </g>
            <g className="blob blob-4 alt">
              <path d="M 150 600 q 0 -600, 500 -500 t 500 550 t -500 500 T 150 600 z" />
            </g>
          </svg>
        </div>
      </div>
    </Link>
  )
}

export default AppLogo
