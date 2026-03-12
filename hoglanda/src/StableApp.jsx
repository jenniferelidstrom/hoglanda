import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'

// ── Constants ──────────────────────────────────────────────
const C = {
  forest:'#2d4a2d', moss:'#4a6741', sage:'#7a9970',
  straw:'#c8a96e', cream:'#f7f2e8', parchment:'#ede6d3',
  earth:'#8b6347', bark:'#3d2b1a', gold:'#c49a2a', muted:'#9a8a6a',
}
const PASS = ['Utsläpp','Lunchfodring','Gå med Stella','Lägga in middag','Göra ny middag','Insläpp','Kvällsfodring']
const PASS_ICONS = ['🌅','🥕','🚶','🍽️','🔄','🏠','🌙']
const DAGAR = ['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag']
const PERSONER = ['Lars','Agneta','Jennifer','Linnea']
const TODAY = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'][new Date().getDay()]
const FODER_MEALS = ['Morgon','Lunch','Middag','Kväll']
const FODER_COLS = ['ho','kraft','mash','ovrigt']
const FODER_COL_LABELS = ['Hö','Kraft','Mash/Blötlagd','Övrig info']

const PADDOCK_SLOTS = []
for (let h = 7; h < 22; h++) {
  ['00','30'].forEach(m => {
    const start = String(h).padStart(2,'0') + ':' + m
    const [eh, em] = m === '00' ? [h,'30'] : [h+1,'00']
    const end = String(eh).padStart(2,'0') + ':' + String(em).padStart(2,'0')
    PADDOCK_SLOTS.push(start + '-' + end)
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

// ── Helpers ────────────────────────────────────────────────
function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0,0,0,0)
  return d
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
function formatDayLabel(d) {
  const days = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör']
  return d.getDate() + ' ' + ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][d.getMonth()] + ' ' + days[d.getDay()]
}
function dateKey(d) { return d.toISOString().slice(0,10) }
function emptySchedule() {
  const s = {}
  DAGAR.forEach(d => { s[d] = {}; PASS.forEach(p => { s[d][p] = [] }) })
  return s
}
function emptyActWeek(names) {
  const w = {}
  names.forEach(name => {
    w[name] = {}
    DAGAR.concat(['Övrigt']).forEach(d => { w[name][d] = { text:'', ansvarig:'' } })
  })
  return w
}
function emptyFoder(names) {
  const f = {}
  names.forEach(name => {
    f[name] = {}
    FODER_MEALS.forEach(m => { f[name][m] = { ho:'', kraft:'', mash:'', ovrigt:'' } })
  })
  return f
}
function buildInitialRiderConfig() {
  const cfg = {}
  INITIAL_HORSES.forEach(h => {
    cfg[h.name] = h.riders.map(name => ({ id: Math.random().toString(36).slice(2), name, from:'', to:'' }))
  })
  return cfg
}
function getActiveRiders(riderConfig, horseName, dateStr) {
  const list = riderConfig[horseName] || []
  return list.filter(r => {
    const after = !r.from || dateStr >= r.from
    const before = !r.to || dateStr <= r.to
    return after && before
  }).map(r => r.name)
}

// ── UI Components ──────────────────────────────────────────
const inp = { width:'100%', padding:'8px 10px', borderRadius:7, border:'1.5px solid '+C.parchment, fontSize:'0.82rem', fontFamily:'Georgia,serif', color:C.bark, background:C.cream, outline:'none' }

function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom:20 }}>
      <h2 style={{ fontFamily:'Georgia,serif', fontSize:'1.4rem', color:C.bark, display:'flex', alignItems:'center', gap:8, margin:0 }}>
        {icon} {title}
      </h2>
      {sub && <p style={{ color:C.muted, fontSize:'0.78rem', margin:'3px 0 0 28px' }}>{sub}</p>}
    </div>
  )
}
function WeekNav({ info, isNow, onPrev, onNext }) {
  const btn = { background:C.parchment, border:'none', borderRadius:8, width:34, height:34, fontSize:'1.1rem', cursor:'pointer', color:C.bark }
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', borderRadius:10, padding:'10px 14px', border:'1.5px solid '+C.parchment, marginBottom:16, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
      <button onClick={onPrev} style={btn}>‹</button>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontWeight:'bold', fontSize:'0.95rem', color:C.bark, fontFamily:'Georgia,serif' }}>
          {info.num}
          {isNow && <span style={{ marginLeft:8, background:C.moss, color:'#fff', borderRadius:4, padding:'1px 6px', fontSize:'0.62rem', verticalAlign:'middle' }}>DENNA VECKA</span>}
        </div>
        <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:2 }}>{info.dates}</div>
      </div>
      <button onClick={onNext} style={btn}>›</button>
    </div>
  )
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:13 }}>
      <label style={{ display:'block', fontSize:'0.72rem', color:C.earth, marginBottom:4, fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
      {children}
    </div>
  )
}
function SuccessBanner({ msg }) {
  return (
    <div style={{ background:'#e8f5e8', border:'1.5px solid '+C.moss, borderRadius:7, padding:'8px 12px', marginBottom:10, fontSize:'0.8rem', color:C.forest }}>✓ {msg}</div>
  )
}
function ReadOnly({ children }) {
  return <div style={{ opacity:0.5, pointerEvents:'none' }}>{children}</div>
}

