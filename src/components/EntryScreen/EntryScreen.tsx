import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentService } from '../../services/document-service'
import { useRsvpStore } from '../../store/rsvp-store'

export default function EntryScreen() {
  const navigate = useNavigate()
  const setDocument = useRsvpStore((s) => s.setDocument)
  const isWorkerReady = useRsvpStore((s) => s.isWorkerReady)
  const setWorkerReady = useRsvpStore((s) => s.setWorkerReady)

  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPatience, setShowPatience] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')

  // AbortController-style cancel signal for in-progress parses
  const cancelRef = useRef(false)
  const patienceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Signal worker readiness to store — enables import button
  useEffect(() => {
    documentService.ensureReady().then(() => {
      setWorkerReady(true)
    })
  }, [setWorkerReady])

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (patienceTimerRef.current) clearTimeout(patienceTimerRef.current)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [])

  function showError(message: string) {
    setError(message)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    // Auto-dismiss after 4 seconds (user decision: "a few seconds")
    errorTimerRef.current = setTimeout(() => setError(null), 4000)
  }

  async function handleFile(file: File) {
    if (!isWorkerReady || isProcessing) return

    cancelRef.current = false
    setIsProcessing(true)
    setError(null)

    // Patience message appears after 3 seconds (user decision)
    patienceTimerRef.current = setTimeout(() => {
      if (!cancelRef.current) setShowPatience(true)
    }, 3000)

    try {
      const result = await documentService.parseFile(file)

      if (cancelRef.current) return // User cancelled mid-parse

      // Guard: very few words = likely scanned/image PDF (also checked in Rust)
      if (result.words.length < 10) {
        throw new Error(
          "No readable text found. This PDF may be scanned or image-based. " +
          "Try a different PDF or paste the text instead."
        )
      }

      setDocument(result.words, result.title)
      navigate('/preview')
    } catch (e) {
      if (cancelRef.current) return
      const msg = e instanceof Error ? e.message : 'Could not read file. Please try again.'
      showError(msg)
    } finally {
      setIsProcessing(false)
      setShowPatience(false)
      if (patienceTimerRef.current) clearTimeout(patienceTimerRef.current)
    }
  }

  function handleCancel() {
    cancelRef.current = true
    setIsProcessing(false)
    setShowPatience(false)
    if (patienceTimerRef.current) clearTimeout(patienceTimerRef.current)
  }

  function handlePasteSubmit() {
    const trimmed = pasteText.trim()
    if (!trimmed) return
    const result = documentService.parseText(trimmed)
    if (result.words.length === 0) {
      showError('No readable text found in the pasted content.')
      return
    }
    setDocument(result.words, null)
    navigate('/preview')
  }

  // Drag and drop handlers
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [isWorkerReady, isProcessing]) // eslint-disable-line react-hooks/exhaustive-deps

  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = '' // Reset so same file can be re-selected
  }, [isWorkerReady, isProcessing]) // eslint-disable-line react-hooks/exhaustive-deps

  const canImport = isWorkerReady && !isProcessing

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
          RSVP Reader
        </h1>
        {/* Settings icon placeholder — Phase 3 will wire this up */}
        <button
          aria-label="Settings"
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </header>

      {/* Main import area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">

        {/* Drop zone — PRIMARY CTA */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={[
            'relative w-full max-w-md rounded-2xl border-2 border-dashed transition-colors duration-150',
            isDragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900',
            isProcessing ? 'pointer-events-none' : '',
          ].join(' ')}
        >
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
            {isProcessing ? (
              <>
                {/* Spinner during PDF processing */}
                <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                {showPatience && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Large file, this may take a moment...
                  </p>
                )}
                <button
                  onClick={handleCancel}
                  className="mt-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-10 h-10 text-gray-300 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div>
                  <p className="text-base font-medium text-gray-700 dark:text-gray-200">
                    Drop a PDF here
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    or use the button below to pick a file
                  </p>
                </div>
                <label
                  className={[
                    'inline-block px-5 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-colors',
                    canImport
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed',
                  ].join(' ')}
                >
                  {/* WASM init is silent — button just says "Choose PDF" */}
                  Choose PDF
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    disabled={!canImport}
                    onChange={onFileInputChange}
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Error message — actionable, auto-dismisses */}
        {error && (
          <div className="w-full max-w-md px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Paste text — SECONDARY import path */}
        <details className="w-full max-w-md">
          <summary className="text-sm text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 select-none">
            Or paste text
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your text here..."
              rows={6}
              className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="self-end px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Read text
            </button>
          </div>
        </details>
      </main>
    </div>
  )
}
