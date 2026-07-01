import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

interface LeaderNameProps {
  id: string
  name: string
  imageUrl?: string | null
  className?: string
}

const PREVIEW_WIDTH = 200
const GAP = 8

interface PreviewPos {
  left: number
  top: number
  placement: 'above' | 'below'
}

/**
 * A leader name rendered as a link to the leader's detail page. When an image
 * is available it shows a floating card preview on hover/focus. The preview is
 * rendered through a portal into document.body so that ancestor containers with
 * overflow-hidden (the stats tables) cannot clip it. If the image is missing or
 * fails to load, it falls back to a plain link with no preview.
 */
export function LeaderName({ id, name, imageUrl, className }: LeaderNameProps) {
  const [pos, setPos] = useState<PreviewPos | null>(null)
  const [failed, setFailed] = useState(false)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const canPreview = Boolean(imageUrl) && !failed

  const open = () => {
    if (!canPreview || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    // Prefer showing above the name; if there isn't room, show below instead.
    const placement: 'above' | 'below' = rect.top < 220 ? 'below' : 'above'
    const top = placement === 'above' ? rect.top - GAP : rect.bottom + GAP
    // Clamp left so the preview never runs off the right edge of the viewport.
    const maxLeft = window.innerWidth - PREVIEW_WIDTH - GAP
    const left = Math.max(GAP, Math.min(rect.left, maxLeft))
    setPos({ left, top, placement })
  }

  const close = () => setPos(null)

  return (
    <span
      ref={anchorRef}
      className="relative inline-block"
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      <Link className={className ?? 'text-amber-700 hover:underline'} to={`/leaders/${id}`}>
        {name}
      </Link>
      {canPreview && pos &&
        createPortal(
          <img
            src={imageUrl ?? undefined}
            alt={name}
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              width: PREVIEW_WIDTH,
              height: 'auto',
              transform: pos.placement === 'above' ? 'translateY(-100%)' : undefined,
            }}
            className="pointer-events-none z-50 h-auto rounded-lg border border-gray-200 object-contain shadow-xl dark:border-gray-700"
            onError={() => setFailed(true)}
          />,
          document.body,
        )}
    </span>
  )
}
