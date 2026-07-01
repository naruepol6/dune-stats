import { useState } from 'react'
import { Link } from 'react-router-dom'

interface LeaderNameProps {
  id: string
  name: string
  imageUrl?: string | null
  className?: string
}

/**
 * A leader name rendered as a link to the leader's detail page. When an image
 * is available it shows a floating card preview on hover/focus. If the image is
 * missing or fails to load, it falls back to a plain link with no preview.
 */
export function LeaderName({ id, name, imageUrl, className }: LeaderNameProps) {
  const [show, setShow] = useState(false)
  const [failed, setFailed] = useState(false)
  const canPreview = Boolean(imageUrl) && !failed

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <Link className={className ?? 'text-amber-700 hover:underline'} to={`/leaders/${id}`}>
        {name}
      </Link>
      {canPreview && show && (
        <img
          src={imageUrl ?? undefined}
          alt={name}
          className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-[180px] rounded-lg shadow-xl"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