function RiderPicker({ horseName, selected, onChange, riderConfig, readOnly }) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().slice(0,10)
  const riders = getActiveRiders(riderConfig, horseName, today)
  const sel = Array.isArray(selected) ? selected : (selected ? [selected] : [])
  function toggle(r) {
    if (readOnly) return
    onChange(sel.includes(r) ? sel.filter(x => x !== r) : sel.concat([r]))
  }
  return (
    <div style={{ position:'relative', borderTop:'1px dashed '+C.parchment }}>
      <button onClick={() => !readOnly && setOpen(o => !o)} style={{ width:'100%', background:'transparent', border:'none', padding:'2px 4px', textAlign:'left', cursor: readOnly ? 'default' : 'pointer', fontFamily:'Georgia,serif', fontSize:'0.62rem', color: sel.length ? C.earth : C.muted, fontStyle:'italic', outline:'none', display:'flex', flexWrap:'wrap', gap:2, minHeight:18 }}>
        {sel.length === 0 ? 'vem?' : sel.map(r => (
          <span key={r} style={{ background:C.earth, color:'#fff', borderRadius:3, padding:'0px 4px', fontSize:'0.58rem', fontStyle:'normal', fontWeight:'bold' }}>{r}</span>
        ))}
      </button>
      {open && (
        <div style={{ position:'absolute', bottom:'calc(100% + 2px)', left:0, zIndex:60, background:'#fff', border:'1.5px solid '+C.straw, borderRadius:8, padding:'6px', boxShadow:'0 4px 16px rgba(0,0,0,0.18)', minWidth:120, maxWidth:160 }}>
          {riders.length === 0 && <div style={{ fontSize:'0.72rem', color:C.muted, padding:'4px' }}>Inga aktiva ryttare</div>}
          {riders.map(r => (
            <label key={r} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px', cursor:'pointer', borderRadius:4, fontSize:'0.75rem', color:C.bark, background: sel.includes(r) ? '#f0f7ee' : 'transparent' }}>
              <input type="checkbox" checked={sel.includes(r)} onChange={() => toggle(r)} style={{ accentColor:C.moss, width:13, height:13 }} />
              {r}
            </label>
          ))}
          <button onClick={() => setOpen(false)} style={{ marginTop:4, width:'100%', padding:'3px', borderRadius:4, border:'1px solid '+C.parchment, background:C.parchment, fontSize:'0.65rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark }}>Stäng</button>
        </div>
      )}
    </div>
  )
}

// ── Saving indicator ───────────────────────────────────────
function SaveBadge({ saving }) {
  if (!saving) return null
  return <span style={{ fontSize:'0.7rem', color:C.muted, marginLeft:8 }}>💾 Sparar...</span>
}

// ── Main App ───────────────────────────────────────────────
export default function StableApp({ session, role, onSignOut }) {
  const isAdmin = role === 'admin'
  const [tab, setTab] = useState('schema')
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  // ── All app state ──
  const [horseNames, setHorseNames] = useState(INITIAL_HORSES.map(h => h.name))
  const [riderConfig, setRiderConfig] = useState(buildInitialRiderConfig())
  const [foderState, setFoderState] = useState(() => emptyFoder(INITIAL_HORSES.map(h => h.name)))

  const thisMonday = getMonday(new Date())
  const [schedMonday, setSchedMonday] = useState(thisMonday)
  const [allScheds, setAllScheds] = useState({ [weekKey(thisMonday)]: emptySchedule() })
  const [openCell, setOpenCell] = useState(null)
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

  // ── Load all data from Supabase ────────────────────────────
  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    setLoadingData(true)
    // Load app_data keys
    const { data } = await supabase.from('app_data').select('key, value')
    if (data) {
      data.forEach(row => {
        if (row.key === 'horseNames') setHorseNames(row.value)
        if (row.key === 'riderConfig') setRiderConfig(row.value)
        if (row.key === 'foderState') setFoderState(row.value)
        if (row.key === 'allScheds') setAllScheds(row.value)
        if (row.key === 'allActs') setAllActs(row.value)
        if (row.key === 'allPaddock') setAllPaddock(row.value)
      })
    }
    // Load stro log
    const { data: stroData } = await supabase.from('stro_log').select('*').order('created_at', { ascending: false })
    if (stroData) setStroLog(stroData.map(r => ({ id: r.id, name: r.name, item: r.item, amount: r.amount, date: r.date })))

    setLoadingData(false)
  }

  // ── Save helpers ───────────────────────────────────────────
  async function saveKey(key, value) {
    setSaving(true)
    await supabase.from('app_data').upsert({ key, value }, { onConflict: 'key' })
    setSaving(false)
  }

  // ── Schedule ───────────────────────────────────────────────
  function goSchedWeek(d) {
    setSchedMonday(prev => {
      const next = new Date(prev); next.setDate(prev.getDate() + d*7)
      const k = weekKey(next)
      if (!allScheds[k]) setAllScheds(s => Object.assign({}, s, { [k]: emptySchedule() }))
      return next
    })
  }
  async function togglePerson(dag, pass, person) {
    const week = allScheds[schedKey] || emptySchedule()
    const cur = (week[dag] && week[dag][pass]) || []
    const next = cur.includes(person) ? cur.filter(x => x !== person) : cur.concat([person])
    const newWeek = Object.assign({}, week, { [dag]: Object.assign({}, week[dag], { [pass]: next }) })
    const newAllScheds = Object.assign({}, allScheds, { [schedKey]: newWeek })
    setAllScheds(newAllScheds)
    await saveKey('allScheds', newAllScheds)
  }

  // ── Activity ───────────────────────────────────────────────
  function goActWeek(d) {
    setActOffset(o => {
      const next = o + d
      const nm = new Date(thisMonday); nm.setDate(nm.getDate() + next*7)
      const k = weekKey(nm)
      if (!allActs[k]) setAllActs(s => Object.assign({}, s, { [k]: emptyActWeek(horseNames) }))
      return next
    })
  }
  async function updateAct(horse, dag, field, val) {
    const week = allActs[actKey] || emptyActWeek(horseNames)
    const row = week[horse] || {}
    const cell = row[dag] || { text:'', ansvarig:'' }
    const newWeek = Object.assign({}, week, { [horse]: Object.assign({}, row, { [dag]: Object.assign({}, cell, { [field]: val }) }) })
    const newAllActs = Object.assign({}, allActs, { [actKey]: newWeek })
    setAllActs(newAllActs)
    await saveKey('allActs', newAllActs)
  }

  // ── Foder ──────────────────────────────────────────────────
  async function updateFoder(horse, meal, col, val) {
    const h = foderState[horse] || {}
    const m = h[meal] || { ho:'', kraft:'', mash:'', ovrigt:'' }
    const newFoder = Object.assign({}, foderState, { [horse]: Object.assign({}, h, { [meal]: Object.assign({}, m, { [col]: val }) }) })
    setFoderState(newFoder)
    await saveKey('foderState', newFoder)
  }

  // ── Paddock ────────────────────────────────────────────────
  function goMonth(delta) {
    setPaddockMonth(prev => {
      let m = prev.month + delta, y = prev.year
      if (m > 11) { m = 0; y++ }
      if (m < 0) { m = 11; y-- }
      return { year: y, month: m }
    })
  }
  async function setPaddockSlot(dateStr, slot, value) {
    const month = Object.assign({}, allPaddock[curMK] || {})
    const day = Object.assign({}, month[dateStr] || {})
    if (value === null) delete day[slot]; else day[slot] = value
    month[dateStr] = day
    const newAllPaddock = Object.assign({}, allPaddock, { [curMK]: month })
    setAllPaddock(newAllPaddock)
    await saveKey('allPaddock', newAllPaddock)
  }

  function cellKey(dateStr, slot) { return dateStr + '|' + slot }
  function onCellMouseDown(e, dk, slot) {
    e.preventDefault()
    const k = cellKey(dk, slot)
    isDragging.current = true
    visitedDrag.current = new Set([k])
    dragMode.current = selection.has(k) ? 'remove' : 'add'
    setSelection(prev => { const next = new Set(prev); dragMode.current === 'remove' ? next.delete(k) : next.add(k); return next })
  }
  function onCellMouseEnter(dk, slot) {
    if (!isDragging.current) return
    const k = cellKey(dk, slot)
    if (visitedDrag.current.has(k)) return
    visitedDrag.current.add(k)
    setSelection(prev => { const next = new Set(prev); dragMode.current === 'remove' ? next.delete(k) : next.add(k); return next })
  }
  function onDragEnd() { isDragging.current = false; visitedDrag.current = new Set() }

  function canBookDate(dateStr) {
    const deadline = new Date(dateStr)
    deadline.setDate(deadline.getDate() - 1)
    deadline.setHours(18,0,0,0)
    return new Date() < deadline
  }
  function selectionHasUnbookable() {
    for (const k of selection) { if (!canBookDate(k.split('|')[0])) return true }
    return false
  }
  function openBookModal() {
    if (selection.size === 0) return
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
    for (const k of selection) {
      const [ds, ...sp] = k.split('|')
      await setPaddockSlot(ds, sp.join('|'), null)
    }
    clearSelection()
  }

  // ── Strö ───────────────────────────────────────────────────
  async function submitStro() {
    if (!sForm.name) return
    const date = new Date().toISOString().slice(0,10)
    const { data } = await supabase.from('stro_log').insert({ name: sForm.name, item: sForm.item, amount: sForm.amount, date, user_id: session.user.id }).select().single()
    if (data) setStroLog(p => [{ id: data.id, name: data.name, item: data.item, amount: data.amount, date: data.date }, ...p])
    setSOk(true); setSForm({ name:'', item:'Stallströ', amount:1 })
    setTimeout(() => setSOk(false), 3000)
  }
  async function saveStroEdit() {
    await supabase.from('stro_log').update({ name: editData.name, item: editData.item, amount: editData.amount }).eq('id', editId)
    setStroLog(p => p.map(l => l.id === editId ? Object.assign({}, l, editData) : l))
    setEditId(null); setEditData(null)
  }
  async function deleteStro(id) {
    await supabase.from('stro_log').delete().eq('id', id)
    setStroLog(p => p.filter(l => l.id !== id))
  }

  // ── Settings saves ─────────────────────────────────────────
  async function saveHorseNames(names) {
    setHorseNames(names)
    await saveKey('horseNames', names)
  }
  async function saveRiderConfig(cfg) {
    setRiderConfig(cfg)
    await saveKey('riderConfig', cfg)
  }

  // ── Tab config (role-gated) ────────────────────────────────
  const TABS = [
    { id:'schema',    label:'Veckoschema',    icon:'📅' },
    { id:'stro',      label:'Strö/Pellets',   icon:'📦' },
    { id:'foder',     label:'Foderstater',    icon:'🌾' },
    { id:'aktivitet', label:'Hästaktivitet',  icon:'🐎' },
    { id:'settings',  label:'Inställningar',  icon:'⚙️', adminOnly: true },
    { id:'paddock',   label:'Paddockbokning', icon:'🏟️' },
  ].filter(t => !t.adminOnly || isAdmin)

  if (loadingData) {
    return (
      <div style={{ minHeight:'100vh', background:C.cream, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2rem', marginBottom:12 }}>🌿</div>
          <div style={{ color:C.moss, fontFamily:'Georgia,serif' }}>Laddar data...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:C.cream, fontFamily:'Georgia,serif' }}>
      {/* Header */}
      <header style={{ background:'linear-gradient(135deg,'+C.forest+','+C.moss+')', boxShadow:'0 4px 20px rgba(0,0,0,0.2)', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ padding:'14px 20px 10px', borderBottom:'2px solid rgba(200,169,110,0.4)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1.6rem' }}>🌿</span>
            <div>
              <h1 style={{ color:C.straw, fontSize:'1.3rem', fontWeight:'bold', margin:0 }}>Höglanda Hästgård</h1>
              <p style={{ color:'rgba(200,169,110,0.7)', fontSize:'0.65rem', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                {isAdmin ? '👑 Admin' : '🐴 Inackordering'} · {session.user.email}
                <SaveBadge saving={saving} />
              </p>
            </div>
          </div>
          <button onClick={onSignOut} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:7, padding:'5px 12px', color:C.straw, cursor:'pointer', fontSize:'0.72rem', fontFamily:'Georgia,serif' }}>
            Logga ut
          </button>
        </div>
        <nav style={{ display:'flex', overflowX:'auto', padding:'0 16px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 12px', color: tab===t.id ? C.straw : 'rgba(200,169,110,0.5)', borderBottom: tab===t.id ? '3px solid '+C.straw : '3px solid transparent', fontSize:'0.75rem', fontFamily:'Georgia,serif', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4, fontWeight: tab===t.id ? 'bold' : 'normal' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth:1200, margin:'0 auto', padding:'24px 14px' }}>

        {/* ── VECKOSCHEMA ── */}
        {tab === 'schema' && (
          <div>
            <SectionTitle icon="📅" title="Veckoschema" sub={isAdmin ? 'Klicka en cell för att välja ansvariga' : 'Skrivskyddat – kontakta admin för ändringar'} />
            <WeekNav info={weekLabel(schedMonday)} isNow={weekKey(schedMonday)===weekKey(thisMonday)} onPrev={() => goSchedWeek(-1)} onNext={() => goSchedWeek(1)} />
            <div style={{ overflowX:'auto' }}>
              <div style={{ minWidth:500 }}>
                <div style={{ display:'grid', gridTemplateColumns:'150px repeat(7,1fr)', gap:3, marginBottom:4 }}>
                  <div />
                  {DAGAR.map(d => (
                    <div key={d} style={{ textAlign:'center', fontSize:'0.68rem', fontWeight:'bold', color: d===TODAY ? C.moss : C.muted, textTransform:'uppercase', letterSpacing:'0.05em', padding:'3px 0', borderBottom: d===TODAY ? '2px solid '+C.moss : '2px solid transparent' }}>
                      {d===TODAY ? '• ' : ''}{d.slice(0,3)}
                    </div>
                  ))}
                </div>
                {PASS.map((pass, pi) => (
                  <div key={pass} style={{ display:'grid', gridTemplateColumns:'150px repeat(7,1fr)', gap:3, marginBottom:3 }}>
                    <div style={{ display:'flex', alignItems:'center', fontSize:'0.75rem', fontWeight:'bold', color:C.bark, paddingRight:6 }}>
                      {PASS_ICONS[pi]} {pass}
                    </div>
                    {DAGAR.map(dag => {
                      const val = (sched[dag] && sched[dag][pass]) || []
                      const isToday = dag === TODAY
                      const ck = dag + '|' + pass
                      const isOpen = openCell === ck
                      return (
                        <div key={dag} style={{ position:'relative' }}>
                          <button
                            onClick={() => isAdmin && setOpenCell(isOpen ? null : ck)}
                            style={{ width:'100%', minHeight:32, padding:'3px', borderRadius:6, fontFamily:'Georgia,serif', border:'1.5px solid '+(isToday ? C.moss : val.length ? C.straw : C.parchment), background: isToday ? '#f0f7ee' : val.length ? '#fffaf0' : '#fff', cursor: isAdmin ? 'pointer' : 'default', outline:'none', display:'flex', flexWrap:'wrap', gap:2, alignItems:'center', justifyContent:'center' }}>
                            {val.length === 0
                              ? <span style={{ fontSize:'0.6rem', color:C.muted }}>—</span>
                              : val.map(p => <span key={p} style={{ background:C.moss, color:'#fff', borderRadius:3, padding:'1px 4px', fontSize:'0.58rem', fontWeight:'bold' }}>{p.slice(0,1)}</span>)
                            }
                          </button>
                          {isOpen && isAdmin && (
                            <div style={{ position:'absolute', top:'calc(100% + 3px)', left:0, zIndex:50, background:'#fff', border:'1.5px solid '+C.straw, borderRadius:8, padding:'7px', boxShadow:'0 4px 16px rgba(0,0,0,0.15)', minWidth:105 }}>
                              {PERSONER.map(p => (
                                <label key={p} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px', cursor:'pointer', borderRadius:4, fontSize:'0.75rem', color:C.bark, background: val.includes(p) ? '#f0f7ee' : 'transparent' }}>
                                  <input type="checkbox" checked={val.includes(p)} onChange={() => togglePerson(dag, pass, p)} style={{ accentColor:C.moss, width:13, height:13 }} />
                                  {p}
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
          </div>
        )}

        {/* ── STRÖ ── */}
        {tab === 'stro' && (
          <div>
            <SectionTitle icon="📦" title="Logga Strö/Pellets" sub="Alla kan logga förbrukning" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              <div style={{ background:'#fff', borderRadius:12, padding:22, border:'1.5px solid '+C.parchment, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ color:C.bark, marginBottom:16, fontSize:'0.95rem' }}>Logga förbrukning</h3>
                <Field label="Ditt namn">
                  <input value={sForm.name} onChange={e => setSForm(f => Object.assign({}, f, { name: e.target.value }))} placeholder="Namn..." style={inp} />
                </Field>
                <Field label="Vad har du tagit?">
                  <div style={{ display:'flex', gap:8 }}>
                    {['Stallströ','Stallpellets'].map(item => (
                      <label key={item} style={{ flex:1, padding:'9px 10px', borderRadius:8, cursor:'pointer', border:'2px solid '+(sForm.item===item ? C.gold : C.parchment), background: sForm.item===item ? '#fdf6d8' : '#fff', display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem', color:C.bark }}>
                        <input type="radio" checked={sForm.item===item} onChange={() => setSForm(f => Object.assign({}, f, { item }))} style={{ display:'none' }} />
                        {item==='Stallströ' ? '🌿' : '⚪'} {item}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Antal säckar">
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <button onClick={() => setSForm(f => Object.assign({}, f, { amount: Math.max(1, f.amount-1) }))} style={Object.assign({}, inp, { width:34, padding:'6px', textAlign:'center', cursor:'pointer', background:C.parchment })}>−</button>
                    <span style={{ fontSize:'1.2rem', fontWeight:'bold', color:C.bark, minWidth:28, textAlign:'center' }}>{sForm.amount}</span>
                    <button onClick={() => setSForm(f => Object.assign({}, f, { amount: f.amount+1 }))} style={Object.assign({}, inp, { width:34, padding:'6px', textAlign:'center', cursor:'pointer', background:C.parchment })}>+</button>
                  </div>
                </Field>
                {sOk && <SuccessBanner msg={'Loggat: ' + sForm.amount + ' säckar!'} />}
                <button onClick={submitStro} style={{ width:'100%', padding:'10px', borderRadius:8, border:'none', background:C.gold, color:C.bark, fontFamily:'Georgia,serif', fontSize:'0.88rem', fontWeight:'bold', cursor:'pointer', marginTop:4 }}>Spara logg</button>
              </div>
              <div>
                <h3 style={{ color:C.bark, marginBottom:12, fontSize:'0.95rem' }}>Logghistorik</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {stroLog.map(l => (
                    <div key={l.id} style={{ background: editId===l.id ? '#fffaf0' : '#fff', border:'1.5px solid '+(editId===l.id ? C.gold : C.parchment), borderRadius:8, padding:'10px 12px' }}>
                      {editId===l.id ? (
                        <div>
                          <div style={{ display:'flex', gap:6, marginBottom:7, flexWrap:'wrap' }}>
                            <input value={editData.name} onChange={e => setEditData(d => Object.assign({}, d, { name: e.target.value }))} style={Object.assign({}, inp, { flex:1, minWidth:70, padding:'4px 7px', fontSize:'0.75rem' })} />
                            <select value={editData.item} onChange={e => setEditData(d => Object.assign({}, d, { item: e.target.value }))} style={Object.assign({}, inp, { flex:1, minWidth:100, padding:'4px 7px', fontSize:'0.75rem' })}>
                              <option>Stallströ</option><option>Stallpellets</option>
                            </select>
                            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <button onClick={() => setEditData(d => Object.assign({}, d, { amount: Math.max(1, d.amount-1) }))} style={{ background:C.parchment, border:'none', borderRadius:5, width:26, height:26, cursor:'pointer' }}>−</button>
                              <span style={{ fontWeight:'bold', color:C.bark, minWidth:18, textAlign:'center' }}>{editData.amount}</span>
                              <button onClick={() => setEditData(d => Object.assign({}, d, { amount: d.amount+1 }))} style={{ background:C.parchment, border:'none', borderRadius:5, width:26, height:26, cursor:'pointer' }}>+</button>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:7 }}>
                            <button onClick={saveStroEdit} style={{ flex:1, padding:'6px', borderRadius:6, border:'none', background:C.moss, color:'#fff', cursor:'pointer', fontSize:'0.75rem', fontFamily:'Georgia,serif', fontWeight:'bold' }}>Spara</button>
                            <button onClick={() => setEditId(null)} style={{ flex:1, padding:'6px', borderRadius:6, border:'1px solid '+C.parchment, background:'#fff', cursor:'pointer', fontSize:'0.75rem', fontFamily:'Georgia,serif' }}>Avbryt</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div>
                            <span style={{ fontWeight:'bold', fontSize:'0.82rem', color:C.bark }}>{l.name}</span>
                            <span style={{ color:C.muted, fontSize:'0.75rem' }}> · {l.item}</span>
                            <div style={{ fontSize:'0.67rem', color:C.muted, marginTop:2 }}>{l.date}</div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:'0.85rem', fontWeight:'bold', color:C.earth }}>{l.amount} säck{l.amount>1?'ar':''}</span>
                            <button onClick={() => { setEditId(l.id); setEditData({ name:l.name, item:l.item, amount:l.amount }) }} style={{ background:C.parchment, border:'none', borderRadius:5, width:28, height:28, cursor:'pointer', fontSize:'0.8rem' }}>✏️</button>
                            {isAdmin && <button onClick={() => deleteStro(l.id)} style={{ background:'#fce8e8', border:'none', borderRadius:5, width:28, height:28, cursor:'pointer', fontSize:'0.8rem' }}>🗑️</button>}
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

        {/* ── FODERSTATER ── */}
        {tab === 'foder' && (
          <div>
            <SectionTitle icon="🌾" title="Foderstater" sub={isAdmin ? 'Fyll i foderstat per häst' : 'Skrivskyddat'} />
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {horseNames.map(name => {
                const hf = foderState[name] || {}
                return (
                  <div key={name} style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:'1.5px solid '+C.parchment, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ background:'#3d1f10', padding:'10px 18px', display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Namn:</span>
                      <span style={{ fontFamily:'Georgia,serif', fontWeight:'bold', color:'#fff', fontSize:'1.1rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>{name}</span>
                    </div>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:C.parchment }}>
                          <th style={{ padding:'8px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.06em', color:C.bark, width:110 }}>Mål</th>
                          {FODER_COL_LABELS.map(l => (
                            <th key={l} style={{ padding:'8px 10px', textAlign:'left', fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.06em', color:C.bark, borderLeft:'1px solid '+C.cream }}>{l}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {FODER_MEALS.map((meal, mi) => {
                          const row = hf[meal] || { ho:'', kraft:'', mash:'', ovrigt:'' }
                          return (
                            <tr key={meal} style={{ background: mi%2===0 ? '#fff' : C.cream, borderBottom:'1px solid '+C.parchment }}>
                              <td style={{ padding:'8px 14px', verticalAlign:'middle' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                                  <span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid '+C.muted, flexShrink:0, display:'inline-block' }} />
                                  <span style={{ fontSize:'0.78rem', fontWeight:'bold', color:C.bark }}>{meal}</span>
                                </div>
                              </td>
                              {FODER_COLS.map(col => (
                                <td key={col} style={{ padding:'4px 6px', borderLeft:'1px solid '+C.parchment, verticalAlign:'top' }}>
                                  <textarea
                                    value={row[col]}
                                    onChange={e => isAdmin && updateFoder(name, meal, col, e.target.value)}
                                    readOnly={!isAdmin}
                                    placeholder="—"
                                    rows={2}
                                    style={{ width:'100%', padding:'3px 5px', fontSize:'0.75rem', border:'none', background:'transparent', resize:'none', fontFamily:'Georgia,serif', color:C.bark, outline:'none', lineHeight:1.5, minWidth:80, cursor: isAdmin ? 'text' : 'default' }}
                                  />
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── HÄSTAKTIVITET ── */}
        {tab === 'aktivitet' && (
          <div>
            <SectionTitle icon="🐎" title="Hästaktivitet" sub={isAdmin ? 'Veckans aktiviteter per häst' : 'Skrivskyddat'} />
            <WeekNav info={weekLabel(actMonday)} isNow={actOffset===0} onPrev={() => goActWeek(-1)} onNext={() => goActWeek(1)} />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                <thead>
                  <tr style={{ background:'linear-gradient(135deg,'+C.forest+','+C.moss+')' }}>
                    <th style={{ padding:'9px 12px', textAlign:'left', color:C.straw, fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.06em', width:85 }}>Häst</th>
                    {DAGAR.map(d => (
                      <th key={d} style={{ padding:'9px 6px', textAlign:'center', fontSize:'0.68rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.04em', color: d===TODAY ? C.gold : C.straw, borderLeft:'1px solid rgba(255,255,255,0.1)' }}>
                        {d.slice(0,3)}{d===TODAY ? ' •' : ''}
                      </th>
                    ))}
                    <th style={{ padding:'9px 6px', textAlign:'center', color:C.straw, fontSize:'0.68rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.04em', borderLeft:'1px solid rgba(255,255,255,0.1)' }}>Övrigt</th>
                  </tr>
                </thead>
                <tbody>
                  {horseNames.map((name, hi) => (
                    <tr key={hi} style={{ background: hi%2===0 ? '#fff' : C.cream }}>
                      <td style={{ padding:'5px 8px', borderBottom:'1px solid '+C.parchment, verticalAlign:'top', paddingTop:9 }}>
                        <input
                          value={name}
                          onChange={e => isAdmin && saveHorseNames(horseNames.map((n,j) => j===hi ? e.target.value : n))}
                          readOnly={!isAdmin}
                          style={{ width:'100%', background:'transparent', border:'none', borderBottom:'1px dashed '+C.parchment, outline:'none', fontFamily:'Georgia,serif', fontWeight:'bold', color:C.bark, fontSize:'0.82rem', padding:'2px 0', cursor: isAdmin ? 'text' : 'default' }}
                        />
                      </td>
                      {DAGAR.concat(['Övrigt']).map(dag => {
                        const cell = (actGrid[name] && actGrid[name][dag]) || { text:'', ansvarig:'' }
                        const isToday = dag === TODAY
                        return (
                          <td key={dag} style={{ padding:'3px', borderBottom:'1px solid '+C.parchment, borderLeft:'1px solid '+C.parchment, background: isToday ? 'rgba(74,103,65,0.04)' : 'transparent', verticalAlign:'top', minWidth:85 }}>
                            <textarea
                              value={cell.text}
                              onChange={e => isAdmin && updateAct(name, dag, 'text', e.target.value)}
                              readOnly={!isAdmin}
                              placeholder="—"
                              rows={2}
                              style={{ width:'100%', padding:'3px 4px', fontSize:'0.67rem', border:'none', background:'transparent', resize:'none', fontFamily:'Georgia,serif', color:C.bark, outline:'none', lineHeight:1.4 }}
                            />
                            {dag !== 'Övrigt' && (
                              <RiderPicker
                                horseName={name}
                                selected={cell.ansvarig || []}
                                onChange={val => updateAct(name, dag, 'ansvarig', val)}
                                riderConfig={riderConfig}
                                readOnly={!isAdmin}
                              />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── INSTÄLLNINGAR (admin only) ── */}
        {tab === 'settings' && isAdmin && (
          <SettingsTab riderConfig={riderConfig} setRiderConfig={saveRiderConfig} horseNames={horseNames} />
        )}

        {/* ── PADDOCKBOKNING ── */}
        {tab === 'paddock' && (
          <div>
            <SectionTitle icon="🏟️" title="Paddockbokning" sub="Klicka och dra för att markera tidsfält – grön = ok att rida bredvid, röd = ensam" />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', borderRadius:10, padding:'10px 16px', border:'1.5px solid '+C.parchment, marginBottom:16, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              <button onClick={() => goMonth(-1)} style={{ background:C.parchment, border:'none', borderRadius:8, width:34, height:34, fontSize:'1.1rem', cursor:'pointer', color:C.bark }}>‹</button>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontWeight:'bold', fontSize:'1rem', color:C.bark, fontFamily:'Georgia,serif' }}>
                  {['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'][paddockMonth.month]} {paddockMonth.year}
                </div>
                {paddockMonth.year===now.getFullYear() && paddockMonth.month===now.getMonth() && (
                  <div style={{ fontSize:'0.7rem', color:C.moss, marginTop:2, fontWeight:'bold' }}>Aktuell månad</div>
                )}
              </div>
              <button onClick={() => goMonth(1)} style={{ background:C.parchment, border:'none', borderRadius:8, width:34, height:34, fontSize:'1.1rem', cursor:'pointer', color:C.bark }}>›</button>
            </div>

            {selection.size > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:10, background:C.bark, borderRadius:10, padding:'10px 16px', marginBottom:12, flexWrap:'wrap' }}>
                <span style={{ color:C.straw, fontSize:'0.82rem', fontWeight:'bold' }}>{selection.size} tidsfält valda</span>
                <button onClick={openBookModal} style={{ background: selectionHasUnbookable() ? C.muted : C.moss, color:'#fff', border:'none', borderRadius:7, padding:'6px 14px', cursor:'pointer', fontFamily:'Georgia,serif', fontWeight:'bold', fontSize:'0.8rem' }}>✏️ Boka valda</button>
                {(isAdmin || true) && <button onClick={deleteMultiBooking} style={{ background:'#c62828', color:'#fff', border:'none', borderRadius:7, padding:'6px 14px', cursor:'pointer', fontFamily:'Georgia,serif', fontWeight:'bold', fontSize:'0.8rem' }}>🗑️ Ta bort valda</button>}
                {selectionHasUnbookable() && <span style={{ fontSize:'0.72rem', color:'#ffcc80' }}>⚠️ Bokningstid passerad för vissa fält</span>}
                <button onClick={clearSelection} style={{ background:'transparent', color:C.straw, border:'1px solid rgba(200,169,110,0.4)', borderRadius:7, padding:'6px 14px', cursor:'pointer', fontFamily:'Georgia,serif', fontSize:'0.8rem' }}>Avmarkera</button>
              </div>
            )}

            <div style={{ overflowX:'auto', borderRadius:10, border:'1.5px solid '+C.parchment, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }} onMouseLeave={onDragEnd} onMouseUp={onDragEnd}>
              <table style={{ borderCollapse:'collapse', minWidth: 80 + PADDOCK_SLOTS.length * 52 }}>
                <thead>
                  <tr style={{ background:'linear-gradient(135deg,'+C.forest+','+C.moss+')', position:'sticky', top:0, zIndex:10 }}>
                    <th style={{ padding:'8px 12px', textAlign:'left', color:C.straw, fontSize:'0.68rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap', position:'sticky', left:0, background:C.forest, zIndex:11, minWidth:90 }}>Datum</th>
                    {PADDOCK_SLOTS.map(s => (
                      <th key={s} style={{ padding:'6px 3px', textAlign:'center', color:C.straw, fontSize:'0.55rem', fontWeight:'bold', borderLeft:'1px solid rgba(255,255,255,0.08)', whiteSpace:'nowrap', minWidth:50 }}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getDaysInMonth(paddockMonth.year, paddockMonth.month).map((day, di) => {
                    const dk = dateKey(day)
                    const isToday = dk === dateKey(now)
                    const daySlots = paddockGrid[dk] || {}
                    return (
                      <tr key={dk} style={{ background: isToday ? 'rgba(74,103,65,0.06)' : di%2===0 ? '#fff' : C.cream }}>
                        <td style={{ padding:'5px 10px', fontSize:'0.72rem', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? C.moss : C.bark, whiteSpace:'nowrap', borderBottom:'1px solid '+C.parchment, position:'sticky', left:0, background: isToday ? '#f0f7ee' : di%2===0 ? '#fff' : C.cream, zIndex:5, borderRight:'1.5px solid '+C.parchment }}>
                          {formatDayLabel(day)}{isToday ? ' ●' : ''}
                        </td>
                        {PADDOCK_SLOTS.map(slot => {
                          const booking = daySlots[slot]
                          const ck = cellKey(dk, slot)
                          const isSel = selection.has(ck)
                          const bookable = canBookDate(dk)
                          return (
                            <td key={slot}
                              onMouseDown={e => onCellMouseDown(e, dk, slot)}
                              onMouseEnter={() => onCellMouseEnter(dk, slot)}
                              onMouseUp={onDragEnd}
                              style={{ padding:'2px', borderLeft:'1px solid '+C.parchment, borderBottom:'1px solid '+C.parchment, cursor:'pointer', minWidth:50, height:32, userSelect:'none', outline: isSel ? '2px solid #1976d2' : 'none', outlineOffset:'-2px', position:'relative', opacity: !bookable && !booking ? 0.45 : 1 }}>
                              {booking ? (
                                <div style={{ background: isSel ? (booking.type==='grön' ? '#81c784' : '#e57373') : (booking.type==='grön' ? '#c8e6c9' : '#ffcdd2'), borderRadius:4, height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>
                                  <span style={{ fontSize:'0.6rem', fontWeight:'bold', color: booking.type==='grön' ? '#2d6a2d' : '#c62828', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:44 }}>{booking.name}</span>
                                </div>
                              ) : (
                                <div style={{ background: isSel ? 'rgba(25,118,210,0.15)' : 'transparent', borderRadius:4, height:'100%' }} />
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

            {bookModal && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setBookModal(false)}>
                <div style={{ background:C.cream, borderRadius:14, padding:24, maxWidth:340, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', border:'1.5px solid '+C.straw }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ color:C.bark, fontFamily:'Georgia,serif', marginBottom:4, fontSize:'1rem' }}>Boka {selection.size} tidsfält</h3>
                  <p style={{ fontSize:'0.75rem', color:C.muted, marginBottom:16 }}>Samma namn och typ gäller för alla valda fält.</p>
                  <Field label="Namn">
                    <input value={bookName} onChange={e => setBookName(e.target.value)} placeholder="Ditt namn..." style={inp} autoFocus />
                  </Field>
                  <Field label="Typ">
                    <div style={{ display:'flex', gap:10 }}>
                      {['grön','röd'].map(t => (
                        <label key={t} style={{ flex:1, padding:'9px 10px', borderRadius:8, cursor:'pointer', border:'2px solid '+(bookType===t ? (t==='grön' ? '#4a7c41' : '#c62828') : C.parchment), background: bookType===t ? (t==='grön' ? '#e8f5e8' : '#fce8e8') : '#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:'0.8rem', fontWeight:'bold', color: t==='grön' ? '#2d6a2d' : '#c62828' }}>
                          <input type="radio" checked={bookType===t} onChange={() => setBookType(t)} style={{ display:'none' }} />
                          {t==='grön' ? '🟢 Ok att rida bredvid' : '🔴 Ensam'}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <div style={{ display:'flex', gap:8, marginTop:6 }}>
                    <button onClick={saveMultiBooking} style={{ flex:2, padding:'10px', borderRadius:8, border:'none', background:C.moss, color:'#fff', fontFamily:'Georgia,serif', fontWeight:'bold', cursor:'pointer', fontSize:'0.88rem' }}>Spara</button>
                    <button onClick={() => setBookModal(false)} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid '+C.parchment, background:'#fff', fontFamily:'Georgia,serif', cursor:'pointer', fontSize:'0.88rem', color:C.bark }}>Avbryt</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={{ textAlign:'center', padding:'20px', color:C.muted, fontSize:'0.72rem', borderTop:'1px solid '+C.parchment, marginTop:20 }}>
        🌿 Höglanda Hästgård · Stallapp
      </footer>
    </div>
  )
}

// ── Settings Tab ───────────────────────────────────────────
function SettingsTab({ riderConfig, setRiderConfig, horseNames }) {
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
    const name = (newName[horse] || '').trim()
    if (!name) return
    const entry = { id: Math.random().toString(36).slice(2), name, from: newFrom[horse] || '', to: newTo[horse] || '' }
    const newCfg = Object.assign({}, riderConfig, { [horse]: (riderConfig[horse] || []).concat([entry]) })
    setRiderConfig(newCfg)
    setNewName(p => Object.assign({}, p, { [horse]: '' }))
    setNewFrom(p => Object.assign({}, p, { [horse]: '' }))
    setNewTo(p => Object.assign({}, p, { [horse]: '' }))
  }
  function removeRider(horse, id) {
    setRiderConfig(Object.assign({}, riderConfig, { [horse]: riderConfig[horse].filter(r => r.id !== id) }))
  }
  function updateRider(horse, id, field, val) {
    setRiderConfig(Object.assign({}, riderConfig, { [horse]: riderConfig[horse].map(r => r.id === id ? Object.assign({}, r, { [field]: val }) : r) }))
  }

  const si = { padding:'4px 7px', borderRadius:5, border:'1.5px solid #ede6d3', fontSize:'0.75rem', fontFamily:'Georgia,serif', color:'#3d2b1a', background:'#f7f2e8', outline:'none' }

  return (
    <div>
      <SectionTitle icon="⚙️" title="Inställningar" sub="Hantera ryttare per häst med start- och slutdatum" />
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {horseNames.map(horse => {
          const riders = riderConfig[horse] || []
          return (
            <div key={horse} style={{ background:'#fff', borderRadius:12, border:'1.5px solid #ede6d3', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ background:'linear-gradient(135deg,#2d4a2d,#4a6741)', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontFamily:'Georgia,serif', fontWeight:'bold', color:'#c8a96e', fontSize:'1rem' }}>{horse}</span>
                <span style={{ fontSize:'0.7rem', color:'rgba(200,169,110,0.7)' }}>{riders.filter(r => statusLabel(r).text==='Aktiv').length} aktiva</span>
              </div>
              <div style={{ padding:'12px 16px' }}>
                {riders.length === 0 && <p style={{ fontSize:'0.78rem', color:'#9a8a6a', fontStyle:'italic', marginBottom:10 }}>Inga ryttare tillagda.</p>}
                {riders.map(r => {
                  const st = statusLabel(r)
                  return (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid #ede6d3', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'0.8rem', fontWeight:'bold', color:'#3d2b1a', minWidth:90, flex:'0 0 auto' }}>{r.name}</span>
                      <span style={{ fontSize:'0.62rem', fontWeight:'bold', color:st.color, background:st.bg, borderRadius:4, padding:'1px 6px', flexShrink:0 }}>{st.text}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', flex:1 }}>
                        <span style={{ fontSize:'0.68rem', color:'#9a8a6a' }}>Från:</span>
                        <input type="date" value={r.from} onChange={e => updateRider(horse, r.id, 'from', e.target.value)} style={Object.assign({}, si, { width:130 })} />
                        <span style={{ fontSize:'0.68rem', color:'#9a8a6a' }}>Till:</span>
                        <input type="date" value={r.to} onChange={e => updateRider(horse, r.id, 'to', e.target.value)} style={Object.assign({}, si, { width:130 })} />
                      </div>
                      <button onClick={() => removeRider(horse, r.id)} style={{ background:'#fce8e8', border:'none', borderRadius:5, width:26, height:26, cursor:'pointer', fontSize:'0.8rem', flexShrink:0 }}>🗑️</button>
                    </div>
                  )
                })}
                <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap', alignItems:'flex-end' }}>
                  <div style={{ flex:'1 1 110px' }}>
                    <div style={{ fontSize:'0.65rem', color:'#8b6347', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:'bold' }}>Namn</div>
                    <input value={newName[horse]||''} onChange={e => setNewName(p => Object.assign({}, p, { [horse]: e.target.value }))} placeholder="Namn..." style={Object.assign({}, si, { width:'100%' })} onKeyDown={e => e.key==='Enter' && addRider(horse)} />
                  </div>
                  <div style={{ flex:'0 0 auto' }}>
                    <div style={{ fontSize:'0.65rem', color:'#8b6347', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:'bold' }}>Från</div>
                    <input type="date" value={newFrom[horse]||''} onChange={e => setNewFrom(p => Object.assign({}, p, { [horse]: e.target.value }))} style={Object.assign({}, si, { width:130 })} />
                  </div>
                  <div style={{ flex:'0 0 auto' }}>
                    <div style={{ fontSize:'0.65rem', color:'#8b6347', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:'bold' }}>Till</div>
                    <input type="date" value={newTo[horse]||''} onChange={e => setNewTo(p => Object.assign({}, p, { [horse]: e.target.value }))} style={Object.assign({}, si, { width:130 })} />
                  </div>
                  <button onClick={() => addRider(horse)} style={{ background:'#4a6741', color:'#fff', border:'none', borderRadius:7, padding:'6px 14px', cursor:'pointer', fontFamily:'Georgia,serif', fontSize:'0.78rem', fontWeight:'bold', flexShrink:0 }}>+ Lägg till</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
