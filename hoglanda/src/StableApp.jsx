import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'

const C = {
  forest:'#2d4a2d', moss:'#4a6741', sage:'#7a9970',
  straw:'#c8a96e', cream:'#f7f2e8', parchment:'#ede6d3',
  earth:'#8b6347', bark:'#3d2b1a', gold:'#c49a2a', muted:'#9a8a6a',
}
const PASS = ['Utsläpp','Lunchfodring','Gå med Stella','Lägga in middag','Göra ny middag','Insläpp','Kvällsfodring']
const PASS_ICONS = ['🌅','🥕','🚶','🍽️','🔄','🏠','🌙']
const DAGAR = ['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag']
const DAGAR_SHORT = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön']
const PERSONER = ['Lars','Agneta','Jennifer','Linnea']
const TODAY = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'][new Date().getDay()]
const FODER_MEALS = ['Morgon','Lunch','Middag','Kväll']
const FODER_COLS = ['ho','kraft','mash','ovrigt']
const FODER_COL_LABELS = ['Hö','Kraft','Mash/Blötlagd','Övrig info']
const MONTHS_SV = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December']
const MONTHS_SHORT = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec']

const PADDOCK_SLOTS = []
for (let h = 7; h < 22; h++) {
  ['00','30'].forEach(m => {
    const start = String(h).padStart(2,'0') + ':' + m
    const [eh, em] = m === '00' ? [h,'30'] : [h+1,'00']
    PADDOCK_SLOTS.push(start + '-' + String(eh).padStart(2,'0') + ':' + String(em).padStart(2,'0'))
  })
}

const INITIAL_HORSES = [
  { name:'Calle',   riders:['Linnea','Jennifer'] },
  { name:'Charina', riders:['Linnea'] },
  { name:'Hippo',   riders:['Linnea'] },
  { name:'Storm',   riders:['Linnea','Märtha','Alva/Agnes'] },
  { name:'Skye',    riders:['Linnea','Sofie','Frida','Cornelia'] },
  { name:'Joker',   riders:['Linnea','Julia'] },
  { name:'Maggan',  riders:['Linnea','Mollie','Sigrid','Freja'] },
  { name:'Lova',    riders:['Jennifer','Lova','Linnea'] },
]

// ── Hooks & Helpers ────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}
function getMonday(date) {
  const d = new Date(date); const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0,0,0,0); return d
}
function weekKey(monday) { return monday.toISOString().slice(0,10) }
function weekLabel(monday) {
  const sun = new Date(monday); sun.setDate(monday.getDate() + 6)
  const fmt = d => d.getDate() + '/' + (d.getMonth()+1)
  const jan4 = new Date(monday.getFullYear(), 0, 4)
  const wk = Math.round((monday - getMonday(jan4)) / 604800000) + 1
  return { num: 'Vecka ' + wk, dates: fmt(monday) + ' – ' + fmt(sun) + ' ' + monday.getFullYear() }
}
function getDaysInMonth(year, month) {
  const days = []; const d = new Date(year, month, 1)
  while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate()+1) }
  return days
}
function monthKey(year, month) { return year + '-' + String(month+1).padStart(2,'0') }
function dateKey(d) { return d.toISOString().slice(0,10) }
function emptySchedule() {
  const s = {}; DAGAR.forEach(d => { s[d] = {}; PASS.forEach(p => { s[d][p] = [] }) }); return s
}
function emptyActWeek(names) {
  const w = {}
  names.forEach(name => { w[name] = {}; DAGAR.concat(['Övrigt']).forEach(d => { w[name][d] = { text:'', ansvarig:'' } }) })
  return w
}
function emptyFoder(names) {
  const f = {}
  names.forEach(name => { f[name] = {}; FODER_MEALS.forEach(m => { f[name][m] = { ho:'', kraft:'', mash:'', ovrigt:'' } }) })
  return f
}
function buildInitialRiderConfig() {
  const cfg = {}
  INITIAL_HORSES.forEach(h => { cfg[h.name] = h.riders.map(name => ({ id: Math.random().toString(36).slice(2), name, from:'', to:'' })) })
  return cfg
}
function getActiveRiders(riderConfig, horseName, dateStr) {
  return (riderConfig[horseName] || []).filter(r => (!r.from || dateStr >= r.from) && (!r.to || dateStr <= r.to)).map(r => r.name)
}

// ── UI Components ──────────────────────────────────────────
const inp = { width:'100%', padding:'11px 13px', borderRadius:8, border:'1.5px solid '+C.parchment, fontSize:'1rem', fontFamily:'Georgia,serif', color:C.bark, background:C.cream, outline:'none' }

