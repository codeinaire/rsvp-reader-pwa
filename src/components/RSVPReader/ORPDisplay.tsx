import { useRsvpStore } from '../../store/rsvp-store'
import { computeOrp } from '../../lib/orp'

interface ORPDisplayProps {
  word: string
}

export function ORPDisplay({ word }: ORPDisplayProps) {
  const { left, focal, right } = computeOrp(word)
  const rsvpFontSize = useRsvpStore((s) => s.rsvpFontSize)

  return (
    <div
      className="font-mono flex items-center justify-center"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'min(14ch, 38vw) 1ch min(20ch, 50vw)',
          fontSize: `clamp(18px, 5vw, ${rsvpFontSize}px)`,
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
