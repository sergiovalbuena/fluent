'use client'

// Records the microphone as 16 kHz mono 16-bit WAV, the format Azure's short-audio
// recognition takes directly. MediaRecorder would give webm/mp4 (Safari), which
// Azure's REST endpoint doesn't accept, so the samples are captured with the Web
// Audio API and encoded here.

const TARGET_RATE = 16000

export type WavRecorder = {
  /** Stops recording and returns the WAV (null if nothing was captured) */
  stop: () => Promise<Blob | null>
  /** Stops without keeping anything */
  cancel: () => void
}

/** Asks for the microphone and starts recording. Must be called from a tap (iOS). */
export async function startWavRecorder(maxSeconds: number, onAutoStop: () => void): Promise<WavRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  })
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  const source = ctx.createMediaStreamSource(stream)
  // ScriptProcessor is deprecated but works everywhere without a separate worklet file
  const processor = ctx.createScriptProcessor(4096, 1, 1)
  const chunks: Float32Array[] = []
  processor.onaudioprocess = e => { chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))) }
  source.connect(processor)
  processor.connect(ctx.destination)

  let done = false
  const timer = setTimeout(() => { if (!done) onAutoStop() }, maxSeconds * 1000)

  function release() {
    done = true
    clearTimeout(timer)
    processor.disconnect()
    source.disconnect()
    stream.getTracks().forEach(t => t.stop())
    void ctx.close()
  }

  return {
    async stop() {
      if (done) return null
      const rate = ctx.sampleRate
      release()
      const length = chunks.reduce((n, c) => n + c.length, 0)
      if (length === 0) return null
      const samples = new Float32Array(length)
      let offset = 0
      for (const c of chunks) { samples.set(c, offset); offset += c.length }
      return encodeWav(downsample(samples, rate, TARGET_RATE), TARGET_RATE)
    },
    cancel() { if (!done) release() },
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
