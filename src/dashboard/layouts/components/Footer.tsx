import React from 'react'
import { appName, author, basePath, currentYear } from '@/helpers'

const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="app-footer-content flex-grow-1">
        {appName} &copy; {currentYear}.
        <span className="hidden-mobile"> All rights reserved, </span>
        <span className="fw-bold">{author}.</span>
        <a href="#top" className="ms-auto hidden-mobile" aria-label="Back to top">
          <svg className="sa-icon sa-thick sa-icon-primary">
            <use href={`${basePath}/icons/sprite.svg#arrow-up`}></use>
          </svg>
        </a>
      </div>
    </footer>
  )
}

export default Footer
