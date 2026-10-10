import { Fragment } from 'react'
import { Link } from '@mui/material'

const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+)/gi
// Punctuation that usually ends a sentence rather than the URL
const TRAILING_RE = /[.,!?;:)\]}'"]+$/

export default function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) => {
        // split() with a capture group puts matches at odd indexes
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
        const trailing = part.match(TRAILING_RE)?.[0] ?? ''
        const url = trailing ? part.slice(0, -trailing.length) : part
        const href = url.startsWith('www.') ? `https://${url}` : url
        return (
          <Fragment key={i}>
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              underline="always"
              sx={{ wordBreak: 'break-all' }}
            >
              {url}
            </Link>
            {trailing}
          </Fragment>
        )
      })}
    </>
  )
}
