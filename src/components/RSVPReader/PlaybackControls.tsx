import { useRsvpStore } from '../../store/rsvp-store'

const WPM_PRESETS = [200, 300, 500] as const

export function PlaybackControls() {
  const wpm = useRsvpStore((s) => s.wpm)
  const isPlaying = useRsvpStore((s) => s.isPlaying)
  const currentWordIndex = useRsvpStore((s) => s.currentWordIndex)
  const jumpSize = useRsvpStore((s) => s.jumpSize)
  const wordList = useRsvpStore((s) => s.wordList)
  const setWpm = useRsvpStore((s) => s.setWpm)
  const setIsPlaying = useRsvpStore((s) => s.setIsPlaying)
  const setCurrentWordIndex = useRsvpStore((s) => s.setCurrentWordIndex)
  const setJumpSize = useRsvpStore((s) => s.setJumpSize)

  // Clamp jump to word list bounds
  function jumpBack() {
    setCurrentWordIndex(Math.max(0, currentWordIndex - jumpSize))
  }
  function jumpForward() {
    setCurrentWordIndex(Math.min(wordList.length - 1, currentWordIndex + jumpSize))
  }
  function togglePlay() {
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      {/* Jump back + jump-size stepper + play/pause + jump forward */}
      <div className="flex items-center gap-2">
        <button onClick={jumpBack} aria-label="Jump back">«</button>
        {/* Jump-size stepper: [-] [N] [+] */}
        <div className="flex items-center gap-1">
          <button onClick={() => setJumpSize(Math.max(1, jumpSize - 5))} aria-label="Decrease jump size">-</button>
          <span className="text-sm text-gray-400 w-6 text-center tabular-nums">{jumpSize}</span>
          <button onClick={() => setJumpSize(Math.min(50, jumpSize + 5))} aria-label="Increase jump size">+</button>
        </div>
        <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={jumpForward} aria-label="Jump forward">»</button>
      </div>

      {/* WPM slider */}
      <input
        type="range"
        min={50}
        max={1000}
        step={25}
        value={wpm}
        onChange={(e) => setWpm(Number(e.target.value))}
        className="flex-1 min-w-24 h-1.5 rounded-full appearance-none bg-gray-600
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          cursor-pointer"
        aria-label="WPM slider"
      />

      {/* Preset buttons */}
      <div className="flex items-center gap-1">
        {WPM_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setWpm(preset)}
            className={`px-2 py-1 text-xs rounded-md ${
              wpm === preset
                ? 'bg-white text-gray-900'
                : 'text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500'
            }`}
            aria-label={`Set ${preset} WPM`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Current WPM display */}
      <span className="text-sm text-gray-300 tabular-nums w-12 text-right" aria-live="polite">
        {wpm}
      </span>
    </div>
  )
}
