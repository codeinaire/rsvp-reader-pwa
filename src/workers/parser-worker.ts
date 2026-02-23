// TypeScript declaration to avoid Window.postMessage type conflict in Worker context
declare function postMessage(message: unknown, transfer?: Transferable[]): void

import init, { parse_pdf } from '../../rsvp-parser/crates/rsvp-parser/pkg/rsvp_parser.js'
import { ParseMessageType } from './worker-types'
import type { WorkerResponse, ParseRequest } from './worker-types'

async function initialize(): Promise<void> {
  const start = performance.now()
  try {
    await init()
    const initMs = Math.round(performance.now() - start)
    const response: WorkerResponse = {
      type: ParseMessageType.Init,
      success: true,
      initMs,
    }
    postMessage(response)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    const response: WorkerResponse = {
      type: ParseMessageType.Init,
      success: false,
      error,
    }
    postMessage(response)
  }
}

onmessage = (event: MessageEvent<ParseRequest>) => {
  const req = event.data
  const start = performance.now()
  try {
    let result: { words: string[]; title: string | null }

    if (req.format === 'pdf') {
      // parse_pdf is the #[wasm_bindgen] export from rsvp-parser lib.rs
      // It returns a JsValue (deserialized to ParseResult shape) or throws JsError
      result = parse_pdf(req.data) as { words: string[]; title: string | null }
    } else {
      // txt format should not reach the Worker (DocumentService handles it on main thread)
      throw new Error(`Unexpected format in Worker: ${req.format}`)
    }

    const parseMs = Math.round(performance.now() - start)
    const response: WorkerResponse = {
      type: ParseMessageType.ParseDocument,
      id: req.id,
      success: true,
      words: result.words,
      title: result.title,
      parseMs,
    }
    postMessage(response)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    const response: WorkerResponse = {
      type: ParseMessageType.Error,
      id: req.id,
      error,
    }
    postMessage(response)
  }
}

// Initialize WASM immediately when Worker is created.
// The Worker posts Init success/failure back to DocumentService.
// DocumentService resolves/rejects its `ready` promise on receipt.
initialize()
