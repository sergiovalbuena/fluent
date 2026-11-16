'use client'

// Records the microphone as 16 kHz mono 16-bit WAV, the format Azure's short-audio
// recognition takes directly. MediaRecorder would give webm/mp4 (Safari), which
// Azure's REST endpoint doesn't accept, so the samples are captured with the Web
// Audio API and encoded here.
//
// Opening the mic takes a moment (permission, audio context), and a short word said
// right after the tap was lost. So the mic stays open while practicing (shared, and
// closed a few seconds after the last user lets go), keeps the last PREROLL seconds
// at all times, and each recording starts with them. Stopping waits a little so the
// end of the word isn't cut off either.

const TARGET_RATE = 16000
/** Audio kept from before the tap, in seconds */
const PREROLL = 0.6
/** Extra audio captured after the stop tap, in milliseconds */
const TAIL_MS = 350
/** How long the mic stays open after the last user releases it */
const IDLE_CLOSE_MS = 4000

type Mic = {
  stream: MediaStream
  ctx: AudioContext
  source: MediaStreamAudioSourceNode
  processor: ScriptProcessorNode
  rate: number
  /** Last PREROLL seconds, always filled */
  ring: Float32Array[]
  ringLength: number
  /** Chunks of the recording in progress (null when not recording) */
  take: Float32Array[] | null
  /** Resolves once audio is flowing (the first buffer arrived) */
  live: Promise<void>
}

let mic: Mic | null = null
let opening: Promise<Mic> | null = null
let users = 0
let closeTimer: ReturnType<typeof setTimeout> | null = null

async function openMic(): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  })
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  // iOS starts contexts suspended
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
  const source = ctx.createMediaStreamSource(stream)
  // ScriptProcessor is deprecated but works everywhere without a separate worklet file
  const processor = ctx.createScriptProcessor(2048, 1, 1)
  let markLive: () => void = () => {}
  const m: Mic = {
    stream, ctx, source, processor, rate: ctx.sampleRate,
    ring: [], ringLength: 0, take: null,
    live: new Promise<void>(resolve => { markLive = resolve }),
  }
  const maxRing = Math.ceil(PREROLL * ctx.sampleRate)
  processor.onaudioprocess = e => {
    markLive()
    const chunk = new Float32Array(e.inputBuffer.getChannelData(0))
    if (m.take) m.take.push(chunk)
    m.ring.push(chunk)
    m.ringLength += chunk.length
    while (m.ring.length > 1 && m.ringLength - m.ring[0].length >= maxRing) {
      m.ringLength -= m.ring.shift()!.length
    }
  }
  source.connect(processor)
  processor.connect(ctx.destination)
  return m
}

function closeMic() {
  if (!mic) return
  mic.processor.disconnect()
  mic.source.disconnect()
  mic.stream.getTracks().forEach(t => t.stop())
  void mic.ctx.close()
  mic = null
}

/**
 * Opens the mic (or reuses the open one) and resolves once audio is flowing.
 * Must first be called from a tap (iOS). Call releaseMic() when done.
 */
export async function acquireMic(): Promise<void> {
  users++
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  try {
    if (!mic) {
      opening ??= openMic().finally(() => { opening = null })
      mic = await opening
    }
    await mic.live
  } catch (err) {
    users = Math.max(0, users - 1)
    throw err
  }
}

/** Lets go of the mic; it closes a few seconds later unless someone acquires it again */
export function releaseMic() {
  users = Math.max(0, users - 1)
  if (users > 0 || closeTimer) return
  closeTimer = setTimeout(() => { closeTimer = null; if (users === 0) closeMic() }, IDLE_CLOSE_MS)
}

export type WavRecorder = {
  /** Stops recording and returns the WAV (null if nothing was captured) */
  stop: () => Promise<Blob | null>
  /** Stops without keeping anything */
  cancel: () => void
}

/** Starts a recording on the acquired mic, beginning with the last PREROLL seconds */
export function startRecording(maxSeconds: number, onAutoStop: () => void): WavRecorder {
  if (!mic) throw new Error('Microphone not acquired')
  const m: Mic = mic
  m.take = [...m.ring]
  let done = false
  const timer = setTimeout(() => { if (!done) onAutoStop() }, maxSeconds * 1000)

  function finish(): Float32Array[] {
    done = true
    clearTimeout(timer)
    const chunks = m.take ?? []
    m.take = null
    return chunks
  }

  return {
    async stop() {
      if (done) return null
      // Keep listening a moment: the end of a short word arrives after the tap
      await new Promise(r => setTimeout(r, TAIL_MS))
      const chunks = finish()
      const length = chunks.reduce((n, c) => n + c.length, 0)
      if (length === 0) return null
      const samples = new Float32Array(length)
      let offset = 0
      for (const c of chunks) { samples.set(c, offset); offset += c.length }
      return encodeWav(downsample(samples, m.rate, TARGET_RATE), TARGET_RATE)
    },
    cancel() { if (!done) finish() },
  }
}

function downsample(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return samples
  const ratio = from / to
  const out = new Float32Array(Math.floor(samples.length / ratio))
  for (let i = 0; i < out.length; i++) {
    // Average the source samples that fall in this output sample (a simple low-pass)
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), samples.length)
    let sum = 0
    for (let j = start; j < end; j++) sum += samples[j]
    out[i] = sum / Math.max(1, end - start)
  }
  return out
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i)) }
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE')
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}
