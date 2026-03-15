'use client'

import clsx from 'clsx'
import { Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
import { FaChevronLeft, FaChevronRight, FaAnglesLeft, FaAnglesRight } from 'react-icons/fa6'

export type TablePaginationProps = {
  totalItems: number
  start: number
  end: number
  itemsName?: string
  showInfo?: boolean
  previousPage: () => void
  canPreviousPage: boolean
  pageCount: number
  pageIndex: number
  setPageIndex: (index: number) => void
  nextPage: () => void
  canNextPage: boolean
  showPageLimit?: boolean
  pageSize?: number
  onPageSizeChange?: (newSize: number) => void
}

const getPageNumbers = (pageCount: number, pageIndex: number): (number | 'ellipsis')[] => {
  const pages: (number | 'ellipsis')[] = []

  if (pageCount <= 4) {
    for (let i = 0; i < pageCount; i++) pages.push(i)
  } else {
    pages.push(0)
    if (pageIndex > 3) pages.push('ellipsis')
    for (let i = Math.max(1, pageIndex - 1); i <= Math.min(pageCount - 2, pageIndex + 1); i++) {
      pages.push(i)
    }
    if (pageIndex < pageCount - 4) pages.push('ellipsis')
    pages.push(pageCount - 1)
  }

  return pages
}

const TablePagination = ({
  totalItems,
  start,
  end,
  itemsName = 'items',
  showInfo,
  previousPage,
  canPreviousPage,
  pageCount,
  pageIndex,
  setPageIndex,
  nextPage,
  canNextPage,
  pageSize,
  onPageSizeChange,
  showPageLimit,
}: TablePaginationProps) => {
  const pages = getPageNumbers(pageCount, pageIndex)

  return (
    <Row
      className={clsx(
        'align-items-center text-center text-sm-start',
        showInfo ? 'justify-content-between' : 'justify-content-end',
      )}
    >
      {showInfo && (
        <Col
          sm={6}
          className="d-flex align-items-center justify-content-sm-start justify-content-center gap-2 order-1 order-sm-0"
        >
          {showPageLimit && (
            <Dropdown>
              <DropdownToggle
                as="a"
                className="btn btn-sm btn-outline-secondary pe-2 ps-2 py-1 no-arrow"
              >
                {pageSize} <i className="sa sa-chevron-down"></i>
              </DropdownToggle>
              <DropdownMenu>
                {[10, 15, 25, 50, 100].map((size) => (
                  <li key={size} onClick={() => onPageSizeChange?.(size)}>
                    <DropdownItem active={size === pageSize}>{size}</DropdownItem>
                  </li>
                ))}
              </DropdownMenu>
            </Dropdown>
          )}
          <div className="text-muted small">
            Showing {start} to {end} of {totalItems} {itemsName}
          </div>
        </Col>
      )}
      <Col
        xs={12}
        sm={6}
        className="d-flex align-items-center justify-content-sm-end justify-content-center mb-4 mb-sm-0"
      >
        <nav>
          <ul className="pagination pagination-sm mb-0">
            <li className="page-item">
              <button className="page-link" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>
                <FaAnglesLeft size={8} />
              </button>
            </li>
            <li className="page-item">
              <button className="page-link" onClick={previousPage} disabled={!canPreviousPage}>
                <span className="d-none d-sm-none d-md-inline-block">Prev</span>
                <span className="d-inline-block d-sm-inline-block d-md-none">
                  <FaChevronLeft size={8} />
                </span>
              </button>
            </li>
            {pages.map((p, i) =>
              p === 'ellipsis' ? (
                <li key={`ellipsis-${i}`} className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
              ) : (
                <li key={p} className={`page-item ${pageIndex === p ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPageIndex(p)}>
                    {p + 1}
                  </button>
                </li>
              ),
            )}
            <li className="page-item">
              <button className="page-link" onClick={nextPage} disabled={!canNextPage}>
                <span className="d-none d-sm-none d-md-inline-block">Next</span>
                <span className="d-inline-block d-sm-inline-block d-md-none">
                  <FaChevronRight size={8} />
                </span>
              </button>
            </li>
            <li className="page-item">
              <button
                className="page-link"
                onClick={() => setPageIndex(pageCount - 1)}
                disabled={pageIndex === pageCount - 1}
              >
                <FaAnglesRight size={8} />
              </button>
            </li>
          </ul>
        </nav>
      </Col>
    </Row>
  )
}

export default TablePagination
