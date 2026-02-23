import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EntryScreen from './components/EntryScreen/EntryScreen'
import TextPreview from './components/TextPreview/TextPreview'
import RSVPPlaceholder from './components/RSVPPlaceholder/RSVPPlaceholder'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/*
          Route: Entry screen
          Not destroyed on navigation — React Router keeps it mounted
          while the user is on /preview or /read (BrowserRouter default behavior).
        */}
        <Route path="/" element={<EntryScreen />} />

        {/*
          Route: Text preview — extracted text quality check + word count
        */}
        <Route path="/preview" element={<TextPreview />} />

        {/*
          Route: RSVP reader — placeholder for Phase 1, real engine in Phase 2
        */}
        <Route path="/read" element={<RSVPPlaceholder />} />
      </Routes>
    </BrowserRouter>
  )
}
