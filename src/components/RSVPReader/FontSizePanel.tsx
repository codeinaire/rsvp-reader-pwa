import { useRsvpStore } from '../../store/rsvp-store'

/**
 * FontSizePanel — independent +/- controls for RSVP word display and full text panel font sizes.
 * Reads and writes to Zustand store (rsvpFontSize, textFontSize) — persisted to localStorage.
 *
 * Step sizes: RSVP word = 8px steps (48–120px), full text = 4px steps (12–32px).
 * Clamping is enforced in the store actions (setRsvpFontSize, setTextFontSize).
 */
export function FontSizePanel() {
  const rsvpFontSize = useRsvpStore((s) => s.rsvpFontSize)
  const maxRsvpFontSize = useRsvpStore((s) => s.maxRsvpFontSize)
  const textFontSize = useRsvpStore((s) => s.textFontSize)
  const setRsvpFontSize = useRsvpStore((s) => s.setRsvpFontSize)
  const setTextFontSize = useRsvpStore((s) => s.setTextFontSize)

  // Operate from the effective displayed size so +/- always produce visible changes
  const effectiveRsvpSize = Math.min(rsvpFontSize, maxRsvpFontSize)
  const atRsvpMax = effectiveRsvpSize >= maxRsvpFontSize

  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700 min-w-[180px]">
      {/* RSVP word font size */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-gray-400 whitespace-nowrap">RSVP word</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setRsvpFontSize(effectiveRsvpSize - 4)}
            aria-label="Decrease RSVP word font size"
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md transition-colors text-base leading-none"
          >
            −
          </button>
          <span className="text-sm text-gray-300 tabular-nums w-10 text-center">
            {effectiveRsvpSize}px
          </span>
          <button
            onClick={() => setRsvpFontSize(effectiveRsvpSize + 4)}
            disabled={atRsvpMax}
            aria-label="Increase RSVP word font size"
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md transition-colors text-base leading-none disabled:opacity-30 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>

      {/* Full text font size */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-gray-400 whitespace-nowrap">Full text</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTextFontSize(textFontSize - 4)}
            aria-label="Decrease full text font size"
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md transition-colors text-base leading-none"
          >
            −
          </button>
          <span className="text-sm text-gray-300 tabular-nums w-10 text-center">
            {textFontSize}px
          </span>
          <button
            onClick={() => setTextFontSize(textFontSize + 4)}
            aria-label="Increase full text font size"
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md transition-colors text-base leading-none"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
