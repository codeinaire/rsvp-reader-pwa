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

  // Actions — Phase 1
  setDocument: (words: string[], title: string | null) => void
  setWorkerReady: (ready: boolean) => void

  // Actions — Phase 2 playback
  setCurrentWordIndex: (index: number) => void
  setIsPlaying: (playing: boolean) => void
  setJumpSize: (size: number) => void
  setWpm: (wpm: number) => void

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

      // Actions — Phase 1
      setDocument: (words, title) =>
        set({ wordList: words, documentTitle: title }),

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

      // Reset — resets ALL fields except wpm (wpm persists via middleware)
      reset: () => set(ephemeralDefaults),
    }),
    {
      name: 'rsvp-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ wpm: state.wpm }),
    }
  )
)
