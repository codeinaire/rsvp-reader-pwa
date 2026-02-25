import { useState } from 'react'
import { useRsvpStore } from '../../store/rsvp-store'
import { FontSizePanel } from './FontSizePanel'

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

  const [showFontPanel, setShowFontPanel] = useState(false)

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
        <button onClick={jumpBack} aria-label="Jump back"
          className="px-2 py-1 text-gray-300 hover:text-white rounded-md border border-gray-700 hover:border-gray-500 transition-colors">«</button>
        {/* Jump-size stepper: [-] [N] [+] */}
        <div className="flex items-center gap-1">
          <button onClick={() => setJumpSize(Math.max(1, jumpSize - 5))} aria-label="Decrease jump size"
            className="px-2 py-1 text-gray-300 hover:text-white rounded-md border border-gray-700 hover:border-gray-500 transition-colors">-</button>
          <span className="text-sm text-gray-400 w-6 text-center tabular-nums">{jumpSize}</span>
          <button onClick={() => setJumpSize(Math.min(50, jumpSize + 5))} aria-label="Increase jump size"
            className="px-2 py-1 text-gray-300 hover:text-white rounded-md border border-gray-700 hover:border-gray-500 transition-colors">+</button>
        </div>
        <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}
          className="px-3 py-1 text-gray-300 hover:text-white rounded-md border border-gray-700 hover:border-gray-500 transition-colors">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={jumpForward} aria-label="Jump forward"
          className="px-2 py-1 text-gray-300 hover:text-white rounded-md border border-gray-700 hover:border-gray-500 transition-colors">»</button>
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

      {/* Font size settings toggle */}
      <div className="relative">
        <button
          onClick={() => setShowFontPanel(!showFontPanel)}
          aria-label="Font size settings"
          aria-expanded={showFontPanel}
          className={`p-1.5 rounded-md border transition-colors ${
            showFontPanel
              ? 'text-white border-gray-500 bg-gray-700'
              : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {showFontPanel && (
          <div className="absolute bottom-full right-0 mb-2 z-20">
            <FontSizePanel />
          </div>
        )}
      </div>
    </div>
  )
}