function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom:16 }}>
      <h2 style={{ fontFamily:'Georgia,serif', fontSize:'1.2rem', color:C.bark, display:'flex', alignItems:'center', gap:8, margin:0 }}>{icon} {title}</h2>
      {sub && <p style={{ color:C.muted, fontSize:'0.74rem', margin:'3px 0 0 28px' }}>{sub}</p>}
    </div>
  )
}
function WeekNav({ info, isNow, onPrev, onNext }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', borderRadius:10, padding:'10px 14px', border:'1.5px solid '+C.parchment, marginBottom:14 }}>
      <button onClick={onPrev} style={{ background:C.parchment, border:'none', borderRadius:8, width:40, height:40, fontSize:'1.2rem', cursor:'pointer', color:C.bark }}>‹</button>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontWeight:'bold', fontSize:'0.95rem', color:C.bark, fontFamily:'Georgia,serif' }}>
          {info.num}{isNow && <span style={{ marginLeft:8, background:C.moss, color:'#fff', borderRadius:4, padding:'1px 7px', fontSize:'0.6rem', verticalAlign:'middle' }}>NU</span>}
        </div>
        <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>{info.dates}</div>
      </div>
      <button onClick={onNext} style={{ background:C.parchment, border:'none', borderRadius:8, width:40, height:40, fontSize:'1.2rem', cursor:'pointer', color:C.bark }}>›</button>
    </div>
  )
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:'0.72rem', color:C.earth, marginBottom:5, fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
      {children}
    </div>
  )
}
function SaveBadge({ saving }) {
  if (!saving) return null
  return <span style={{ fontSize:'0.65rem', color:'rgba(200,169,110,0.6)', marginLeft:8 }}>💾 Sparar...</span>
}
function RiderPicker({ horseName, selected, onChange, riderConfig, readOnly }) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().slice(0,10)
  const riders = getActiveRiders(riderConfig, horseName, today)
  const sel = Array.isArray(selected) ? selected : (selected ? [selected] : [])
  return (
    <div style={{ position:'relative', borderTop:'1px dashed '+C.parchment, marginTop:2 }}>
      <button onClick={() => !readOnly && setOpen(o => !o)} style={{ width:'100%', background:'transparent', border:'none', padding:'3px 4px', textAlign:'left', cursor: readOnly ? 'default' : 'pointer', fontFamily:'Georgia,serif', fontSize:'0.65rem', color: sel.length ? C.earth : C.muted, fontStyle:'italic', outline:'none', display:'flex', flexWrap:'wrap', gap:2, minHeight:20 }}>
        {sel.length === 0 ? 'vem?' : sel.map(r => <span key={r} style={{ background:C.earth, color:'#fff', borderRadius:3, padding:'1px 5px', fontSize:'0.6rem', fontStyle:'normal', fontWeight:'bold' }}>{r}</span>)}
      </button>
      {open && (
        <div style={{ position:'absolute', bottom:'calc(100% + 4px)', left:0, zIndex:60, background:'#fff', border:'1.5px solid '+C.straw, borderRadius:10, padding:'10px', boxShadow:'0 8px 24px rgba(0,0,0,0.2)', minWidth:150 }}>
          {riders.length === 0 && <div style={{ fontSize:'0.78rem', color:C.muted, padding:'4px' }}>Inga aktiva ryttare</div>}
          {riders.map(r => (
            <label key={r} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 4px', cursor:'pointer', borderRadius:6, fontSize:'0.88rem', color:C.bark, background: sel.includes(r) ? '#f0f7ee' : 'transparent' }}>
              <input type="checkbox" checked={sel.includes(r)} onChange={() => onChange(sel.includes(r) ? sel.filter(x => x !== r) : sel.concat([r]))} style={{ accentColor:C.moss, width:17, height:17 }} />
              {r}
            </label>
          ))}
          <button onClick={() => setOpen(false)} style={{ marginTop:6, width:'100%', padding:'6px', borderRadius:6, border:'1px solid '+C.parchment, background:C.parchment, fontSize:'0.75rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark }}>Stäng</button>
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function StableApp({ session, role, onSignOut }) {
  const isAdmin = role === 'admin'
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('schema')
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const [horseNames, setHorseNames] = useState(INITIAL_HORSES.map(h => h.name))
  const [riderConfig, setRiderConfig] = useState(buildInitialRiderConfig())
  const [foderState, setFoderState] = useState(() => emptyFoder(INITIAL_HORSES.map(h => h.name)))

  const thisMonday = getMonday(new Date())
  const [schedMonday, setSchedMonday] = useState(thisMonday)
  const [allScheds, setAllScheds] = useState({ [weekKey(thisMonday)]: emptySchedule() })
  const [openCell, setOpenCell] = useState(null)
  const todayIdx = DAGAR.indexOf(TODAY)
  const [schedDayIdx, setSchedDayIdx] = useState(todayIdx >= 0 ? todayIdx : 0)
  const schedKey = weekKey(schedMonday)
  const sched = allScheds[schedKey] || emptySchedule()

  const [actOffset, setActOffset] = useState(0)
  const actMonday = (() => { const d = new Date(thisMonday); d.setDate(d.getDate() + actOffset*7); return d })()
  const actKey = weekKey(actMonday)
  const [allActs, setAllActs] = useState({ [actKey]: emptyActWeek(INITIAL_HORSES.map(h => h.name)) })
  const actGrid = allActs[actKey] || emptyActWeek(horseNames)

  const now = new Date()
  const [paddockMonth, setPaddockMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [allPaddock, setAllPaddock] = useState({})
  const curMK = monthKey(paddockMonth.year, paddockMonth.month)
  const paddockGrid = allPaddock[curMK] || {}

  const [stroLog, setStroLog] = useState([])
  const [sForm, setSForm] = useState({ name:'', item:'Stallströ', amount:1 })
  const [sOk, setSOk] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState(null)

  const [selection, setSelection] = useState(new Set())
  const isDragging = useRef(false)
  const dragMode = useRef('add')
  const visitedDrag = useRef(new Set())
  const [bookModal, setBookModal] = useState(false)
  const [bookName, setBookName] = useState('')
  const [bookType, setBookType] = useState('grön')

  useEffect(() => { loadAllData() }, [])

  async function loadAllData() {
    setLoadingData(true)
    const { data } = await supabase.from('app_data').select('key, value')
    if (data) data.forEach(row => {
      if (row.key === 'horseNames') setHorseNames(row.value)
      if (row.key === 'riderConfig') setRiderConfig(row.value)
      if (row.key === 'foderState') setFoderState(row.value)
      if (row.key === 'allScheds') setAllScheds(row.value)
      if (row.key === 'allActs') setAllActs(row.value)
      if (row.key === 'allPaddock') setAllPaddock(row.value)
    })
    const { data: s } = await supabase.from('stro_log').select('*').order('created_at', { ascending: false })
    if (s) setStroLog(s.map(r => ({ id:r.id, name:r.name, item:r.item, amount:r.amount, date:r.date })))
    setLoadingData(false)
  }

  async function saveKey(key, value) {
    setSaving(true)
    await supabase.from('app_data').upsert({ key, value }, { onConflict: 'key' })
    setSaving(false)
  }

  function goSchedWeek(d) {
    setSchedMonday(prev => {
      const next = new Date(prev); next.setDate(prev.getDate() + d*7)
      const k = weekKey(next)
      if (!allScheds[k]) setAllScheds(s => ({ ...s, [k]: emptySchedule() }))
      return next
    })
  }
  async function togglePerson(dag, pass, person) {
    const week = allScheds[schedKey] || emptySchedule()
    const cur = (week[dag]?.[pass]) || []
    const next = cur.includes(person) ? cur.filter(x => x !== person) : [...cur, person]
    const ns = { ...allScheds, [schedKey]: { ...week, [dag]: { ...week[dag], [pass]: next } } }
    setAllScheds(ns); await saveKey('allScheds', ns)
  }

  function goActWeek(d) {
    setActOffset(o => {
      const next = o + d; const nm = new Date(thisMonday); nm.setDate(nm.getDate() + next*7)
      const k = weekKey(nm)
      if (!allActs[k]) setAllActs(s => ({ ...s, [k]: emptyActWeek(horseNames) }))
      return next
    })
  }
  async function updateAct(horse, dag, field, val) {
    const week = allActs[actKey] || emptyActWeek(horseNames)
    const row = week[horse] || {}; const cell = row[dag] || { text:'', ansvarig:'' }
    const ns = { ...allActs, [actKey]: { ...week, [horse]: { ...row, [dag]: { ...cell, [field]: val } } } }
    setAllActs(ns); await saveKey('allActs', ns)
  }

  async function updateFoder(horse, meal, col, val) {
    const h = foderState[horse] || {}; const m = h[meal] || { ho:'', kraft:'', mash:'', ovrigt:'' }
    const nf = { ...foderState, [horse]: { ...h, [meal]: { ...m, [col]: val } } }
    setFoderState(nf); await saveKey('foderState', nf)
  }

  function goMonth(delta) {
    setPaddockMonth(prev => {
      let m = prev.month + delta, y = prev.year
      if (m > 11) { m = 0; y++ } else if (m < 0) { m = 11; y-- }
      return { year: y, month: m }
    })
  }
  async function setPaddockSlot(dateStr, slot, value) {
    const month = { ...(allPaddock[curMK] || {}) }
    const day = { ...(month[dateStr] || {}) }
    if (value === null) delete day[slot]; else day[slot] = value
    month[dateStr] = day
    const np = { ...allPaddock, [curMK]: month }
    setAllPaddock(np); await saveKey('allPaddock', np)
  }

  const cellKey = (dateStr, slot) => dateStr + '|' + slot
  function toggleCell(dk, slot) {
    const k = cellKey(dk, slot)
    setSelection(prev => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next })
  }
  function onCellMouseDown(e, dk, slot) {
    e.preventDefault(); const k = cellKey(dk, slot)
    isDragging.current = true; visitedDrag.current = new Set([k])
    dragMode.current = selection.has(k) ? 'remove' : 'add'
    setSelection(prev => { const next = new Set(prev); dragMode.current === 'remove' ? next.delete(k) : next.add(k); return next })
  }
  function onCellMouseEnter(dk, slot) {
    if (!isDragging.current) return; const k = cellKey(dk, slot)
    if (visitedDrag.current.has(k)) return; visitedDrag.current.add(k)
    setSelection(prev => { const next = new Set(prev); dragMode.current === 'remove' ? next.delete(k) : next.add(k); return next })
  }
  function onDragEnd() { isDragging.current = false; visitedDrag.current = new Set() }

  function canBookDate(dateStr) {
    const deadline = new Date(dateStr); deadline.setDate(deadline.getDate()-1); deadline.setHours(18,0,0,0)
    return new Date() < deadline
  }
  function selectionHasUnbookable() { for (const k of selection) if (!canBookDate(k.split('|')[0])) return true; return false }
  function openBookModal() {
    if (!selection.size) return
    if (selectionHasUnbookable()) { alert('Bokningar måste göras senast dagen innan kl 18:00.'); return }
    setBookModal(true)
  }
  function clearSelection() { setSelection(new Set()); setBookModal(false) }
  async function saveMultiBooking() {
    if (!bookName.trim()) return
    for (const k of selection) {
      const [ds, ...sp] = k.split('|')
      if (canBookDate(ds)) await setPaddockSlot(ds, sp.join('|'), { name: bookName.trim(), type: bookType, userId: session.user.id })
    }
    clearSelection()
  }
  async function deleteMultiBooking() {
    for (const k of selection) { const [ds, ...sp] = k.split('|'); await setPaddockSlot(ds, sp.join('|'), null) }
    clearSelection()
  }

  async function submitStro() {
    if (!sForm.name) return
    const date = new Date().toISOString().slice(0,10)
    const { data } = await supabase.from('stro_log').insert({ name:sForm.name, item:sForm.item, amount:sForm.amount, date, user_id:session.user.id }).select().single()
    if (data) setStroLog(p => [{ id:data.id, name:data.name, item:data.item, amount:data.amount, date:data.date }, ...p])
    setSOk(true); setSForm({ name:'', item:'Stallströ', amount:1 }); setTimeout(() => setSOk(false), 3000)
  }
  async function saveStroEdit() {
    await supabase.from('stro_log').update({ name:editData.name, item:editData.item, amount:editData.amount }).eq('id', editId)
    setStroLog(p => p.map(l => l.id === editId ? { ...l, ...editData } : l)); setEditId(null); setEditData(null)
  }
  async function deleteStro(id) {
    await supabase.from('stro_log').delete().eq('id', id); setStroLog(p => p.filter(l => l.id !== id))
  }

  async function saveHorseNames(names) { setHorseNames(names); await saveKey('horseNames', names) }
  async function saveRiderConfig(cfg) { setRiderConfig(cfg); await saveKey('riderConfig', cfg) }

  const TABS = [
    { id:'schema',    label:'Schema',    icon:'📅' },
    { id:'stro',      label:'Strö',      icon:'📦' },
    { id:'foder',     label:'Foder',     icon:'🌾' },
    { id:'aktivitet', label:'Aktivitet', icon:'🐎' },
    { id:'settings',  label:'Inst.',     icon:'⚙️', adminOnly: true },
    { id:'paddock',   label:'Paddock',   icon:'🏟️' },
  ].filter(t => !t.adminOnly || isAdmin)

  if (loadingData) return (
    <div style={{ minHeight:'100vh', background:C.cream, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:'2.5rem', marginBottom:12 }}>🌿</div><div style={{ color:C.moss, fontFamily:'Georgia,serif' }}>Laddar...</div></div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.cream, fontFamily:'Georgia,serif', paddingBottom: isMobile ? 72 : 0 }}>

      {/* ── Header ── */}
      <header style={{ background:'linear-gradient(135deg,'+C.forest+','+C.moss+')', boxShadow:'0 4px 20px rgba(0,0,0,0.2)', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ padding: isMobile ? '10px 14px 8px' : '14px 20px 10px', borderBottom:'2px solid rgba(200,169,110,0.4)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize: isMobile ? '1.3rem' : '1.6rem' }}>🌿</span>
            <div>
              <h1 style={{ color:C.straw, fontSize: isMobile ? '1rem' : '1.3rem', fontWeight:'bold', margin:0 }}>Höglanda Hästgård</h1>
              <p style={{ color:'rgba(200,169,110,0.65)', fontSize:'0.6rem', margin:0, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                {isAdmin ? '👑 Admin' : '🐴 Inackordering'}{!isMobile && ' · ' + session.user.email}<SaveBadge saving={saving} />
              </p>
            </div>
          </div>
          <button onClick={onSignOut} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:7, padding: isMobile ? '7px 11px' : '5px 14px', color:C.straw, cursor:'pointer', fontSize: isMobile ? '0.78rem' : '0.75rem', fontFamily:'Georgia,serif' }}>
            Logga ut
          </button>
        </div>
        {/* Desktop top nav */}
        {!isMobile && (
          <nav style={{ display:'flex', overflowX:'auto', padding:'0 16px' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 14px', color: tab===t.id ? C.straw : 'rgba(200,169,110,0.5)', borderBottom: tab===t.id ? '3px solid '+C.straw : '3px solid transparent', fontSize:'0.78rem', fontFamily:'Georgia,serif', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5, fontWeight: tab===t.id ? 'bold' : 'normal' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main style={{ maxWidth:1200, margin:'0 auto', padding: isMobile ? '14px 12px' : '24px 16px' }}>

        {/* ══ VECKOSCHEMA ══ */}
        {tab === 'schema' && (
          <div>
            <SectionTitle icon="📅" title="Veckoschema" sub={isAdmin ? 'Klicka en cell för att välja ansvariga' : 'Skrivskyddat'} />
            <WeekNav info={weekLabel(schedMonday)} isNow={weekKey(schedMonday)===weekKey(thisMonday)} onPrev={() => goSchedWeek(-1)} onNext={() => goSchedWeek(1)} />
            {isMobile ? (
              <div>
                {/* Day pills */}
                <div style={{ display:'flex', gap:5, marginBottom:12, overflowX:'auto', paddingBottom:2 }}>
                  {DAGAR.map((d, i) => {
                    const isSel = i === schedDayIdx; const isToday = d === TODAY
                    return (
                      <button key={d} onClick={() => setSchedDayIdx(i)} style={{ flex:'0 0 auto', padding:'7px 12px', borderRadius:20, border:'none', background: isSel ? C.forest : isToday ? '#e8f5e8' : C.parchment, color: isSel ? C.straw : isToday ? C.moss : C.bark, fontFamily:'Georgia,serif', fontWeight: isSel || isToday ? 'bold' : 'normal', fontSize:'0.8rem', cursor:'pointer' }}>
                        {DAGAR_SHORT[i]}{isToday ? ' •' : ''}
                      </button>
                    )
                  })}
                </div>
                {/* Pass cards for selected day */}
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {PASS.map((pass, pi) => {
                    const dag = DAGAR[schedDayIdx]; const val = sched[dag]?.[pass] || []
                    const ck = dag+'|'+pass; const isOpen = openCell === ck
                    return (
                      <div key={pass} style={{ background:'#fff', borderRadius:10, border:'1.5px solid '+(val.length ? C.straw : C.parchment), position:'relative' }}>
                        <button onClick={() => isAdmin && setOpenCell(isOpen ? null : ck)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 15px', background:'transparent', border:'none', cursor: isAdmin ? 'pointer' : 'default', fontFamily:'Georgia,serif', outline:'none' }}>
                          <span style={{ fontSize:'0.9rem', fontWeight:'bold', color:C.bark }}>{PASS_ICONS[pi]} {pass}</span>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'flex-end', maxWidth:'55%' }}>
                            {val.length === 0 ? <span style={{ fontSize:'0.78rem', color:C.muted, fontStyle:'italic' }}>—</span>
                              : val.map(p => <span key={p} style={{ background:C.moss, color:'#fff', borderRadius:5, padding:'3px 9px', fontSize:'0.75rem', fontWeight:'bold' }}>{p}</span>)}
                          </div>
                        </button>
                        {isOpen && isAdmin && (
                          <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:50, background:'#fff', border:'1.5px solid '+C.straw, borderRadius:10, padding:'10px', boxShadow:'0 8px 24px rgba(0,0,0,0.18)', minWidth:170 }}>
                            {PERSONER.map(p => (
                              <label key={p} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 6px', cursor:'pointer', borderRadius:6, fontSize:'0.92rem', color:C.bark, background: val.includes(p) ? '#f0f7ee' : 'transparent' }}>
                                <input type="checkbox" checked={val.includes(p)} onChange={() => togglePerson(dag, pass, p)} style={{ accentColor:C.moss, width:18, height:18 }} />
                                {p}
                              </label>
                            ))}
                            <button onClick={() => setOpenCell(null)} style={{ marginTop:8, width:'100%', padding:'8px', borderRadius:7, border:'1px solid '+C.parchment, background:C.parchment, fontSize:'0.8rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark }}>Stäng</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <div style={{ minWidth:500 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'150px repeat(7,1fr)', gap:3, marginBottom:4 }}>
                    <div />
                    {DAGAR.map(d => <div key={d} style={{ textAlign:'center', fontSize:'0.68rem', fontWeight:'bold', color: d===TODAY ? C.moss : C.muted, textTransform:'uppercase', letterSpacing:'0.05em', padding:'3px 0', borderBottom: d===TODAY ? '2px solid '+C.moss : '2px solid transparent' }}>{d===TODAY?'• ':''}{d.slice(0,3)}</div>)}
                  </div>
                  {PASS.map((pass, pi) => (
                    <div key={pass} style={{ display:'grid', gridTemplateColumns:'150px repeat(7,1fr)', gap:3, marginBottom:3 }}>
                      <div style={{ display:'flex', alignItems:'center', fontSize:'0.75rem', fontWeight:'bold', color:C.bark, paddingRight:6 }}>{PASS_ICONS[pi]} {pass}</div>
                      {DAGAR.map(dag => {
                        const val = sched[dag]?.[pass] || []; const isToday = dag===TODAY
                        const ck = dag+'|'+pass; const isOpen = openCell===ck
                        return (
                          <div key={dag} style={{ position:'relative' }}>
                            <button onClick={() => isAdmin && setOpenCell(isOpen ? null : ck)} style={{ width:'100%', minHeight:32, padding:'3px', borderRadius:6, fontFamily:'Georgia,serif', border:'1.5px solid '+(isToday ? C.moss : val.length ? C.straw : C.parchment), background: isToday ? '#f0f7ee' : val.length ? '#fffaf0' : '#fff', cursor: isAdmin ? 'pointer' : 'default', outline:'none', display:'flex', flexWrap:'wrap', gap:2, alignItems:'center', justifyContent:'center' }}>
                              {val.length === 0 ? <span style={{ fontSize:'0.6rem', color:C.muted }}>—</span> : val.map(p => <span key={p} style={{ background:C.moss, color:'#fff', borderRadius:3, padding:'1px 4px', fontSize:'0.58rem', fontWeight:'bold' }}>{p.slice(0,1)}</span>)}
                            </button>
                            {isOpen && isAdmin && (
                              <div style={{ position:'absolute', top:'calc(100% + 3px)', left:0, zIndex:50, background:'#fff', border:'1.5px solid '+C.straw, borderRadius:8, padding:'7px', boxShadow:'0 4px 16px rgba(0,0,0,0.15)', minWidth:105 }}>
                                {PERSONER.map(p => (
                                  <label key={p} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px', cursor:'pointer', borderRadius:4, fontSize:'0.75rem', color:C.bark, background: val.includes(p) ? '#f0f7ee' : 'transparent' }}>
                                    <input type="checkbox" checked={val.includes(p)} onChange={() => togglePerson(dag, pass, p)} style={{ accentColor:C.moss, width:13, height:13 }} />{p}
                                  </label>
                                ))}
                                <button onClick={() => setOpenCell(null)} style={{ marginTop:5, width:'100%', padding:'3px', borderRadius:4, border:'1px solid '+C.parchment, background:C.parchment, fontSize:'0.68rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark }}>Stäng</button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STRÖ ══ */}
        {tab === 'stro' && (
          <div>
            <SectionTitle icon="📦" title="Logga Strö/Pellets" sub="Alla kan logga förbrukning" />
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16 }}>
              <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 16 : 22, border:'1.5px solid '+C.parchment, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ color:C.bark, marginBottom:16, fontSize:'1rem' }}>Logga förbrukning</h3>
                <Field label="Ditt namn">
                  <input value={sForm.name} onChange={e => setSForm(f => ({ ...f, name: e.target.value }))} placeholder="Namn..." style={inp} />
                </Field>
                <Field label="Vad har du tagit?">
                  <div style={{ display:'flex', gap:8 }}>
                    {['Stallströ','Stallpellets'].map(item => (
                      <label key={item} style={{ flex:1, padding:'12px 10px', borderRadius:9, cursor:'pointer', border:'2px solid '+(sForm.item===item ? C.gold : C.parchment), background: sForm.item===item ? '#fdf6d8' : '#fff', display:'flex', alignItems:'center', gap:6, fontSize:'0.88rem', color:C.bark }}>
                        <input type="radio" checked={sForm.item===item} onChange={() => setSForm(f => ({ ...f, item }))} style={{ display:'none' }} />
                        {item==='Stallströ' ? '🌿' : '⚪'} {item}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Antal säckar">
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={() => setSForm(f => ({ ...f, amount: Math.max(1, f.amount-1) }))} style={{ width:46, height:46, borderRadius:9, border:'1.5px solid '+C.parchment, background:C.parchment, fontSize:'1.4rem', cursor:'pointer' }}>−</button>
                    <span style={{ fontSize:'1.5rem', fontWeight:'bold', color:C.bark, minWidth:32, textAlign:'center' }}>{sForm.amount}</span>
                    <button onClick={() => setSForm(f => ({ ...f, amount: f.amount+1 }))} style={{ width:46, height:46, borderRadius:9, border:'1.5px solid '+C.parchment, background:C.parchment, fontSize:'1.4rem', cursor:'pointer' }}>+</button>
                  </div>
                </Field>
                {sOk && <div style={{ background:'#e8f5e8', border:'1.5px solid '+C.moss, borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:'0.9rem', color:C.forest }}>✓ Loggat!</div>}
                <button onClick={submitStro} style={{ width:'100%', padding:'14px', borderRadius:9, border:'none', background:C.gold, color:C.bark, fontFamily:'Georgia,serif', fontSize:'1rem', fontWeight:'bold', cursor:'pointer' }}>Spara logg</button>
              </div>
              <div>
                <h3 style={{ color:C.bark, marginBottom:12, fontSize:'1rem' }}>Logghistorik</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {stroLog.map(l => (
                    <div key={l.id} style={{ background: editId===l.id ? '#fffaf0' : '#fff', border:'1.5px solid '+(editId===l.id ? C.gold : C.parchment), borderRadius:10, padding:'13px 14px' }}>
                      {editId===l.id ? (
                        <div>
                          <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                            <input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} style={{ ...inp, flex:1, minWidth:80 }} />
                            <select value={editData.item} onChange={e => setEditData(d => ({ ...d, item: e.target.value }))} style={{ ...inp, flex:1, minWidth:110 }}>
                              <option>Stallströ</option><option>Stallpellets</option>
                            </select>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <button onClick={() => setEditData(d => ({ ...d, amount: Math.max(1,d.amount-1) }))} style={{ background:C.parchment, border:'none', borderRadius:7, width:38, height:38, cursor:'pointer', fontSize:'1rem' }}>−</button>
                              <span style={{ fontWeight:'bold', color:C.bark, minWidth:24, textAlign:'center', fontSize:'1rem' }}>{editData.amount}</span>
                              <button onClick={() => setEditData(d => ({ ...d, amount: d.amount+1 }))} style={{ background:C.parchment, border:'none', borderRadius:7, width:38, height:38, cursor:'pointer', fontSize:'1rem' }}>+</button>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={saveStroEdit} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:C.moss, color:'#fff', cursor:'pointer', fontSize:'0.9rem', fontFamily:'Georgia,serif', fontWeight:'bold' }}>Spara</button>
                            <button onClick={() => setEditId(null)} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid '+C.parchment, background:'#fff', cursor:'pointer', fontSize:'0.9rem', fontFamily:'Georgia,serif' }}>Avbryt</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div>
                            <span style={{ fontWeight:'bold', fontSize:'0.95rem', color:C.bark }}>{l.name}</span>
                            <span style={{ color:C.muted, fontSize:'0.82rem' }}> · {l.item}</span>
                            <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>{l.date}</div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:'0.95rem', fontWeight:'bold', color:C.earth }}>{l.amount} säck{l.amount>1?'ar':''}</span>
                            <button onClick={() => { setEditId(l.id); setEditData({ name:l.name, item:l.item, amount:l.amount }) }} style={{ background:C.parchment, border:'none', borderRadius:7, width:36, height:36, cursor:'pointer', fontSize:'0.9rem' }}>✏️</button>
                            {isAdmin && <button onClick={() => deleteStro(l.id)} style={{ background:'#fce8e8', border:'none', borderRadius:7, width:36, height:36, cursor:'pointer', fontSize:'0.9rem' }}>🗑️</button>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ FODERSTATER ══ */}
        {tab === 'foder' && (
          <div>
            <SectionTitle icon="🌾" title="Foderstater" sub={isAdmin ? 'Fyll i foderstat per häst' : 'Skrivskyddat'} />
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {horseNames.map(name => {
                const hf = foderState[name] || {}
                return (
                  <div key={name} style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:'1.5px solid '+C.parchment }}>
                    <div style={{ background:'#3d1f10', padding:'10px 16px' }}>
                      <span style={{ fontFamily:'Georgia,serif', fontWeight:'bold', color:'#fff', fontSize:'1rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>{name}</span>
                    </div>
                    {isMobile ? (
                      <div style={{ padding:12, display:'flex', flexDirection:'column', gap:8 }}>
                        {FODER_MEALS.map(meal => {
                          const row = hf[meal] || { ho:'', kraft:'', mash:'', ovrigt:'' }
                          return (
                            <div key={meal} style={{ border:'1px solid '+C.parchment, borderRadius:8, overflow:'hidden' }}>
                              <div style={{ background:C.parchment, padding:'6px 12px', fontSize:'0.78rem', fontWeight:'bold', color:C.bark, textTransform:'uppercase', letterSpacing:'0.04em' }}>{meal}</div>
                              <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:7 }}>
                                {FODER_COLS.map((col, ci) => (
                                  <div key={col}>
                                    <div style={{ fontSize:'0.65rem', color:C.muted, marginBottom:3, textTransform:'uppercase', letterSpacing:'0.04em' }}>{FODER_COL_LABELS[ci]}</div>
                                    <input value={row[col]} onChange={e => isAdmin && updateFoder(name, meal, col, e.target.value)} readOnly={!isAdmin} placeholder="—" style={{ ...inp, padding:'8px 10px', fontSize:'0.88rem' }} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                          <tr style={{ background:C.parchment }}>
                            <th style={{ padding:'8px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.06em', color:C.bark, width:110 }}>Mål</th>
                            {FODER_COL_LABELS.map(l => <th key={l} style={{ padding:'8px 10px', textAlign:'left', fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.06em', color:C.bark, borderLeft:'1px solid '+C.cream }}>{l}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {FODER_MEALS.map((meal, mi) => {
                            const row = hf[meal] || { ho:'', kraft:'', mash:'', ovrigt:'' }
                            return (
                              <tr key={meal} style={{ background: mi%2===0 ? '#fff' : C.cream, borderBottom:'1px solid '+C.parchment }}>
                                <td style={{ padding:'8px 14px' }}><span style={{ fontSize:'0.82rem', fontWeight:'bold', color:C.bark }}>{meal}</span></td>
                                {FODER_COLS.map(col => (
                                  <td key={col} style={{ padding:'4px 6px', borderLeft:'1px solid '+C.parchment }}>
                                    <textarea value={row[col]} onChange={e => isAdmin && updateFoder(name, meal, col, e.target.value)} readOnly={!isAdmin} placeholder="—" rows={2} style={{ width:'100%', padding:'3px 5px', fontSize:'0.75rem', border:'none', background:'transparent', resize:'none', fontFamily:'Georgia,serif', color:C.bark, outline:'none', lineHeight:1.5, minWidth:80 }} />
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ HÄSTAKTIVITET ══ */}
        {tab === 'aktivitet' && (
          <div>
            <SectionTitle icon="🐎" title="Hästaktivitet" sub={isAdmin ? 'Veckans aktiviteter per häst' : 'Skrivskyddat'} />
            <WeekNav info={weekLabel(actMonday)} isNow={actOffset===0} onPrev={() => goActWeek(-1)} onNext={() => goActWeek(1)} />
            {isMobile ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {horseNames.map((name, hi) => (
                  <div key={hi} style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:'1.5px solid '+C.parchment }}>
                    <div style={{ background:'linear-gradient(135deg,'+C.forest+','+C.moss+')', padding:'9px 14px' }}>
                      <span style={{ fontFamily:'Georgia,serif', fontWeight:'bold', color:C.straw, fontSize:'1rem' }}>{name}</span>
                    </div>
                    <div style={{ padding:'10px', display:'flex', flexDirection:'column', gap:6 }}>
                      {DAGAR.map(dag => {
                        const cell = actGrid[name]?.[dag] || { text:'', ansvarig:'' }
                        const isToday = dag===TODAY
                        return (
                          <div key={dag} style={{ border:'1px solid '+(isToday ? C.moss : C.parchment), borderRadius:8, overflow:'hidden', background: isToday ? '#f5fbf5' : '#fafafa' }}>
                            <div style={{ padding:'4px 10px', background: isToday ? '#e8f5e8' : C.parchment, fontSize:'0.72rem', fontWeight:'bold', color: isToday ? C.moss : C.bark, textTransform:'uppercase' }}>
                              {dag}{isToday ? ' •' : ''}
                            </div>
                            <div style={{ padding:'6px 8px' }}>
                              <textarea value={cell.text} onChange={e => isAdmin && updateAct(name, dag, 'text', e.target.value)} readOnly={!isAdmin} placeholder="—" rows={2} style={{ width:'100%', padding:'2px 4px', fontSize:'0.85rem', border:'none', background:'transparent', resize:'none', fontFamily:'Georgia,serif', color:C.bark, outline:'none', lineHeight:1.4 }} />
                              <RiderPicker horseName={name} selected={cell.ansvarig||[]} onChange={val => updateAct(name, dag, 'ansvarig', val)} riderConfig={riderConfig} readOnly={!isAdmin} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                  <thead>
                    <tr style={{ background:'linear-gradient(135deg,'+C.forest+','+C.moss+')' }}>
                      <th style={{ padding:'9px 12px', textAlign:'left', color:C.straw, fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.06em', width:85 }}>Häst</th>
                      {DAGAR.map(d => <th key={d} style={{ padding:'9px 6px', textAlign:'center', fontSize:'0.68rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.04em', color: d===TODAY ? C.gold : C.straw, borderLeft:'1px solid rgba(255,255,255,0.1)' }}>{d.slice(0,3)}{d===TODAY?' •':''}</th>)}
                      <th style={{ padding:'9px 6px', textAlign:'center', color:C.straw, fontSize:'0.68rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.04em', borderLeft:'1px solid rgba(255,255,255,0.1)' }}>Övrigt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {horseNames.map((name, hi) => (
                      <tr key={hi} style={{ background: hi%2===0 ? '#fff' : C.cream }}>
                        <td style={{ padding:'5px 8px', borderBottom:'1px solid '+C.parchment, verticalAlign:'top', paddingTop:9 }}>
                          <input value={name} onChange={e => isAdmin && saveHorseNames(horseNames.map((n,j) => j===hi ? e.target.value : n))} readOnly={!isAdmin} style={{ width:'100%', background:'transparent', border:'none', borderBottom:'1px dashed '+C.parchment, outline:'none', fontFamily:'Georgia,serif', fontWeight:'bold', color:C.bark, fontSize:'0.82rem', padding:'2px 0' }} />
                        </td>
                        {DAGAR.concat(['Övrigt']).map(dag => {
                          const cell = actGrid[name]?.[dag] || { text:'', ansvarig:'' }
                          return (
                            <td key={dag} style={{ padding:'3px', borderBottom:'1px solid '+C.parchment, borderLeft:'1px solid '+C.parchment, background: dag===TODAY ? 'rgba(74,103,65,0.04)' : 'transparent', verticalAlign:'top', minWidth:85 }}>
                              <textarea value={cell.text} onChange={e => isAdmin && updateAct(name, dag, 'text', e.target.value)} readOnly={!isAdmin} placeholder="—" rows={2} style={{ width:'100%', padding:'3px 4px', fontSize:'0.67rem', border:'none', background:'transparent', resize:'none', fontFamily:'Georgia,serif', color:C.bark, outline:'none', lineHeight:1.4 }} />
                              {dag !== 'Övrigt' && <RiderPicker horseName={name} selected={cell.ansvarig||[]} onChange={val => updateAct(name, dag, 'ansvarig', val)} riderConfig={riderConfig} readOnly={!isAdmin} />}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ INSTÄLLNINGAR ══ */}
        {tab === 'settings' && isAdmin && (
          <SettingsTab riderConfig={riderConfig} setRiderConfig={saveRiderConfig} horseNames={horseNames} isMobile={isMobile} />
        )}

        {/* ══ PADDOCKBOKNING ══ */}
        {tab === 'paddock' && (
          <div>
            <SectionTitle icon="🏟️" title="Paddockbokning" sub={isMobile ? 'Tryck för att markera tidsfält' : 'Klicka och dra – grön = ok att rida bredvid, röd = ensam'} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', borderRadius:10, padding:'10px 16px', border:'1.5px solid '+C.parchment, marginBottom:12 }}>
              <button onClick={() => goMonth(-1)} style={{ background:C.parchment, border:'none', borderRadius:8, width:40, height:40, fontSize:'1.2rem', cursor:'pointer', color:C.bark }}>‹</button>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontWeight:'bold', fontSize:'1rem', color:C.bark, fontFamily:'Georgia,serif' }}>{MONTHS_SV[paddockMonth.month]} {paddockMonth.year}</div>
                {paddockMonth.year===now.getFullYear() && paddockMonth.month===now.getMonth() && <div style={{ fontSize:'0.68rem', color:C.moss, fontWeight:'bold' }}>Aktuell månad</div>}
              </div>
              <button onClick={() => goMonth(1)} style={{ background:C.parchment, border:'none', borderRadius:8, width:40, height:40, fontSize:'1.2rem', cursor:'pointer', color:C.bark }}>›</button>
            </div>

            {selection.size > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:8, background:C.bark, borderRadius:10, padding:'10px 14px', marginBottom:12, flexWrap:'wrap' }}>
                <span style={{ color:C.straw, fontSize:'0.85rem', fontWeight:'bold' }}>{selection.size} valda</span>
                <button onClick={openBookModal} style={{ background: selectionHasUnbookable() ? C.muted : C.moss, color:'#fff', border:'none', borderRadius:7, padding:'8px 14px', cursor:'pointer', fontFamily:'Georgia,serif', fontWeight:'bold', fontSize:'0.85rem' }}>✏️ Boka</button>
                <button onClick={deleteMultiBooking} style={{ background:'#c62828', color:'#fff', border:'none', borderRadius:7, padding:'8px 14px', cursor:'pointer', fontFamily:'Georgia,serif', fontWeight:'bold', fontSize:'0.85rem' }}>🗑️ Ta bort</button>
                <button onClick={clearSelection} style={{ background:'transparent', color:C.straw, border:'1px solid rgba(200,169,110,0.4)', borderRadius:7, padding:'8px 12px', cursor:'pointer', fontFamily:'Georgia,serif', fontSize:'0.85rem', marginLeft:'auto' }}>✕ Avmarkera</button>
              </div>
            )}

            <div style={{ overflowX:'auto', borderRadius:10, border:'1.5px solid '+C.parchment }} onMouseLeave={onDragEnd} onMouseUp={onDragEnd}>
              <table style={{ borderCollapse:'collapse', minWidth: 80 + PADDOCK_SLOTS.length * (isMobile ? 38 : 50) }}>
                <thead>
                  <tr style={{ background:'linear-gradient(135deg,'+C.forest+','+C.moss+')', position:'sticky', top:0, zIndex:10 }}>
                    <th style={{ padding:'8px 10px', textAlign:'left', color:C.straw, fontSize:'0.62rem', fontWeight:'bold', textTransform:'uppercase', whiteSpace:'nowrap', position:'sticky', left:0, background:C.forest, zIndex:11, minWidth:isMobile ? 60 : 80 }}>Datum</th>
                    {PADDOCK_SLOTS.map(s => <th key={s} style={{ padding:'5px 1px', textAlign:'center', color:C.straw, fontSize: isMobile ? '0.45rem' : '0.52rem', fontWeight:'bold', borderLeft:'1px solid rgba(255,255,255,0.08)', whiteSpace:'nowrap', minWidth: isMobile ? 36 : 48 }}>{s.slice(0,5)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {getDaysInMonth(paddockMonth.year, paddockMonth.month).map((day, di) => {
                    const dk = dateKey(day); const isToday = dk === dateKey(now); const daySlots = paddockGrid[dk] || {}
                    return (
                      <tr key={dk} style={{ background: isToday ? 'rgba(74,103,65,0.07)' : di%2===0 ? '#fff' : C.cream }}>
                        <td style={{ padding: isMobile ? '4px 6px' : '5px 8px', fontSize: isMobile ? '0.6rem' : '0.72rem', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? C.moss : C.bark, whiteSpace:'nowrap', borderBottom:'1px solid '+C.parchment, position:'sticky', left:0, background: isToday ? '#f0f7ee' : di%2===0 ? '#fff' : C.cream, zIndex:5, borderRight:'1.5px solid '+C.parchment }}>
                          {isMobile ? day.getDate() + ' ' + MONTHS_SHORT[day.getMonth()] : day.getDate() + ' ' + MONTHS_SHORT[day.getMonth()] + ' ' + ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'][day.getDay()]}{isToday ? ' ●' : ''}
                        </td>
                        {PADDOCK_SLOTS.map(slot => {
                          const booking = daySlots[slot]; const ck = cellKey(dk, slot); const isSel = selection.has(ck)
                          return (
                            <td key={slot}
                              onMouseDown={e => !isMobile && onCellMouseDown(e, dk, slot)}
                              onMouseEnter={() => !isMobile && onCellMouseEnter(dk, slot)}
                              onMouseUp={onDragEnd}
                              onClick={() => isMobile && toggleCell(dk, slot)}
                              style={{ padding:'2px', borderLeft:'1px solid '+C.parchment, borderBottom:'1px solid '+C.parchment, cursor:'pointer', minWidth: isMobile ? 36 : 48, height: isMobile ? 28 : 30, userSelect:'none', outline: isSel ? '2px solid #1976d2' : 'none', outlineOffset:'-2px', opacity: !canBookDate(dk) && !booking ? 0.4 : 1 }}>
                              {booking ? (
                                <div style={{ background: isSel ? (booking.type==='grön' ? '#81c784' : '#e57373') : (booking.type==='grön' ? '#c8e6c9' : '#ffcdd2'), borderRadius:3, height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 1px' }}>
                                  <span style={{ fontSize: isMobile ? '0.45rem' : '0.58rem', fontWeight:'bold', color: booking.type==='grön' ? '#2d6a2d' : '#c62828', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth: isMobile ? 32 : 44 }}>{booking.name}</span>
                                </div>
                              ) : (
                                <div style={{ background: isSel ? 'rgba(25,118,210,0.15)' : 'transparent', borderRadius:3, height:'100%' }} />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Booking modal — slides up from bottom on mobile */}
            {bookModal && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', padding: isMobile ? 0 : 20 }} onClick={() => setBookModal(false)}>
                <div style={{ background:C.cream, borderRadius: isMobile ? '18px 18px 0 0' : 14, padding: isMobile ? '24px 20px 32px' : 24, maxWidth:380, width:'100%', boxShadow:'0 -8px 40px rgba(0,0,0,0.25)', border:'1.5px solid '+C.straw }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ color:C.bark, fontFamily:'Georgia,serif', marginBottom:4, fontSize:'1.1rem' }}>Boka {selection.size} tidsfält</h3>
                  <p style={{ fontSize:'0.78rem', color:C.muted, marginBottom:18 }}>Välj namn och typ för alla valda fält.</p>
                  <Field label="Namn">
                    <input value={bookName} onChange={e => setBookName(e.target.value)} placeholder="Ditt namn..." style={inp} autoFocus />
                  </Field>
                  <Field label="Typ">
                    <div style={{ display:'flex', gap:10 }}>
                      {['grön','röd'].map(t => (
                        <label key={t} style={{ flex:1, padding:'13px 10px', borderRadius:9, cursor:'pointer', border:'2px solid '+(bookType===t ? (t==='grön' ? '#4a7c41' : '#c62828') : C.parchment), background: bookType===t ? (t==='grön' ? '#e8f5e8' : '#fce8e8') : '#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:'0.88rem', fontWeight:'bold', color: t==='grön' ? '#2d6a2d' : '#c62828' }}>
                          <input type="radio" checked={bookType===t} onChange={() => setBookType(t)} style={{ display:'none' }} />
                          {t==='grön' ? '🟢 Ok bredvid' : '🔴 Ensam'}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <div style={{ display:'flex', gap:10, marginTop:10 }}>
                    <button onClick={saveMultiBooking} style={{ flex:2, padding:'14px', borderRadius:9, border:'none', background:C.moss, color:'#fff', fontFamily:'Georgia,serif', fontWeight:'bold', cursor:'pointer', fontSize:'1rem' }}>Spara</button>
                    <button onClick={() => setBookModal(false)} style={{ flex:1, padding:'14px', borderRadius:9, border:'1px solid '+C.parchment, background:'#fff', fontFamily:'Georgia,serif', cursor:'pointer', fontSize:'1rem', color:C.bark }}>Avbryt</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Mobile bottom nav ── */}
      {isMobile && (
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'linear-gradient(to top,'+C.forest+','+C.moss+')', display:'flex', borderTop:'2px solid rgba(200,169,110,0.25)', zIndex:30, boxShadow:'0 -4px 20px rgba(0,0,0,0.25)', paddingBottom:'env(safe-area-inset-bottom)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, background:'none', border:'none', cursor:'pointer', padding:'9px 4px 11px', display:'flex', flexDirection:'column', alignItems:'center', gap:2, color: tab===t.id ? C.straw : 'rgba(200,169,110,0.4)', fontFamily:'Georgia,serif', WebkitTapHighlightColor:'transparent' }}>
              <span style={{ fontSize:'1.35rem', lineHeight:1 }}>{t.icon}</span>
              <span style={{ fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.04em', fontWeight: tab===t.id ? 'bold' : 'normal', marginTop:1 }}>{t.label}</span>
              {tab===t.id && <span style={{ width:18, height:2, background:C.straw, borderRadius:1, marginTop:1 }} />}
            </button>
          ))}
        </nav>
      )}

      {!isMobile && (
        <footer style={{ textAlign:'center', padding:'20px', color:C.muted, fontSize:'0.72rem', borderTop:'1px solid '+C.parchment, marginTop:20 }}>
          🌿 Höglanda Hästgård · Stallapp
        </footer>
      )}
    </div>
  )
}

// ── Settings Tab ───────────────────────────────────────────
function SettingsTab({ riderConfig, setRiderConfig, horseNames, isMobile }) {
  const [newName, setNewName] = useState({})
  const [newFrom, setNewFrom] = useState({})
  const [newTo, setNewTo] = useState({})
  const today = new Date().toISOString().slice(0,10)

  function statusLabel(r) {
    if (r.to && r.to < today) return { text:'Avslutad', color:'#d9534f', bg:'#fce8e8' }
    if (r.from && r.from > today) return { text:'Ej börjat', color:'#c49a2a', bg:'#fdf6d8' }
    return { text:'Aktiv', color:'#4a6741', bg:'#e8f5e8' }
  }
  function addRider(horse) {
    const name = (newName[horse] || '').trim(); if (!name) return
    const entry = { id: Math.random().toString(36).slice(2), name, from: newFrom[horse]||'', to: newTo[horse]||'' }
    setRiderConfig({ ...riderConfig, [horse]: [...(riderConfig[horse]||[]), entry] })
    setNewName(p => ({ ...p, [horse]:'' })); setNewFrom(p => ({ ...p, [horse]:'' })); setNewTo(p => ({ ...p, [horse]:'' }))
  }

  const si = { padding:'10px 12px', borderRadius:8, border:'1.5px solid #ede6d3', fontSize:'0.9rem', fontFamily:'Georgia,serif', color:'#3d2b1a', background:'#f7f2e8', outline:'none' }

  return (
    <div>
      <SectionTitle icon="⚙️" title="Inställningar" sub="Hantera ryttare per häst med start- och slutdatum" />
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {horseNames.map(horse => {
          const riders = riderConfig[horse] || []
          return (
            <div key={horse} style={{ background:'#fff', borderRadius:12, border:'1.5px solid #ede6d3', overflow:'hidden' }}>
              <div style={{ background:'linear-gradient(135deg,#2d4a2d,#4a6741)', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontFamily:'Georgia,serif', fontWeight:'bold', color:'#c8a96e', fontSize:'1rem' }}>{horse}</span>
                <span style={{ fontSize:'0.7rem', color:'rgba(200,169,110,0.7)' }}>{riders.filter(r => statusLabel(r).text==='Aktiv').length} aktiva</span>
              </div>
              <div style={{ padding:'12px 14px' }}>
                {riders.length === 0 && <p style={{ fontSize:'0.85rem', color:'#9a8a6a', fontStyle:'italic', marginBottom:10 }}>Inga ryttare tillagda.</p>}
                {riders.map(r => {
                  const st = statusLabel(r)
                  return (
                    <div key={r.id} style={{ padding:'10px 0', borderBottom:'1px solid #ede6d3' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:'0.92rem', fontWeight:'bold', color:'#3d2b1a', flex:1 }}>{r.name}</span>
                        <span style={{ fontSize:'0.68rem', fontWeight:'bold', color:st.color, background:st.bg, borderRadius:4, padding:'2px 8px' }}>{st.text}</span>
                        <button onClick={() => setRiderConfig({ ...riderConfig, [horse]: riders.filter(x => x.id !== r.id) })} style={{ background:'#fce8e8', border:'none', borderRadius:7, width:34, height:34, cursor:'pointer', fontSize:'0.9rem' }}>🗑️</button>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:'0.75rem', color:'#9a8a6a' }}>Från:</span>
                        <input type="date" value={r.from} onChange={e => setRiderConfig({ ...riderConfig, [horse]: riders.map(x => x.id===r.id ? { ...x, from: e.target.value } : x) })} style={{ ...si, flex:1, minWidth:130 }} />
                        <span style={{ fontSize:'0.75rem', color:'#9a8a6a' }}>Till:</span>
                        <input type="date" value={r.to} onChange={e => setRiderConfig({ ...riderConfig, [horse]: riders.map(x => x.id===r.id ? { ...x, to: e.target.value } : x) })} style={{ ...si, flex:1, minWidth:130 }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:14 }}>
                  <input value={newName[horse]||''} onChange={e => setNewName(p => ({ ...p, [horse]: e.target.value }))} placeholder="Namn på ny ryttare..." style={{ ...si, width:'100%' }} onKeyDown={e => e.key==='Enter' && addRider(horse)} />
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flex:'1 1 140px' }}>
                      <span style={{ fontSize:'0.75rem', color:'#8b6347', whiteSpace:'nowrap' }}>Från:</span>
                      <input type="date" value={newFrom[horse]||''} onChange={e => setNewFrom(p => ({ ...p, [horse]: e.target.value }))} style={{ ...si, flex:1 }} />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flex:'1 1 140px' }}>
                      <span style={{ fontSize:'0.75rem', color:'#8b6347', whiteSpace:'nowrap' }}>Till:</span>
                      <input type="date" value={newTo[horse]||''} onChange={e => setNewTo(p => ({ ...p, [horse]: e.target.value }))} style={{ ...si, flex:1 }} />
                    </div>
                  </div>
                  <button onClick={() => addRider(horse)} style={{ background:'#4a6741', color:'#fff', border:'none', borderRadius:9, padding:'12px 16px', cursor:'pointer', fontFamily:'Georgia,serif', fontSize:'0.92rem', fontWeight:'bold' }}>+ Lägg till ryttare</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
