import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase.js'
import Login from './Login.jsx'
import StableApp from './StableApp.jsx'

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
    <div style={{ minHeight: '100vh', background: '#f7f2e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌿</div>
        <div style={{ color: '#4a6741', fontFamily: 'Georgia,serif' }}>Laddar...</div>
      </div>
    </div>
  )

  if (!session) return <Login />

  return <StableApp session={session} role={role} onSignOut={handleSignOut} />
}

createRoot(document.getElementById('root')).render(<App />)
