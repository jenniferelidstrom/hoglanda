import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase.js'
import Login from './Login.jsx'
import StableApp from './StableApp.jsx'
import hoglandaLogo from './assets/logo-light.svg'

function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('inackordering')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchRole(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchRole(session.user.id)
      else { setRole('inackordering'); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchRole(userId) {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (data) setRole(data.role)
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
    setRole('inackordering')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #2d4a2d, #4a6741)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <img src={hoglandaLogo} alt="Höglanda Hästgård" style={{ width: 300, maxWidth: '80%', height: 'auto' }} />
      <p style={{ color: 'rgba(200,169,110,0.72)', fontFamily: 'Georgia,serif', fontSize: '1rem', margin: '2px 0 0' }}>Stallapp</p>
      <p style={{ color: 'rgba(200,169,110,0.5)', fontFamily: 'Georgia,serif', fontSize: '0.8rem', margin: '26px 0 0' }}>Laddar…</p>
    </div>
  )

  if (!session) return <Login />

  return <StableApp session={session} role={role} onSignOut={handleSignOut} />
}

createRoot(document.getElementById('root')).render(<App />)

// Registrera service worker (gör appen installerbar + snabb offline-start)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
