import React, { useState } from 'react'
import { supabase } from './supabase.js'
import hoglandaImg from './assets/hoglanda.jpg'

const C = {
  forest: '#2d4a2d', moss: '#4a6741', straw: '#c8a96e',
  cream: '#f7f2e8', parchment: '#ede6d3', bark: '#3d2b1a', muted: '#9a8a6a',
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.forest}, ${C.moss})`, padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Image + title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 14px', border: `3px solid ${C.straw}`, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <img src={hoglandaImg} alt="Höglanda Hästgård" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '1.5rem', color: C.straw, margin: 0 }}>Höglanda Hästgård</h1>
          <p style={{ color: 'rgba(200,169,110,0.7)', fontSize: '0.85rem', marginTop: 4, fontFamily: 'Georgia,serif' }}>Stallapp</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          {mode === 'login' ? (
            <>
              <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.15rem', color: C.bark, textAlign: 'center', marginBottom: 20 }}>Logga in</h2>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: C.muted, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-post</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" style={inp} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: C.muted, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lösenord</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inp} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div onClick={() => setRememberMe(r => !r)} style={{ width: 44, height: 24, borderRadius: 12, background: rememberMe ? C.moss : C.parchment, position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: rememberMe ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', color: C.muted, fontFamily: 'Georgia,serif' }}>Kom ihåg mig</span>
                </div>
                {error && <p style={{ color: '#d9534f', fontSize: '0.85rem', marginBottom: 12, textAlign: 'center' }}>{error}</p>}
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.forest}, ${C.moss})`, color: C.straw, fontFamily: 'Georgia,serif', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.03em' }}>
                  {loading ? 'Loggar in...' : 'Logga in'}
                </button>
              </form>
              <button onClick={() => { setMode('forgot'); setError('') }} style={{ marginTop: 14, background: 'none', border: 'none', color: C.muted, fontSize: '0.82rem', cursor: 'pointer', width: '100%', textAlign: 'center', fontFamily: 'Georgia,serif' }}>
                Glömt lösenordet?
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.15rem', color: C.bark, textAlign: 'center', marginBottom: 20 }}>Återställ lösenord</h2>
              {sent ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: '2rem', marginBottom: 8 }}>📧</p>
                  <p style={{ color: C.bark, fontSize: '0.9rem', fontFamily: 'Georgia,serif' }}>En återställningslänk har skickats till {email}</p>
                </div>
              ) : (
                <form onSubmit={handleForgot}>
                  <p style={{ color: C.muted, fontSize: '0.85rem', marginBottom: 16, fontFamily: 'Georgia,serif' }}>Ange din e-postadress så skickar vi en återställningslänk.</p>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: C.muted, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-post</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" style={inp} />
                  </div>
                  {error && <p style={{ color: '#d9534f', fontSize: '0.85rem', marginBottom: 12, textAlign: 'center' }}>{error}</p>}
                  <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.forest}, ${C.moss})`, color: C.straw, fontFamily: 'Georgia,serif', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
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
    </div>
  )
}
