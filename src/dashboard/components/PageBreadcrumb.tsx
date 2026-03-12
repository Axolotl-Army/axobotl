type PageBreadcrumbProps = {
  title: string
  subTitle1: string
  subTitle2?: string
  subText?: string
}

const PageBreadcrumb = ({ subTitle1, subTitle2, title, subText }: PageBreadcrumbProps) => {
  return (
    <div>
      <h1 className="subheader-title mb-2">{title}</h1>
      <nav className="app-breadcrumb" aria-label="breadcrumb">
        <ol className="breadcrumb ms-0 text-muted mb-0">
          <li className="breadcrumb-item">{subTitle1}</li>
          {subTitle2 && <li className="breadcrumb-item">{subTitle2}</li>}
          <li className="breadcrumb-item active" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>
      {subText && <h6 className="mt-3 mb-4 fst-italic">{subText}</h6>}
    </div>
  )
}

export default PageBreadcrumb
