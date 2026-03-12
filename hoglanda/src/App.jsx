import React, { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import Login from './Login.jsx'
import StableApp from './StableApp.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
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
      else { setRole(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchRole(userId) {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    setRole(data?.role || 'inackordering')
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#f7f2e8', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2rem', marginBottom:12 }}>🌿</div>
          <div style={{ color:'#4a6741', fontFamily:'Georgia,serif', fontSize:'1rem' }}>Laddar...</div>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  return <StableApp session={session} role={role} onSignOut={signOut} />
}
