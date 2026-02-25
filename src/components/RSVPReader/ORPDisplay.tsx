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
          gridTemplateColumns: '14ch 1ch 20ch',
          fontSize: rsvpFontSize,
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
