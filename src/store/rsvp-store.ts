import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Phase 1 + Phase 2 store — document pipeline and RSVP playback state.
 * Phase 3 will add UI state from view components.
 *
 * Persist strategy:
 *   - wpm (settings) → persisted to localStorage key 'rsvp-settings' via partialize
 *   - all other fields → ephemeral, reset to defaults on page refresh
 */
export interface RsvpStore {
  // Document state (Phase 1 — unchanged)
  wordList: string[]
  documentTitle: string | null
  isWorkerReady: boolean

  // Playback state (Phase 2 — ephemeral, not persisted)
  currentWordIndex: number
  isPlaying: boolean
  jumpSize: number // default: 10 words per jump press

  // Settings (Phase 2 — persisted to localStorage)
  wpm: number // default: 250

  // Settings (Phase 3 — persisted to localStorage)
  rsvpFontSize: number  // RSVP word font size in px; default 32
  textFontSize: number  // Full text panel font size in px; default 16 (text-base equivalent)

  // Derived display state (Phase 3 — NOT persisted; set by ORPDisplay's ResizeObserver)
  maxRsvpFontSize: number  // max font that fits in the current container; default 120

  // Actions — Phase 1
  setDocument: (words: string[], title: string | null) => void
  setWorkerReady: (ready: boolean) => void

  // Actions — Phase 2 playback
  setCurrentWordIndex: (index: number) => void
  setIsPlaying: (playing: boolean) => void
  setJumpSize: (size: number) => void
  setWpm: (wpm: number) => void

  // Actions — Phase 3 font size
  setRsvpFontSize: (size: number) => void
  setTextFontSize: (size: number) => void
  setMaxRsvpFontSize: (max: number) => void

  // Reset — resets document AND playback state (not wpm — that's persisted separately)
  reset: () => void
}

const ephemeralDefaults = {
  wordList: [] as string[],
  documentTitle: null as string | null,
  isWorkerReady: false,
  currentWordIndex: 0,
  isPlaying: false,
  jumpSize: 10,
}

export const useRsvpStore = create<RsvpStore>()(
  persist(
    (set) => ({
      // Document state (Phase 1)
      wordList: [],
      documentTitle: null,
      isWorkerReady: false,

      // Playback state (Phase 2 — ephemeral)
      currentWordIndex: 0,
      isPlaying: false,
      jumpSize: 10,

      // Settings (Phase 2 — persisted)
      wpm: 250,

      // Settings (Phase 3 — persisted)
      rsvpFontSize: 32,
      textFontSize: 16,

      // Derived display state (Phase 3 — ephemeral)
      maxRsvpFontSize: 120,

      // Actions — Phase 1
      setDocument: (words, title) =>
        set({ wordList: words, documentTitle: title, currentWordIndex: 0, isPlaying: false }),

      setWorkerReady: (ready) =>
        set({ isWorkerReady: ready }),

      // Actions — Phase 2 playback
      setCurrentWordIndex: (index) =>
        set({ currentWordIndex: index }),

      setIsPlaying: (playing) =>
        set({ isPlaying: playing }),

      setJumpSize: (size) =>
        set({ jumpSize: size }),

      setWpm: (wpm) =>
        set({ wpm }),

      // Actions — Phase 3 font size (clamped on write)
      setRsvpFontSize: (size) => set({ rsvpFontSize: Math.max(16, Math.min(120, size)) }),
      setTextFontSize: (size) => set({ textFontSize: Math.max(12, Math.min(32, size)) }),
      setMaxRsvpFontSize: (max) => set({ maxRsvpFontSize: max }),

      // Reset — resets ALL fields except wpm (wpm persists via middleware)
      reset: () => set(ephemeralDefaults),
    }),
    {
      name: 'rsvp-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        wpm: state.wpm,
        rsvpFontSize: state.rsvpFontSize,
        textFontSize: state.textFontSize,
      }),
    }
  )
)
