let audioContext

const SOUND_SETTING_KEY = 'kds_sound_enabled'

function getAudioContext() {
  if (audioContext) return audioContext

  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null

  audioContext = new AudioContext()
  return audioContext
}

function isEnabled() {
  return window.localStorage.getItem(SOUND_SETTING_KEY) === 'true'
}

function playNote(context, { frequency, start, duration, volume, type = 'sine' }) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.03)
}

export function setOrderSoundEnabled(enabled) {
  window.localStorage.setItem(SOUND_SETTING_KEY, enabled ? 'true' : 'false')
}

export async function primeOrderSound() {
  const context = getAudioContext()
  if (!context) return false

  if (context.state === 'suspended') await context.resume()
  return context.state === 'running'
}

// A warm, ascending three-note chime for incoming tickets. It is synthesized
// locally, so the project needs no audio asset or extra package.
export function playNewOrderChime({ preview = false } = {}) {
  if (!isEnabled()) return

  const context = getAudioContext()
  if (!context || context.state !== 'running') return

  const now = context.currentTime + 0.02
  const volume = preview ? 0.035 : 0.075
  const notes = [
    { frequency: 523.25, start: now, duration: 0.16, volume, type: 'sine' },
    { frequency: 659.25, start: now + 0.15, duration: 0.18, volume: volume * 0.92, type: 'triangle' },
    { frequency: 783.99, start: now + 0.32, duration: 0.32, volume: volume * 1.05, type: 'sine' },
  ]

  notes.forEach((note) => playNote(context, note))
}

export function playKitchenStatusTone(type) {
  if (!isEnabled()) return

  const context = getAudioContext()
  if (!context || context.state !== 'running') return

  const now = context.currentTime + 0.02
  const isSuccess = type === 'success'
  playNote(context, {
    frequency: isSuccess ? 880 : 587.33,
    start: now,
    duration: isSuccess ? 0.42 : 0.25,
    volume: 0.055,
    type: isSuccess ? 'triangle' : 'sine',
  })
}