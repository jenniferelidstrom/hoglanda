import React, { useState } from 'react'
import { supabase } from './supabase.js'

const C = {
  forest: '#2d4a2d', moss: '#4a6741', straw: '#c8a96e',
  cream: '#f7f2e8', parchment: '#ede6d3', bark: '#3d2b1a', muted: '#9a8a6a',
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [sent, setSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Fel e-post eller lösenord.')
    setLoading(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: '1.5px solid ' + C.parchment, fontSize: '0.9rem',
    fontFamily: 'Georgia,serif', color: C.bark, background: C.cream, outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🌿</div>
        <h1 style={{ fontFamily: 'Georgia,serif', color: C.forest, fontSize: '1.8rem', marginBottom: 4 }}>Höglanda Hästgård</h1>
        <p style={{ color: C.muted, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stallapp</p>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(45,74,45,0.12)', border: '1.5px solid ' + C.parchment }}>
        {mode === 'login' ? (
          <>
            <h2 style={{ fontFamily: 'Georgia,serif', color: C.bark, fontSize: '1.1rem', marginBottom: 20 }}>Logga in</h2>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: C.moss, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-post</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" style={inp} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: C.moss, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lösenord</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inp} />
              </div>
              {error && <div style={{ background: '#fce8e8', border: '1px solid #d9534f', borderRadius: 7, padding: '8px 12px', fontSize: '0.8rem', color: '#c62828', marginBottom: 14 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 9, border: 'none', background: C.forest, color: '#fff', fontFamily: 'Georgia,serif', fontSize: '0.95rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Loggar in...' : 'Logga in'}
              </button>
            </form>
            <button onClick={() => { setMode('forgot'); setError('') }} style={{ marginTop: 14, background: 'none', border: 'none', color: C.muted, fontSize: '0.78rem', cursor: 'pointer', width: '100%', textAlign: 'center', fontFamily: 'Georgia,serif' }}>
              Glömt lösenordet?
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: 'Georgia,serif', color: C.bark, fontSize: '1.1rem', marginBottom: 8 }}>Återställ lösenord</h2>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📧</div>
                <p style={{ color: C.moss, fontSize: '0.88rem', lineHeight: 1.5 }}>En återställningslänk har skickats till <strong>{email}</strong></p>
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <p style={{ fontSize: '0.78rem', color: C.muted, marginBottom: 16 }}>Ange din e-postadress så skickar vi en återställningslänk.</p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: C.moss, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-post</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" style={inp} />
                </div>
                {error && <div style={{ background: '#fce8e8', border: '1px solid #d9534f', borderRadius: 7, padding: '8px 12px', fontSize: '0.8rem', color: '#c62828', marginBottom: 14 }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 9, border: 'none', background: C.forest, color: '#fff', fontFamily: 'Georgia,serif', fontSize: '0.95rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Skickar...' : 'Skicka länk'}
                </button>
              </form>
            )}
            <button onClick={() => { setMode('login'); setSent(false); setError('') }} style={{ marginTop: 14, background: 'none', border: 'none', color: C.muted, fontSize: '0.78rem', cursor: 'pointer', width: '100%', textAlign: 'center', fontFamily: 'Georgia,serif' }}>
              ← Tillbaka
            </button>
          </>
        )}
      </div>
    </div>
  )
}
