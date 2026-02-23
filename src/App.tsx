import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'

// ── Placeholder screens ────────────────────────────────────────────────────────
// These stubs make the phase end-to-end testable.
// Plan 04 replaces them with full component files.

function TextPreviewPlaceholder() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
        Text Preview
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        (Placeholder — replaced in Plan 04)
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Back
        </button>
        <button
          onClick={() => navigate('/read')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Start Reading
        </button>
      </div>
    </div>
  )
}

function RSVPPlaceholder() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
        RSVP Reader
      </h1>
      <p className="text-sm text-gray-500 mb-2">
        (Placeholder — RSVP engine built in Phase 2)
      </p>
      <button
        onClick={() => navigate('/')}
        className="mt-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        Back to Home
      </button>
    </div>
  )
}

// ── Entry screen import (Plan 04 creates the real component) ──────────────────
// Lazy-import so this compiles before EntryScreen.tsx exists.
// Replace with: import EntryScreen from './components/EntryScreen/EntryScreen'
// once Plan 04 is complete.
function EntryScreenPlaceholder() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        RSVP Reader
      </h1>
      <p className="text-sm text-gray-500">Import entry screen (built in Plan 04)</p>
    </div>
  )
}

// ── App shell ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/*
          Route: Entry screen
          EntryScreenPlaceholder is swapped for real EntryScreen in Plan 04.
          The entry screen is NOT destroyed on navigation — React Router's default
          unmount/remount behavior is fine here; Phase 1 has no persisted state to lose.
        */}
        <Route path="/" element={<EntryScreenPlaceholder />} />

        {/*
          Route: Text preview
          Shows extracted text + word count before RSVP starts.
        */}
        <Route path="/preview" element={<TextPreviewPlaceholder />} />

        {/*
          Route: RSVP reader (placeholder for Phase 1)
          Phase 2 replaces this with the real RSVP engine.
        */}
        <Route path="/read" element={<RSVPPlaceholder />} />
      </Routes>
    </BrowserRouter>
  )
}
