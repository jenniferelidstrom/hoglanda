import React, { useState } from 'react'
import { supabase } from './supabase.js'

const C = {
  forest: '#2d4a2d', moss: '#4a6741', straw: '#c8a96e',
  cream: '#f7f2e8', parchment: '#ede6d3', bark: '#3d2b1a', muted: '#9a8a6a',
}

function HorseSVG() {
  return (
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 260, height: 'auto' }}>
      {/* Body */}
      <ellipse cx="100" cy="90" rx="52" ry="32" fill="#c8a96e" />
      {/* Neck */}
      <path d="M120 72 Q130 50 125 35 Q118 28 112 32 Q108 48 110 68" fill="#c8a96e" />
      {/* Head */}
      <ellipse cx="122" cy="28" rx="16" ry="12" fill="#c8a96e" transform="rotate(-15 122 28)" />
      {/* Nose */}
      <ellipse cx="133" cy="33" rx="7" ry="5" fill="#b8996e" transform="rotate(-15 133 33)" />
      {/* Nostril */}
      <ellipse cx="135" cy="35" rx="2" ry="1.5" fill="#8b6347" />
      {/* Eye */}
      <circle cx="118" cy="23" r="3" fill="#3d2b1a" />
      <circle cx="119" cy="22" r="1" fill="#fff" />
      {/* Ear */}
      <path d="M112 18 L108 8 L116 14" fill="#c8a96e" stroke="#b8996e" strokeWidth="1" />
      {/* Mane */}
      <path d="M112 32 Q105 42 108 55 Q111 60 110 68" fill="none" stroke="#8b6347" strokeWidth="4" strokeLinecap="round" />
      <path d="M114 30 Q106 40 109 53" fill="none" stroke="#7a5535" strokeWidth="2.5" strokeLinecap="round" />
      {/* Legs */}
      <rect x="68" y="116" width="10" height="28" rx="4" fill="#b8996e" />
      <rect x="84" y="118" width="10" height="26" rx="4" fill="#b8996e" />
      <rect x="108" y="118" width="10" height="26" rx="4" fill="#b8996e" />
      <rect x="124" y="116" width="10" height="28" rx="4" fill="#b8996e" />
      {/* Hooves */}
      <rect x="67" y="140" width="12" height="6" rx="3" fill="#3d2b1a" />
      <rect x="83" y="140" width="12" height="6" rx="3" fill="#3d2b1a" />
      <rect x="107" y="140" width="12" height="6" rx="3" fill="#3d2b1a" />
      <rect x="123" y="140" width="12" height="6" rx="3" fill="#3d2b1a" />
      {/* Tail */}
      <path d="M50 85 Q30 80 25 95 Q28 110 40 108" fill="none" stroke="#8b6347" strokeWidth="5" strokeLinecap="round" />
      <path d="M50 88 Q32 90 30 105" fill="none" stroke="#7a5535" strokeWidth="3" strokeLinecap="round" />
      {/* Ground shadow */}
      <ellipse cx="100" cy="147" rx="60" ry="5" fill="rgba(45,74,45,0.1)" />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const [sent, setSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Fel e-post eller lösenord.')
    else if (!rememberMe) {
      window.addEventListener('beforeunload', () => supabase.auth.signOut(), { once: true })
    }
    setLoading(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '12px 14px', borderRadius: 8,
    border: '1.5px solid ' + C.parchment, fontSize: '1rem',
    fontFamily: 'Georgia,serif', color: C.bark, background: C.cream, outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Horse + title */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
          <HorseSVG />
        </div>
        <h1 style={{ fontFamily: 'Georgia,serif', color: C.forest, fontSize: '1.8rem', marginBottom: 4 }}>Höglanda Hästgård</h1>
        <p style={{ color: C.muted, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stallapp</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(45,74,45,0.12)', border: '1.5px solid ' + C.parchment }}>
        {mode === 'login' ? (
          <>
            <h2 style={{ fontFamily: 'Georgia,serif', color: C.bark, fontSize: '1.1rem', marginBottom: 20 }}>Logga in</h2>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: C.moss, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-post</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" style={inp} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: C.moss, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lösenord</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inp} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
                <div onClick={() => setRememberMe(r => !r)} style={{ width: 44, height: 24, borderRadius: 12, background: rememberMe ? C.moss : C.parchment, position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 3, left: rememberMe ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                </div>
                <span style={{ fontSize: '0.82rem', color: C.bark, userSelect: 'none' }}>Kom ihåg mig</span>
              </label>
              {error && <div style={{ background: '#fce8e8', border: '1px solid #d9534f', borderRadius: 7, padding: '8px 12px', fontSize: '0.85rem', color: '#c62828', marginBottom: 14 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 9, border: 'none', background: C.forest, color: '#fff', fontFamily: 'Georgia,serif', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Loggar in...' : 'Logga in'}
              </button>
            </form>
            <button onClick={() => { setMode('forgot'); setError('') }} style={{ marginTop: 14, background: 'none', border: 'none', color: C.muted, fontSize: '0.82rem', cursor: 'pointer', width: '100%', textAlign: 'center', fontFamily: 'Georgia,serif' }}>
              Glömt lösenordet?
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: 'Georgia,serif', color: C.bark, fontSize: '1.1rem', marginBottom: 8 }}>Återställ lösenord</h2>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📧</div>
                <p style={{ color: C.moss, fontSize: '0.9rem', lineHeight: 1.5 }}>En återställningslänk har skickats till <strong>{email}</strong></p>
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <p style={{ fontSize: '0.82rem', color: C.muted, marginBottom: 16 }}>Ange din e-postadress så skickar vi en återställningslänk.</p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: C.moss, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-post</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" style={inp} />
                </div>
                {error && <div style={{ background: '#fce8e8', border: '1px solid #d9534f', borderRadius: 7, padding: '8px 12px', fontSize: '0.85rem', color: '#c62828', marginBottom: 14 }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 9, border: 'none', background: C.forest, color: '#fff', fontFamily: 'Georgia,serif', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Skickar...' : 'Skicka länk'}
                </button>
              </form>
            )}
            <button onClick={() => { setMode('login'); setSent(false); setError('') }} style={{ marginTop: 14, background: 'none', border: 'none', color: C.muted, fontSize: '0.82rem', cursor: 'pointer', width: '100%', textAlign: 'center', fontFamily: 'Georgia,serif' }}>
              ← Tillbaka
            </button>
          </>
        )}
      </div>
    </div>
  )
}
