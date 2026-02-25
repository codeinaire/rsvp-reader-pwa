import { useRef, useLayoutEffect } from 'react'
import { useRsvpStore } from '../../store/rsvp-store'
import { computeOrp } from '../../lib/orp'

interface ORPDisplayProps {
  word: string
}

export function ORPDisplay({ word }: ORPDisplayProps) {
  const { left, focal, right } = computeOrp(word)
  const rsvpFontSize = useRsvpStore((s) => s.rsvpFontSize)
  const maxRsvpFontSize = useRsvpStore((s) => s.maxRsvpFontSize)
  const setMaxRsvpFontSize = useRsvpStore((s) => s.setMaxRsvpFontSize)
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const w = el.offsetWidth
      if (w <= 0) return
      // Grid is 8ch + 1ch + 11ch = 20ch total; 1ch ≈ 0.6em → max = w / (20 * 0.6) = w / 12
      setMaxRsvpFontSize(Math.floor(w / 12))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [setMaxRsvpFontSize])

  const effectiveFontSize = Math.min(rsvpFontSize, maxRsvpFontSize)

  return (
    <div ref={containerRef} className="font-mono flex items-center justify-center w-full">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '8ch 1ch 11ch',
          fontSize: effectiveFontSize,
          lineHeight: 1,
        }}
        className="font-mono items-center"
      >
        <span className="text-right text-white select-none">{left}</span>
        <span className="text-red-500 select-none">{focal}</span>
        <span className="text-left text-white select-none">{right}</span>
      </div>
    </div>
  )
}
