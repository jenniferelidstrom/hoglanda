// Push-notiser: hjälpfunktioner för att fråga om lov, prenumerera och spara
// prenumerationen i Supabase (tabellen push_subscriptions).
import { supabase } from './supabase.js'

// Publik VAPID-nyckel – säker att ligga i appen. Den hemliga motsvarigheten
// ligger enbart som secret i Supabase (skickar-funktionen).
const VAPID_PUBLIC_KEY = 'BD6IejIQHsc8hUTccIXh6C-dCinE2l5pyJBepfhIo__3mc9mkFOQYgMFmVCObnKVx8UkMERJnUL2j19UZ9HzWoo'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Stöds push av den här enheten/webbläsaren?
// OBS: På iPhone finns PushManager bara när appen körs från hemskärmen (PWA),
// inte i vanliga Safari-fliken.
export function pushSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

// Körs appen som installerad PWA (hemskärm)?
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

// Nuvarande läge: 'unsupported' | 'denied' | 'on' | 'off'
export async function getPushState() {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

// Fråga om lov, prenumerera och spara i Supabase.
export async function enablePush(userId) {
  if (!pushSupported()) throw new Error('unsupported')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('denied')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  const j = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
  }, { onConflict: 'endpoint' })
  if (error) throw error
  return true
}

// Avprenumerera och ta bort ur Supabase.
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
  } catch { /* ignorera */ }
}
