import { create } from 'zustand'

/**
 * Phase 1 store — minimal shape for document pipeline.
 * Phase 2 will add currentWordIndex, wpm, isPlaying.
 * Phase 3 will add imports from View components.
 */
interface RsvpStore {
  // Document state
  wordList: string[]
  documentTitle: string | null

  // Worker readiness — import button disabled until true
  isWorkerReady: boolean

  // Actions
  setDocument: (words: string[], title: string | null) => void
  setWorkerReady: (ready: boolean) => void
  reset: () => void
}

const initialState = {
  wordList: [],
  documentTitle: null,
  isWorkerReady: false,
}

export const useRsvpStore = create<RsvpStore>((set) => ({
  ...initialState,

  setDocument: (words, title) =>
    set({ wordList: words, documentTitle: title }),

  setWorkerReady: (ready) =>
    set({ isWorkerReady: ready }),

  reset: () => set(initialState),
}))
