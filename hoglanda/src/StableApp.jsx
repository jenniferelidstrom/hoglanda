import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'

const C = {
  forest:'#2d4a2d', moss:'#4a6741', sage:'#7a9970',
  straw:'#c8a96e', cream:'#f7f2e8', parchment:'#ede6d3',
  earth:'#8b6347', bark:'#3d2b1a', gold:'#c49a2a', muted:'#9a8a6a',
}
const PASS = ['Utsläpp','Lunchfodring','Gå med Stella','Lägga in middag','Göra ny middag','Insläpp','Kvällsfodring']
const PASS_ICONS = ['🌅','🥕','🚶','🍽️','🔄','🏠','🌙']
const ADMIN_ONLY_PASS = ['Gå med Stella','Lägga in middag','Göra ny middag']
const DAGAR = ['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag']
const DAGAR_SHORT = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön']
const PERSONER = ['Lars','Agneta','Jennifer','Linnea']
const TODAY_DATE = stockholmDateStr()
const TODAY = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'][weekdayIndexFromDateStr(TODAY_DATE)]
const FODER_MEALS = ['Morgon','Lunch','Middag','Kväll']
const FODER_COLS = ['ho','kraft','mash','ovrigt']
const FODER_COL_LABELS = ['Hö','Kraft','Mash/Blötlagd','Övrig info']
const MONTHS_SV = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December']
const MONTHS_SHORT = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec']

const HO_AMOUNTS = []
for (let kg = 0.25; kg <= 30; kg += 0.25) HO_AMOUNTS.push(Math.round(kg * 100) / 100)

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
  { name:'Celma',   riders:[] },
  { name:'Charina', riders:['Linnea'] },
  { name:'Hippo',   riders:['Linnea'] },
  { name:'Storm',   riders:['Linnea','Märtha','Alva/Agnes'] },
  { name:'Skye',    riders:['Linnea','Sofie','Frida','Cornelia'] },
  { name:'Joker',   riders:['Linnea','Julia'] },
  { name:'Maggan',  riders:['Linnea','Mollie','Sigrid','Freja'] },
  { name:'Lova',    riders:['Jennifer','Lova','Linnea'] },
  { name:'Selma',   riders:[] },
  { name:'Spot',    riders:[] },
  { name:'Spotty',  riders:[] },
]
const ACTIVITY_HORSE_ORDER = ['Hippo','Charina','Calle','Joker','Maggan','Skye','Storm','Lova','Celma','Selma','Spot','Spotty']

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640)
    window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}
function stockholmNowParts() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date())
  const pick = type => parts.find(p => p.type === type)?.value || '00'
  return { year: +pick('year'), month: +pick('month'), day: +pick('day'), hour: +pick('hour'), minute: +pick('minute'), second: +pick('second') }
}
function stockholmDateStr() {
  const p = stockholmNowParts()
  return p.year + '-' + String(p.month).padStart(2,'0') + '-' + String(p.day).padStart(2,'0')
}
function stockholmNowDate() {
  const p = stockholmNowParts()
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
}
function weekdayIndexFromDateStr(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}
function getMonday(date) {
  const d = new Date(date); const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0,0,0,0); return d
}
function localDateStr(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') }
function weekKey(monday) { return localDateStr(monday) }
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
function dateKey(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') }
function emptySchedule() {
  const s = {}; DAGAR.forEach(d => { s[d] = {}; PASS.forEach(p => { s[d][p] = [] }) }); return s
}
function defaultSchedule() {
  const s = emptySchedule()
  s['Måndag']['Utsläpp'] = ['Lars','Jennifer']
  s['Tisdag']['Utsläpp'] = ['Lars','Agneta','Linnea']
  s['Onsdag']['Utsläpp'] = ['Lars','Linnea']
  s['Torsdag']['Utsläpp'] = ['Lars','Agneta','Linnea']
  s['Fredag']['Utsläpp'] = ['Lars','Jennifer']
  s['Måndag']['Lunchfodring'] = ['Lars']
  s['Tisdag']['Lunchfodring'] = ['Agneta']
  s['Onsdag']['Lunchfodring'] = ['Linnea']
  s['Torsdag']['Lunchfodring'] = ['Agneta']
  s['Fredag']['Lunchfodring'] = ['Lars']
  s['Måndag']['Gå med Stella'] = ['Lars']
  s['Tisdag']['Gå med Stella'] = ['Agneta']
  s['Onsdag']['Gå med Stella'] = ['Linnea']
  s['Torsdag']['Gå med Stella'] = ['Agneta']
  s['Fredag']['Gå med Stella'] = ['Lars']
  DAGAR.forEach(d => { s[d]['Kvällsfodring'] = ['Agneta','Linnea'] })
  return s
}
function isWeekEmpty(week) {
  return DAGAR.every(d => PASS.every(p => !(week[d]?.[p]?.length)))
}
function applyDefaultsToScheds(scheds) {
  const result = { ...scheds }
  Object.keys(result).forEach(k => { if (isWeekEmpty(result[k])) result[k] = defaultSchedule() })
  return result
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
function fmtKg(v) { return Number.isInteger(v) ? v + ' kg' : v + ' kg' }

function exportCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
}

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
  const ref = useRef(null)
  const riders = getActiveRiders(riderConfig, horseName, TODAY_DATE)
  const sel = Array.isArray(selected) ? selected : (selected ? [selected] : [])
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  return (
    <div ref={ref} style={{ position:'relative', borderTop:'1px dashed '+C.parchment, marginTop:2 }}>
      <button onClick={() => !readOnly && setOpen(o => !o)} style={{ width:'100%', background:'transparent', border:'none', padding:'3px 4px', textAlign:'left', cursor: readOnly ? 'default' : 'pointer', fontFamily:'Georgia,serif', fontSize:'0.65rem', color: sel.length ? C.earth : C.muted, fontStyle:'italic', outline:'none', display:'flex', flexWrap:'wrap', gap:2, minHeight:20 }}>
        {sel.length === 0 ? 'vem?' : sel.map(r => <span key={r} style={{ background:C.earth, color:'#fff', borderRadius:3, padding:'1px 5px', fontSize:'0.6rem', fontStyle:'normal', fontWeight:'bold' }}>{r}</span>)}
      </button>
      {open && (
        <div style={{ position:'fixed', zIndex:9999, background:'#fff', border:'1.5px solid '+C.straw, borderRadius:10, padding:'10px', boxShadow:'0 8px 24px rgba(0,0,0,0.18)', minWidth:160, maxHeight:260, overflowY:'auto',
          top: ref.current ? ref.current.getBoundingClientRect().bottom + 4 : 0,
          left: ref.current ? Math.min(ref.current.getBoundingClientRect().left, window.innerWidth - 180) : 0
        }}>
          {riders.length === 0 && <div style={{ fontSize:'0.78rem', color:C.muted, padding:'4px' }}>Inga aktiva ryttare</div>}
          {riders.map(r => (
            <label key={r} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 4px', cursor:'pointer', borderRadius:6, fontSize:'0.88rem', color:C.bark, background: sel.includes(r) ? '#f0f7ee' : 'transparent' }}>
              <input type="checkbox" checked={sel.includes(r)} onChange={() => onChange(sel.includes(r) ? sel.filter(x => x !== r) : [...sel, r])} style={{ accentColor:C.moss, width:17, height:17 }} />{r}
            </label>
          ))}
          <button onClick={() => setOpen(false)} style={{ marginTop:6, width:'100%', padding:'6px', borderRadius:6, border:'1px solid '+C.parchment, background:C.parchment, fontSize:'0.75rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark }}>Stäng</button>
        </div>
      )}
    </div>
  )
}

export default function StableApp({ session, role, onSignOut }) {
  const isAdmin = role === 'admin'
  const isRyttare = role === 'medryttare'
  const isMobile = useIsMobile()
  const userId = session.user.id
  const userEmail = session.user.email
  const [tab, setTab] = useState('schema')
  const [menuOpen, setMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const [horseNames, setHorseNames] = useState(INITIAL_HORSES.map(h => h.name))
  const [riderConfig, setRiderConfig] = useState(buildInitialRiderConfig())
  const [foderState, setFoderState] = useState(() => emptyFoder(INITIAL_HORSES.map(h => h.name)))

  const thisMonday = getMonday(stockholmNowDate())
  const thisWeekKey = weekKey(thisMonday)
  const [schedMonday, setSchedMonday] = useState(thisMonday)
  const [allScheds, setAllScheds] = useState({ [thisWeekKey]: defaultSchedule() })
  const [openCell, setOpenCell] = useState(null)
  const todayIdx = DAGAR.indexOf(TODAY)
  const [schedDayIdx, setSchedDayIdx] = useState(todayIdx >= 0 ? todayIdx : 0)
  const schedKey = weekKey(schedMonday)
  const sched = allScheds[schedKey] || defaultSchedule()
  const isThisWeek = schedKey === thisWeekKey

  const [actOffset, setActOffset] = useState(0)
  const actMonday = (() => { const d = new Date(thisMonday); d.setDate(d.getDate() + actOffset*7); return d })()
  const actKey = weekKey(actMonday)
  const [allActs, setAllActs] = useState({ [actKey]: emptyActWeek(INITIAL_HORSES.map(h => h.name)) })
  const actGrid = allActs[actKey] || emptyActWeek(horseNames)

  const now = stockholmNowDate()
  const [paddockMonth, setPaddockMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [allPaddock, setAllPaddock] = useState({})
  const curMK = monthKey(paddockMonth.year, paddockMonth.month)
  const paddockGrid = allPaddock[curMK] || {}

  const [stroLog, setStroLog] = useState([])
  const [sForm, setSForm] = useState({ stroAmount:0, pelletsAmount:0, horse:'' })
  const [sOk, setSOk] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState(null)

  const [hoLog, setHoLog] = useState([])
  const [hoForm, setHoForm] = useState({ item:'Hö', amount:1.0, date: TODAY_DATE, horse:'' })
  const [hoOk, setHoOk] = useState(false)
  const [hoEditId, setHoEditId] = useState(null)
  const [hoEditData, setHoEditData] = useState(null)
  const [userHorses, setUserHorses] = useState(null)
  const [stroFilterHorses, setStroFilterHorses] = useState([])
  const [hoFilterHorses, setHoFilterHorses] = useState([])
  const [foderFilterHorses, setFoderFilterHorses] = useState([])
  const [actFilterHorses, setActFilterHorses] = useState([])

  const [dagbokEntries, setDagbokEntries] = useState([])
  const [dagbokHorse, setDagbokHorse] = useState('')
  const [dagbokOffset, setDagbokOffset] = useState(0)
  const dagbokMonday = (() => { const d = new Date(thisMonday); d.setDate(d.getDate() + dagbokOffset * 7); return d })()
  const dagbokWeekKey = weekKey(dagbokMonday)
  const isDagbokThisWeek = dagbokWeekKey === thisWeekKey
  const [dagbokDayIdx, setDagbokDayIdx] = useState(todayIdx >= 0 ? todayIdx : 0)
  const [dagbokEditDay, setDagbokEditDay] = useState(null)

  const [selection, setSelection] = useState(new Set())
  const isDragging = useRef(false)
  const dragMode = useRef('add')
  const dragStart = useRef(null)
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
      if (row.key === 'allScheds') setAllScheds(applyDefaultsToScheds(row.value))
      if (row.key === 'allActs') setAllActs(row.value)
      if (row.key === 'allPaddock') setAllPaddock(row.value)
    })
    let myHorses = []
    if (!isAdmin) {
      const { data: uh } = await supabase.from('user_horses').select('horse').eq('user_id', userId)
      if (uh && uh.length > 0) { myHorses = uh.map(r => r.horse).sort(); setUserHorses(myHorses) }
      else setUserHorses(null)
    }
    const stroQuery = isAdmin
      ? supabase.from('stro_log').select('*').order('created_at', { ascending: false })
      : supabase.from('stro_log').select('*').in('horse', myHorses.length > 0 ? myHorses : ['']).order('created_at', { ascending: false })
    const { data: s } = await stroQuery
    if (s) setStroLog(s.map(r => ({ id:r.id, name:r.name, item:r.item, amount:r.amount, date:r.date, user_id:r.user_id, horse:r.horse||'' })))
    const hoQuery = isAdmin
      ? supabase.from('ho_log').select('*').order('date', { ascending: false })
      : supabase.from('ho_log').select('*').in('horse', myHorses.length > 0 ? myHorses : ['']).order('date', { ascending: false })
    const { data: h } = await hoQuery
    if (h) setHoLog(h.map(r => ({ id:r.id, name:r.name, item:r.item, amount:r.amount, date:r.date, user_id:r.user_id, horse:r.horse||'' })))
    const { data: db } = await supabase.from('dagbok').select('*').order('date', { ascending: false })
    if (db) setDagbokEntries(db)
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
      if (!allScheds[k]) setAllScheds(s => ({ ...s, [k]: defaultSchedule() }))
      return next
    })
  }
  async function togglePerson(dag, pass, person) {
    const week = allScheds[schedKey] || emptySchedule()
    const cur = week[dag]?.[pass] || []
    const next = cur.includes(person) ? cur.filter(x => x !== person) : [...cur, person]
    const ns = { ...allScheds, [schedKey]: { ...week, [dag]: { ...week[dag], [pass]: next } } }
    setAllScheds(ns); await saveKey('allScheds', ns)
  }
  async function updateInslappTid(dag, tid) {
    const week = allScheds[schedKey] || emptySchedule()
    const ns = { ...allScheds, [schedKey]: { ...week, [dag]: { ...week[dag], Insläpp_tid: tid } } }
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
  const cellKey = (ds, slot) => ds + '|' + slot
  function toggleCell(dk, slot) {
    const k = cellKey(dk, slot)
    setSelection(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  }
  function onCellMouseDown(e, dk, slot) {
    e.preventDefault(); const k = cellKey(dk, slot)
    isDragging.current = true; visitedDrag.current = new Set([k])
    dragStart.current = { dk, slot }
    dragMode.current = selection.has(k) ? 'remove' : 'add'
    setSelection(prev => { const n = new Set(prev); dragMode.current === 'remove' ? n.delete(k) : n.add(k); return n })
  }
  function onCellMouseEnter(dk, slot) {
    if (!isDragging.current) return
    const start = dragStart.current
    if (start && dk !== start.dk) return
    const k = cellKey(dk, slot)
    if (visitedDrag.current.has(k)) return; visitedDrag.current.add(k)
    setSelection(prev => { const n = new Set(prev); dragMode.current === 'remove' ? n.delete(k) : n.add(k); return n })
  }
  function onDragEnd() { isDragging.current = false; visitedDrag.current = new Set(); dragStart.current = null }
  function canBookDate(ds) {
    const parts = ds.split('-'); const d = new Date(+parts[0], +parts[1]-1, +parts[2])
    d.setDate(d.getDate()-1); d.setHours(18,0,0,0)
    return stockholmNowDate() < d
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
    const updates = {}
    for (const k of selection) {
      const [ds, ...sp] = k.split('|'); const slot = sp.join('|')
      if (canBookDate(ds)) {
        if (!updates[ds]) updates[ds] = {}
        updates[ds][slot] = { name: bookName.trim(), type: bookType, userId }
      }
    }
    const month = { ...(allPaddock[curMK] || {}) }
    Object.entries(updates).forEach(([ds, slots]) => { month[ds] = { ...(month[ds] || {}), ...slots } })
    const np = { ...allPaddock, [curMK]: month }
    setAllPaddock(np); await saveKey('allPaddock', np); clearSelection()
  }
  async function deleteMultiBooking() {
    const month = { ...(allPaddock[curMK] || {}) }
    for (const k of selection) {
      const [ds, ...sp] = k.split('|'); const slot = sp.join('|')
      const day = { ...(month[ds] || {}) }; delete day[slot]; month[ds] = day
    }
    const np = { ...allPaddock, [curMK]: month }
    setAllPaddock(np); await saveKey('allPaddock', np); clearSelection()
  }

  async function submitStro() {
    if (!sForm.horse) return
    if (sForm.stroAmount === 0 && sForm.pelletsAmount === 0) return
    const name = userEmail.split('@')[0]
    const date = sForm.date || TODAY_DATE
    const inserts = []
    if (sForm.stroAmount > 0) inserts.push({ name, item:'Stallströ', amount:sForm.stroAmount, date, user_id:userId, horse:sForm.horse })
    if (sForm.pelletsAmount > 0) inserts.push({ name, item:'Stallpellets', amount:sForm.pelletsAmount, date, user_id:userId, horse:sForm.horse })
    const { data } = await supabase.from('stro_log').insert(inserts).select()
    if (data) setStroLog(p => [...data.map(r => ({ id:r.id, name:r.name, item:r.item, amount:r.amount, date:r.date, user_id:r.user_id, horse:r.horse||'' })), ...p])
    setSOk(true); setSForm({ stroAmount:0, pelletsAmount:0, horse:'' }); setTimeout(() => setSOk(false), 3000)
  }
  async function saveStroEdit() {
    await supabase.from('stro_log').update({ name:editData.name, item:editData.item, amount:editData.amount, horse:editData.horse||'' }).eq('id', editId)
    setStroLog(p => p.map(l => l.id === editId ? { ...l, ...editData } : l)); setEditId(null); setEditData(null)
  }
  async function deleteStro(id) {
    const { error } = await supabase.from('stro_log').delete().eq('id', id)
    if (error) { alert('Kunde inte ta bort: ' + error.message); return }
    setStroLog(p => p.filter(l => l.id !== id))
  }

  async function submitHo() {
    if (!hoForm.amount || !hoForm.horse) return
    const name = userEmail.split('@')[0]
    const { data } = await supabase.from('ho_log').insert({ name, item:hoForm.item, amount:hoForm.amount, date:hoForm.date, user_id:userId, horse:hoForm.horse }).select().single()
    if (data) setHoLog(p => [{ id:data.id, name:data.name, item:data.item, amount:data.amount, date:data.date, user_id:data.user_id, horse:data.horse||'' }, ...p].sort((a,b) => b.date.localeCompare(a.date)))
    setHoOk(true); setHoForm(f => ({ ...f, amount:1.0, date:TODAY_DATE, horse:'' })); setTimeout(() => setHoOk(false), 3000)
  }
  async function saveHoEdit() {
    await supabase.from('ho_log').update({ item:hoEditData.item, amount:hoEditData.amount, date:hoEditData.date, horse:hoEditData.horse||'' }).eq('id', hoEditId)
    setHoLog(p => p.map(l => l.id === hoEditId ? { ...l, ...hoEditData } : l)); setHoEditId(null); setHoEditData(null)
  }
  async function deleteHo(id) {
    const { error } = await supabase.from('ho_log').delete().eq('id', id)
    if (error) { alert('Kunde inte ta bort: ' + error.message); return }
    setHoLog(p => p.filter(l => l.id !== id))
  }

  async function saveHorseNames(names) { setHorseNames(names); await saveKey('horseNames', names) }
  async function saveRiderConfig(cfg) { setRiderConfig(cfg); await saveKey('riderConfig', cfg) }

  async function saveDagbokEntry(horse, date, vad, kandes, ovrigt) {
    const existing = dagbokEntries.find(e => e.horse === horse && e.date === date)
    if (existing) {
      await supabase.from('dagbok').update({ vad, kandes, ovrigt, user_id: userId, name: userEmail.split('@')[0] }).eq('id', existing.id)
      setDagbokEntries(p => p.map(e => e.id === existing.id ? { ...e, vad, kandes, ovrigt, user_id: userId, name: userEmail.split('@')[0] } : e))
    } else {
      const name = userEmail.split('@')[0]
      const { data } = await supabase.from('dagbok').insert({ horse, date, vad, kandes, ovrigt, user_id: userId, name }).select().single()
      if (data) setDagbokEntries(p => [data, ...p].sort((a,b) => b.date.localeCompare(a.date)))
    }
  }
  async function deleteDagbokEntry(id) {
    await supabase.from('dagbok').delete().eq('id', id)
    setDagbokEntries(p => p.filter(e => e.id !== id))
  }

  const foderHorses = (userHorses ? horseNames.filter(n => userHorses.includes(n)) : horseNames).slice().sort((a,b) => a.localeCompare(b, 'sv'))
  const foderLabel = foderHorses.length === 1 ? 'Foderstat' : 'Foderstater'
  const TABS = [
    { id:'schema',    label:'Schema',      icon:'📅' },
    { id:'aktivitet', label:'Aktiviteter', icon:'🐎', notInackordering: true },
    { id:'dagbok',    label:'Dagbok',      icon:'📓' },
    { id:'paddock',   label:'Paddock',     icon:'🏟️' },
    { id:'foder',     label:foderLabel,    icon:'🍽️' },
    { id:'stro',      label:'Strö',        icon:'📦' },
    { id:'ho',        label:'Hö',          icon:'🌾' },
    { id:'settings',  label:'Inställning', icon:'⚙️', adminOnly: true },
    { id:'export',    label:'Export',      icon:'📊', adminOnly: true },
  ].filter(t => (!t.adminOnly || isAdmin) && (!t.notInackordering || isAdmin || isRyttare))


  if (loadingData) return (
    <div style={{ minHeight:'100vh', background:C.cream, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:'2.5rem', marginBottom:12 }}>🌿</div><div style={{ color:C.moss, fontFamily:'Georgia,serif' }}>Laddar...</div></div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.cream, fontFamily:'Georgia,serif', paddingBottom: isMobile ? 72 : 0 }}>

      <header style={{ background:'linear-gradient(135deg,'+C.forest+','+C.moss+')', boxShadow:'0 4px 20px rgba(0,0,0,0.2)', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ padding: isMobile ? '10px 14px 8px' : '14px 20px 10px', borderBottom:'2px solid rgba(200,169,110,0.4)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {isMobile && (
              <button onClick={() => setMenuOpen(!menuOpen)} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:7, padding:'7px 10px', color:C.straw, cursor:'pointer', fontSize:'1.2rem', lineHeight:1 }}>☰</button>
            )}
            <span style={{ fontSize: isMobile ? '1.3rem' : '1.6rem' }}>🌿</span>
            <div>
              <h1 style={{ color:C.straw, fontSize: isMobile ? '1rem' : '1.3rem', fontWeight:'bold', margin:0 }}>Höglanda Hästgård</h1>
              <p style={{ color:'rgba(200,169,110,0.65)', fontSize:'0.6rem', margin:0, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                {isAdmin ? '👑 Admin' : isRyttare ? '🏇 Medryttare' : '🐴 Inackordering'}{!isMobile && ' · ' + userEmail}<SaveBadge saving={saving} />
              </p>
            </div>
          </div>
          <button onClick={onSignOut} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(200,169,110,0.3)', borderRadius:7, padding: isMobile ? '7px 11px' : '5px 14px', color:C.straw, cursor:'pointer', fontSize: isMobile ? '0.78rem' : '0.75rem', fontFamily:'Georgia,serif' }}>
            Logga ut
          </button>
        </div>
        {!isMobile && (
          <nav style={{ display:'flex', overflowX:'auto', padding:'0 16px' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 14px', color: tab===t.id ? C.straw : 'rgba(200,169,110,0.5)', borderBottom: tab===t.id ? '3px solid '+C.straw : '3px solid transparent', fontSize:'0.78rem', fontFamily:'Georgia,serif', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5, fontWeight: tab===t.id ? 'bold' : 'normal' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
        )}
        {isMobile && menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position:'fixed', inset:0, zIndex:40 }} />
            <div style={{ position:'relative', zIndex:50, background:C.forest, borderBottom:'2px solid rgba(200,169,110,0.3)', padding:'6px 0' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => { setTab(t.id); setMenuOpen(false) }} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', background: tab===t.id ? 'rgba(200,169,110,0.15)' : 'none', border:'none', cursor:'pointer', padding:'12px 16px', color: tab===t.id ? C.straw : 'rgba(200,169,110,0.7)', fontSize:'0.88rem', fontFamily:'Georgia,serif', fontWeight: tab===t.id ? 'bold' : 'normal', textAlign:'left', borderTop:'1px solid rgba(200,169,110,0.08)', WebkitTapHighlightColor:'transparent' }}>
                    <span style={{ fontSize:'1.1rem' }}>{t.icon}</span> {t.label}
                    {tab===t.id && <span style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:C.straw, flexShrink:0 }} />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </header>

      <main style={{ maxWidth:1200, margin:'0 auto', padding: isMobile ? '14px 12px' : '24px 16px' }}>

        {tab === 'schema' && (
          <div>
            <SectionTitle icon="📅" title="Veckoschema" sub={isAdmin ? 'Klicka en cell för att välja ansvariga' : 'Skrivskyddat'} />
            <WeekNav info={weekLabel(schedMonday)} isNow={isThisWeek} onPrev={() => goSchedWeek(-1)} onNext={() => goSchedWeek(1)} />
            {isMobile ? (
              <div>
                <div style={{ display:'flex', gap:5, marginBottom:12, overflowX:'auto', paddingBottom:2 }}>
                  {DAGAR.map((d, i) => {
                    const isSel = i === schedDayIdx
                    const isToday = isThisWeek && d === TODAY
                    return (
                      <button key={d} onClick={() => setSchedDayIdx(i)} style={{ flex:'0 0 auto', padding:'7px 12px', borderRadius:20, border:'none', background: isSel ? C.forest : isToday ? '#e8f5e8' : C.parchment, color: isSel ? C.straw : isToday ? C.moss : C.bark, fontFamily:'Georgia,serif', fontWeight: isSel || isToday ? 'bold' : 'normal', fontSize:'0.8rem', cursor:'pointer' }}>
                        {DAGAR_SHORT[i]}{isToday ? ' •' : ''}
                      </button>
                    )
                  })}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {PASS.map((pass, pi) => {
                    if (!isAdmin && ADMIN_ONLY_PASS.includes(pass)) return null
                    const dag = DAGAR[schedDayIdx]
                    const val = sched[dag]?.[pass] || []
                    const ck = dag+'|'+pass; const isOpen = openCell === ck
                    return (
                      <div key={pass} style={{ background:'#fff', borderRadius:10, border:'1.5px solid '+(val.length ? C.straw : C.parchment), position:'relative' }}>
                        <button onClick={() => isAdmin && setOpenCell(isOpen ? null : ck)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 15px', background:'transparent', border:'none', cursor: isAdmin ? 'pointer' : 'default', fontFamily:'Georgia,serif', outline:'none' }}>
                          <span style={{ fontSize:'0.9rem', fontWeight:'bold', color:C.bark }}>{PASS_ICONS[pi]} {pass}</span>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'flex-end', maxWidth:'55%' }}>
                            {val.length === 0
                              ? <span style={{ fontSize:'0.78rem', color:C.muted, fontStyle:'italic' }}>—</span>
                              : val.map(p => <span key={p} style={{ background:C.moss, color:'#fff', borderRadius:5, padding:'3px 9px', fontSize:'0.75rem', fontWeight:'bold' }}>{p}</span>)
                            }
                          </div>
                        </button>
                        {pass === 'Insläpp' && (
                          <div style={{ padding:'0 15px 10px' }}>
                            <input type="time" value={sched[dag]?.Insläpp_tid || ''} onChange={e => updateInslappTid(dag, e.target.value)} style={{ fontFamily:'Georgia,serif', fontSize:'0.8rem', padding:'4px 8px', borderRadius:6, border:'1px solid '+C.parchment, background:C.cream, color:C.bark, width:'100%' }} />
                          </div>
                        )}
                        {isOpen && isAdmin && (
                          <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:50, background:'#fff', border:'1.5px solid '+C.straw, borderRadius:10, padding:'10px', boxShadow:'0 8px 24px rgba(0,0,0,0.18)', minWidth:170 }}>
                            {PERSONER.map(p => (
                              <label key={p} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 6px', cursor:'pointer', borderRadius:6, fontSize:'0.92rem', color:C.bark, background: val.includes(p) ? '#f0f7ee' : 'transparent' }}>
                                <input type="checkbox" checked={val.includes(p)} onChange={() => togglePerson(dag, pass, p)} style={{ accentColor:C.moss, width:18, height:18 }} />{p}
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
                <table style={{ width:'100%', minWidth:900, borderCollapse:'separate', borderSpacing:3, tableLayout:'fixed' }}>
                  <colgroup>
                    <col style={{ width:150 }} />
                    {DAGAR.map(d => <col key={d} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th />
                      {DAGAR.map(d => {
                        const highlight = isThisWeek && d === TODAY
                        return <th key={d} style={{ textAlign:'center', fontSize:'0.68rem', fontWeight:'bold', color: highlight ? C.moss : C.muted, textTransform:'uppercase', letterSpacing:'0.05em', padding:'3px 0', borderBottom: highlight ? '2px solid '+C.moss : '2px solid transparent' }}>{highlight?'• ':''}{d.slice(0,3)}</th>
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const visiblePasses = PASS.filter(p => isAdmin || !ADMIN_ONLY_PASS.includes(p));
                      return visiblePasses.map((pass, vi) => {
                        const pi = PASS.indexOf(pass);
                        const isBottomRow = vi >= visiblePasses.length - 4;
                        return (
                          <tr key={pass}>
                            <td style={{ fontSize:'0.75rem', fontWeight:'bold', color:C.bark, paddingRight:6, whiteSpace:'nowrap' }}>{PASS_ICONS[pi]} {pass}</td>
                            {DAGAR.map(dag => {
                              const val = sched[dag]?.[pass] || [];
                              const highlight = isThisWeek && dag === TODAY;
                              const ck = dag+'|'+pass; const isOpen = openCell===ck;
                              return (
                                <td key={dag} style={{ position:'relative', padding:0 }}>
                                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, width:'100%' }}>
                                    <button onClick={() => isAdmin && setOpenCell(isOpen ? null : ck)} style={{ width:'100%', minHeight:32, padding:'3px', borderRadius:6, fontFamily:'Georgia,serif', border:'1.5px solid '+(highlight ? C.moss : val.length ? C.straw : C.parchment), background: highlight ? '#f0f7ee' : val.length ? '#fffaf0' : '#fff', cursor: isAdmin ? 'pointer' : 'default', outline:'none', display:'flex', flexWrap:'wrap', gap:2, alignItems:'center', justifyContent:'center' }}>
                                      {val.length === 0 ? <span style={{ fontSize:'0.6rem', color:C.muted }}>—</span> : val.map(p => <span key={p} style={{ background:C.moss, color:'#fff', borderRadius:3, padding:'1px 5px', fontSize:'0.58rem', fontWeight:'bold' }}>{p}</span>)}
                                    </button>
                                    {pass === 'Insläpp' && <input type="time" value={sched[dag]?.Insläpp_tid || ''} onClick={e => e.stopPropagation()} onChange={e => updateInslappTid(dag, e.target.value)} style={{ fontFamily:'Georgia,serif', fontSize:'0.6rem', padding:'1px 3px', borderRadius:4, border:'1px solid '+C.parchment, background:C.cream, color:C.bark, width:'100%', textAlign:'center' }} />}
                                  </div>
                                  {isOpen && isAdmin && (
                                    <div style={{ position:'absolute', [isBottomRow ? 'bottom' : 'top']:'calc(100% + 3px)', left:0, zIndex:50, background:'#fff', border:'1.5px solid '+C.straw, borderRadius:8, padding:'7px', boxShadow:'0 4px 16px rgba(0,0,0,0.15)', minWidth:105 }}>
                                      {PERSONER.map(p => (
                                        <label key={p} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px', cursor:'pointer', borderRadius:4, fontSize:'0.75rem', color:C.bark, background: val.includes(p) ? '#f0f7ee' : 'transparent' }}>
                                          <input type="checkbox" checked={val.includes(p)} onChange={() => togglePerson(dag, pass, p)} style={{ accentColor:C.moss, width:13, height:13 }} />{p}
                                        </label>
                                      ))}
                                      <button onClick={() => setOpenCell(null)} style={{ marginTop:5, width:'100%', padding:'3px', borderRadius:4, border:'1px solid '+C.parchment, background:C.parchment, fontSize:'0.68rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark }}>Stäng</button>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'stro' && (
          <div>
            <SectionTitle icon="📦" title="Logga Strö/Pellets" sub={isAdmin ? 'Admin ser alla loggar' : 'Du ser bara dina egna loggar'} />
            <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 16 : 22, border:'1.5px solid '+C.parchment, marginBottom:16 }}>
              <h3 style={{ color:C.bark, marginBottom:16, fontSize:'1rem' }}>Logga förbrukning</h3>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
                <Field label="Häst">
                  <select value={sForm.horse} onChange={e => setSForm(f => ({ ...f, horse: e.target.value }))} style={{ ...inp, width:'100%' }}>
                    <option value="">Välj häst...</option>
                    {(userHorses || HORSES_SORTED).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </Field>
                <Field label="Datum">
                  <input type="date" value={sForm.date || TODAY_DATE} onChange={e => setSForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                </Field>
                <Field label="🌿 Stallströ (balar)">
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={() => setSForm(f => ({ ...f, stroAmount: Math.max(0, f.stroAmount-1) }))} style={{ width:46, height:46, borderRadius:9, border:'1.5px solid '+C.parchment, background:C.parchment, fontSize:'1.4rem', cursor:'pointer' }}>−</button>
                    <span style={{ fontSize:'1.5rem', fontWeight:'bold', color: sForm.stroAmount > 0 ? C.bark : C.muted, minWidth:32, textAlign:'center' }}>{sForm.stroAmount}</span>
                    <button onClick={() => setSForm(f => ({ ...f, stroAmount: f.stroAmount+1 }))} style={{ width:46, height:46, borderRadius:9, border:'1.5px solid '+C.parchment, background:C.parchment, fontSize:'1.4rem', cursor:'pointer' }}>+</button>
                  </div>
                </Field>
                <Field label="⚪ Stallpellets (säckar)">
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={() => setSForm(f => ({ ...f, pelletsAmount: Math.max(0, f.pelletsAmount-1) }))} style={{ width:46, height:46, borderRadius:9, border:'1.5px solid '+C.parchment, background:C.parchment, fontSize:'1.4rem', cursor:'pointer' }}>−</button>
                    <span style={{ fontSize:'1.5rem', fontWeight:'bold', color: sForm.pelletsAmount > 0 ? C.bark : C.muted, minWidth:32, textAlign:'center' }}>{sForm.pelletsAmount}</span>
                    <button onClick={() => setSForm(f => ({ ...f, pelletsAmount: f.pelletsAmount+1 }))} style={{ width:46, height:46, borderRadius:9, border:'1.5px solid '+C.parchment, background:C.parchment, fontSize:'1.4rem', cursor:'pointer' }}>+</button>
                  </div>
                </Field>
              </div>
              {sOk && <div style={{ background:'#e8f5e8', border:'1.5px solid '+C.moss, borderRadius:8, padding:'10px 14px', marginBottom:12, marginTop:12, fontSize:'0.9rem', color:C.forest }}>✓ Loggat!</div>}
              <button onClick={submitStro} disabled={sForm.stroAmount===0 && sForm.pelletsAmount===0} style={{ width:'100%', padding:'14px', borderRadius:9, border:'none', background: (sForm.stroAmount > 0 || sForm.pelletsAmount > 0) ? C.gold : C.parchment, color:C.bark, fontFamily:'Georgia,serif', fontSize:'1rem', fontWeight:'bold', cursor: (sForm.stroAmount > 0 || sForm.pelletsAmount > 0) ? 'pointer' : 'default', marginTop:12, opacity: (sForm.stroAmount > 0 || sForm.pelletsAmount > 0) ? 1 : 0.5 }}>Spara logg</button>
            </div>
            {isAdmin && (
              <div style={{ background:'#fff', borderRadius:12, padding:'14px 18px', border:'1.5px solid '+C.parchment, marginBottom:16 }}>
                <div style={{ fontSize:'0.78rem', color:C.muted, marginBottom:8, fontWeight:'bold', textTransform:'uppercase' }}>Filtrera på häst</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  <button onClick={() => setStroFilterHorses([])} style={{ padding:'6px 12px', borderRadius:20, border:'1.5px solid '+(stroFilterHorses.length===0 ? C.moss : C.parchment), background: stroFilterHorses.length===0 ? '#e8f5e8' : '#fff', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Georgia,serif', color: stroFilterHorses.length===0 ? C.forest : C.bark, fontWeight: stroFilterHorses.length===0 ? 'bold' : 'normal' }}>Alla</button>
                  {HORSES_SORTED.map(h => {
                    const active = stroFilterHorses.includes(h)
                    return <button key={h} onClick={() => setStroFilterHorses(prev => active ? prev.filter(x=>x!==h) : [...prev, h])} style={{ padding:'6px 12px', borderRadius:20, border:'1.5px solid '+(active ? C.moss : C.parchment), background: active ? '#e8f5e8' : '#fff', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Georgia,serif', color: active ? C.forest : C.bark, fontWeight: active ? 'bold' : 'normal' }}>🐴 {h}</button>
                  })}
                </div>
              </div>
            )}
            {(() => {
              const filtered = stroFilterHorses.length > 0 ? stroLog.filter(l => stroFilterHorses.includes(l.horse)) : stroLog
              const stroTotal = filtered.filter(l => l.item === 'Stallströ').reduce((s, l) => s + l.amount, 0)
              const pelletsTotal = filtered.filter(l => l.item === 'Stallpellets').reduce((s, l) => s + l.amount, 0)
              return (
                <>
                  <div style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
                    <div style={{ background:'#fff', borderRadius:10, padding:'10px 16px', border:'1.5px solid '+C.parchment, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:'0.78rem', color:C.muted }}>🌿 Stallströ:</span>
                      <span style={{ fontWeight:'bold', color:C.bark, fontSize:'1rem' }}>{stroTotal} bal{stroTotal !== 1 ? 'ar' : ''}</span>
                    </div>
                    <div style={{ background:'#fff', borderRadius:10, padding:'10px 16px', border:'1.5px solid '+C.parchment, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:'0.78rem', color:C.muted }}>⚪ Stallpellets:</span>
                      <span style={{ fontWeight:'bold', color:C.bark, fontSize:'1rem' }}>{pelletsTotal} säck{pelletsTotal !== 1 ? 'ar' : ''}</span>
                    </div>
                  </div>
                  <h3 style={{ color:C.bark, marginBottom:12, fontSize:'1rem' }}>Logghistorik {!isAdmin && <span style={{ fontSize:'0.72rem', color:C.muted, fontWeight:'normal' }}>(bara dina)</span>}{isAdmin && stroFilterHorses.length > 0 && <span style={{ fontSize:'0.72rem', color:C.moss, fontWeight:'normal' }}> ({stroFilterHorses.join(', ')})</span>}</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {filtered.map(l => (
                      <div key={l.id} style={{ background: editId===l.id ? '#fffaf0' : '#fff', border:'1.5px solid '+(editId===l.id ? C.gold : C.parchment), borderRadius:10, padding:'13px 14px' }}>
                        {editId===l.id ? (
                          <div>
                            <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                              <input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} style={{ ...inp, flex:1, minWidth:80 }} />
                              <select value={editData.item} onChange={e => setEditData(d => ({ ...d, item: e.target.value }))} style={{ ...inp, flex:1, minWidth:110 }}>
                                <option>Stallströ</option><option>Stallpellets</option>
                              </select>
                              <select value={editData.horse||''} onChange={e => setEditData(d => ({ ...d, horse: e.target.value }))} style={{ ...inp, flex:1, minWidth:100 }}>
                                <option value="">Välj häst...</option>
                                {(userHorses || HORSES_SORTED).map(h => <option key={h} value={h}>{h}</option>)}
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
                              <span style={{ fontWeight:'bold', fontSize:'0.95rem', color:C.bark }}>{l.horse ? '🐴 '+l.horse : l.name}</span>
                              <span style={{ color:C.muted, fontSize:'0.75rem' }}> · {l.item}{l.horse ? ' · '+l.name : ''}</span>
                              <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>{l.date}</div>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:'0.95rem', fontWeight:'bold', color:C.earth }}>{l.amount} {l.item==='Stallströ' ? (l.amount>1?'balar':'bal') : (l.amount>1?'säckar':'säck')}</span>
                              <button onClick={() => { setEditId(l.id); setEditData({ name:l.name, item:l.item, amount:l.amount, horse:l.horse||'' }) }} style={{ background:C.parchment, border:'none', borderRadius:7, width:36, height:36, cursor:'pointer', fontSize:'0.9rem' }}>✏️</button>
                              {isAdmin && <button onClick={() => deleteStro(l.id)} style={{ background:'#fce8e8', border:'none', borderRadius:7, width:36, height:36, cursor:'pointer', fontSize:'0.9rem' }}>🗑️</button>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {filtered.length === 0 && <p style={{ color:C.muted, fontStyle:'italic', fontSize:'0.85rem' }}>Inga loggar{stroFilterHorses.length > 0 ? ' för vald häst' : ' ännu'}.</p>}
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {tab === 'ho' && (
          <HoTab isAdmin={isAdmin} isMobile={isMobile} hoLog={hoLog} hoForm={hoForm} setHoForm={setHoForm} hoOk={hoOk}
            hoEditId={hoEditId} setHoEditId={setHoEditId} hoEditData={hoEditData} setHoEditData={setHoEditData}
            submitHo={submitHo} saveHoEdit={saveHoEdit} deleteHo={deleteHo} allowedHorses={userHorses}
            filterHorses={hoFilterHorses} setFilterHorses={setHoFilterHorses} />
        )}

        {tab === 'foder' && (
          <div>
            <SectionTitle icon="🍽️" title={foderLabel} sub={isAdmin ? 'Fyll i foderstat per häst' : 'Du ser din hästs foderstat'} />
            {isAdmin && (
              <div style={{ background:'#fff', borderRadius:12, padding:'14px 18px', border:'1.5px solid '+C.parchment, marginBottom:16 }}>
                <div style={{ fontSize:'0.78rem', color:C.muted, marginBottom:8, fontWeight:'bold', textTransform:'uppercase' }}>Filtrera på häst</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  <button onClick={() => setFoderFilterHorses([])} style={{ padding:'6px 12px', borderRadius:20, border:'1.5px solid '+(foderFilterHorses.length===0 ? C.moss : C.parchment), background: foderFilterHorses.length===0 ? '#e8f5e8' : '#fff', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Georgia,serif', color: foderFilterHorses.length===0 ? C.forest : C.bark, fontWeight: foderFilterHorses.length===0 ? 'bold' : 'normal' }}>Alla</button>
                  {HORSES_SORTED.map(h => {
                    const active = foderFilterHorses.includes(h)
                    return <button key={h} onClick={() => setFoderFilterHorses(prev => active ? prev.filter(x=>x!==h) : [...prev, h])} style={{ padding:'6px 12px', borderRadius:20, border:'1.5px solid '+(active ? C.moss : C.parchment), background: active ? '#e8f5e8' : '#fff', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Georgia,serif', color: active ? C.forest : C.bark, fontWeight: active ? 'bold' : 'normal' }}>🐴 {h}</button>
                  })}
                </div>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {(foderFilterHorses.length > 0 ? foderHorses.filter(n => foderFilterHorses.includes(n)) : foderHorses).map(name => {
                const hf = foderState[name] || {}
                const canEdit = isAdmin || (userHorses && userHorses.includes(name))
                return (
                  <div key={name} style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:'1.5px solid '+C.parchment }}>
                    <div style={{ background:'#3d1f10', padding:'10px 16px' }}>
                      <span style={{ fontFamily:'Georgia,serif', fontWeight:'bold', color:'#fff', fontSize:'1rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>{name}</span>
                    </div>
                    {isMobile ? (
                      <div style={{ padding:'10px 0 12px' }}>
                        <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:8 }} id={'dots-'+name}>
                          {FODER_MEALS.map((meal, mi) => (
                            <div key={meal} style={{ width:6, height:6, borderRadius:'50%', background: mi===0 ? C.moss : C.parchment, transition:'background 0.2s' }} />
                          ))}
                        </div>
                        <div
                          style={{ display:'flex', overflowX:'auto', scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', msOverflowStyle:'none' }}
                          onScroll={e => {
                            const el = e.target
                            const idx = Math.round(el.scrollLeft / el.clientWidth)
                            const dotsEl = document.getElementById('dots-'+name)
                            if (dotsEl) {
                              const dots = dotsEl.children
                              for (let i=0; i<dots.length; i++) dots[i].style.background = i===idx ? '#4a6741' : '#ede6d3'
                            }
                          }}
                        >
                          {FODER_MEALS.map((meal, mi) => {
                            const row = hf[meal] || { ho:'', kraft:'', mash:'', ovrigt:'' }
                            return (
                              <div key={meal} style={{ flex:'0 0 100%', scrollSnapAlign:'start', padding:'0 12px 4px' }}>
                                <div style={{ background:C.parchment, padding:'7px 12px', borderRadius:'8px 8px 0 0', fontSize:'0.8rem', fontWeight:'bold', color:C.bark, textTransform:'uppercase', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                  <span>{meal}</span>
                                  <span style={{ fontSize:'0.65rem', color:C.muted, fontWeight:'normal' }}>{mi+1}/{FODER_MEALS.length}</span>
                                </div>
                                <div style={{ border:'1.5px solid '+C.parchment, borderTop:'none', borderRadius:'0 0 8px 8px', padding:'10px 12px', display:'flex', flexDirection:'column', gap:10, background:'#fff' }}>
                                  {FODER_COLS.map((col, ci) => (
                                    <div key={col}>
                                      <div style={{ fontSize:'0.65rem', color:C.earth, marginBottom:4, textTransform:'uppercase', fontWeight:'bold', letterSpacing:'0.04em' }}>{FODER_COL_LABELS[ci]}</div>
                                      <input value={row[col]} onChange={e => canEdit && updateFoder(name, meal, col, e.target.value)} readOnly={!canEdit} placeholder="—" style={{ ...inp, padding:'9px 11px', fontSize:'0.92rem' }} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
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
                                    <textarea value={row[col]} onChange={e => canEdit && updateFoder(name, meal, col, e.target.value)} readOnly={!canEdit} placeholder="—" rows={2} style={{ width:'100%', padding:'3px 5px', fontSize:'0.75rem', border:'none', background:'transparent', resize:'none', fontFamily:'Georgia,serif', color:C.bark, outline:'none', lineHeight:1.5, minWidth:80 }} />
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

        {tab === 'aktivitet' && (
          <div>
            <SectionTitle icon="🐎" title="Hästaktivitet" sub={isAdmin ? 'Veckans aktiviteter per häst' : 'Skrivskyddat'} />
            <WeekNav info={weekLabel(actMonday)} isNow={actOffset===0} onPrev={() => goActWeek(-1)} onNext={() => goActWeek(1)} />
            {isAdmin && (
              <div style={{ background:'#fff', borderRadius:12, padding:'14px 18px', border:'1.5px solid '+C.parchment, marginBottom:16 }}>
                <div style={{ fontSize:'0.78rem', color:C.muted, marginBottom:8, fontWeight:'bold', textTransform:'uppercase' }}>Filtrera på häst</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  <button onClick={() => setActFilterHorses([])} style={{ padding:'6px 12px', borderRadius:20, border:'1.5px solid '+(actFilterHorses.length===0 ? C.moss : C.parchment), background: actFilterHorses.length===0 ? '#e8f5e8' : '#fff', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Georgia,serif', color: actFilterHorses.length===0 ? C.forest : C.bark, fontWeight: actFilterHorses.length===0 ? 'bold' : 'normal' }}>Alla</button>
                  {ACTIVITY_HORSE_ORDER.filter(h => horseNames.includes(h)).map(h => {
                    const active = actFilterHorses.includes(h)
                    return <button key={h} onClick={() => setActFilterHorses(prev => active ? prev.filter(x=>x!==h) : [...prev, h])} style={{ padding:'6px 12px', borderRadius:20, border:'1.5px solid '+(active ? C.moss : C.parchment), background: active ? '#e8f5e8' : '#fff', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Georgia,serif', color: active ? C.forest : C.bark, fontWeight: active ? 'bold' : 'normal' }}>🐴 {h}</button>
                  })}
                </div>
              </div>
            )}
            {(() => {
              const orderedHorses = ACTIVITY_HORSE_ORDER.filter(h => horseNames.includes(h))
              const extraHorses = horseNames.filter(h => !ACTIVITY_HORSE_ORDER.includes(h))
              const allActivityHorses = [...orderedHorses, ...extraHorses]
              const displayHorses = isRyttare && userHorses ? allActivityHorses.filter(h => userHorses.includes(h)) : actFilterHorses.length > 0 ? allActivityHorses.filter(h => actFilterHorses.includes(h)) : allActivityHorses
              return isMobile ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {displayHorses.map((name, hi) => (
                    <div key={hi} style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:'1.5px solid '+C.parchment }}>
                      <div style={{ background:'#3d1f10', padding:'9px 14px' }}>
                        <span style={{ fontFamily:'Georgia,serif', fontWeight:'bold', color:'#fff', fontSize:'1rem' }}>{name}</span>
                      </div>
                      <div style={{ padding:'10px', display:'flex', flexDirection:'column', gap:6 }}>
                        {DAGAR.map(dag => {
                          const cell = actGrid[name]?.[dag] || { text:'', ansvarig:'' }
                          const isToday = actOffset===0 && dag===TODAY
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
                      <tr style={{ background:'#3d1f10' }}>
                        <th style={{ padding:'9px 12px', textAlign:'left', color:'#fff', fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.06em', width:85 }}>Häst</th>
                        {DAGAR.map(d => {
                          const highlight = actOffset===0 && d===TODAY
                          return <th key={d} style={{ padding:'9px 6px', textAlign:'center', fontSize:'0.68rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.04em', color: highlight ? C.gold : '#fff', borderLeft:'1px solid rgba(255,255,255,0.12)' }}>{d.slice(0,3)}{highlight?' •':''}</th>
                        })}
                        <th style={{ padding:'9px 6px', textAlign:'center', color:'#fff', fontSize:'0.68rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.04em', borderLeft:'1px solid rgba(255,255,255,0.12)' }}>Övrigt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayHorses.map((name, hi) => (
                        <tr key={hi} style={{ background: hi%2===0 ? '#fff' : C.cream }}>
                          <td style={{ padding:'5px 8px', borderBottom:'1px solid '+C.parchment, verticalAlign:'top', paddingTop:9 }}>
                            <span style={{ fontFamily:'Georgia,serif', fontWeight:'bold', color:C.bark, fontSize:'0.82rem' }}>{name}</span>
                          </td>
                          {DAGAR.concat(['Övrigt']).map(dag => {
                            const cell = actGrid[name]?.[dag] || { text:'', ansvarig:'' }
                            const highlight = actOffset===0 && dag===TODAY
                            return (
                              <td key={dag} style={{ padding:'3px', borderBottom:'1px solid '+C.parchment, borderLeft:'1px solid '+C.parchment, background: highlight ? 'rgba(74,103,65,0.04)' : 'transparent', verticalAlign:'top', minWidth:85 }}>
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
              )
            })()}
          </div>
        )}

        {tab === 'dagbok' && (() => {
          const dagbokHorseList = (userHorses || horseNames.slice().sort((a,b) => a.localeCompare(b,'sv')))
          if (!dagbokHorse && dagbokHorseList.length > 0 && dagbokHorseList[0]) {
            setTimeout(() => setDagbokHorse(dagbokHorseList[0]), 0)
          }
          const weekDates = DAGAR.map((_, i) => {
            const d = new Date(dagbokMonday); d.setDate(dagbokMonday.getDate() + i); return localDateStr(d)
          })
          const entriesForHorse = dagbokEntries.filter(e => e.horse === dagbokHorse)
          const entryByDate = {}
          entriesForHorse.forEach(e => { entryByDate[e.date] = e })
          return (
            <div>
              <SectionTitle icon="📓" title="Dagbok" sub="En anteckning per häst och dag – alla kopplade ser samma dagbok" />
              <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:4 }}>
                {dagbokHorseList.map(h => (
                  <button key={h} onClick={() => { setDagbokHorse(h); setDagbokEditDay(null) }}
                    style={{ padding:'7px 14px', borderRadius:20, border: dagbokHorse===h ? '2px solid '+C.moss : '1.5px solid '+C.parchment,
                      background: dagbokHorse===h ? C.moss : '#fff', color: dagbokHorse===h ? '#fff' : C.bark,
                      fontFamily:'Georgia,serif', fontSize:'0.82rem', cursor:'pointer', whiteSpace:'nowrap', fontWeight: dagbokHorse===h ? 'bold' : 'normal' }}>
                    🐴 {h}
                  </button>
                ))}
              </div>
              {dagbokHorse && (
                <>
                  <WeekNav info={weekLabel(dagbokMonday)} isNow={isDagbokThisWeek} onPrev={() => { setDagbokOffset(o => o-1); setDagbokEditDay(null) }} onNext={() => { setDagbokOffset(o => o+1); setDagbokEditDay(null) }} />
                  {isMobile ? (
                    /* ── MOBILE: vertikal lista nedåt ── */
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {DAGAR.map((dag, i) => {
                        const dateStr = weekDates[i]
                        const entry = entryByDate[dateStr]
                        const isToday = isDagbokThisWeek && dag === TODAY
                        const isEditing = dagbokEditDay === i
                        const dayDate = new Date(dateStr)
                        return (
                          <div key={i} style={{ background: isToday ? '#f0f7ee' : '#fff', borderRadius:10, border: isToday ? '2px solid '+C.moss : '1.5px solid '+C.parchment, padding:14 }}>
                            <div style={{ fontWeight:'bold', fontSize:'0.85rem', color: isToday ? C.moss : C.bark, fontFamily:'Georgia,serif', marginBottom:6 }}>
                              {DAGAR_SHORT[i]} {dayDate.getDate()}/{dayDate.getMonth()+1}{isToday ? ' •' : ''}
                            </div>
                            {isEditing ? (
                              <DagbokForm key={dagbokHorse+'|'+dateStr}
                                initVad={entry?.vad||''} initKandes={entry?.kandes||''} initOvrigt={entry?.ovrigt||''}
                                onSave={async (vad, kandes, ovrigt) => { await saveDagbokEntry(dagbokHorse, dateStr, vad, kandes, ovrigt); setDagbokEditDay(null) }}
                                isUpdate={!!entry} onCancel={() => setDagbokEditDay(null)} compact />
                            ) : entry ? (
                              <div style={{ fontSize:'0.82rem', color:C.bark }}>
                                {entry.vad && <div style={{ marginBottom:4 }}><strong>Vad:</strong> {entry.vad}</div>}
                                {entry.kandes && <div style={{ marginBottom:4 }}><strong>Kändes:</strong> {entry.kandes}</div>}
                                {entry.ovrigt && <div style={{ marginBottom:4 }}><strong>Övrigt:</strong> {entry.ovrigt}</div>}
                                <div style={{ fontSize:'0.68rem', color:C.muted, marginTop:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                  <span>— {entry.name}</span>
                                  <button onClick={() => setDagbokEditDay(i)} style={{ background:C.parchment, border:'none', borderRadius:6, padding:'4px 10px', fontSize:'0.72rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark }}>✏️ Redigera</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <span style={{ color:C.muted, fontStyle:'italic', fontSize:'0.78rem' }}>Inget pass</span>
                                <button onClick={() => setDagbokEditDay(i)} style={{ background:C.gold, border:'none', borderRadius:7, padding:'6px 12px', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark, fontWeight:'bold' }}>➕ Skriv</button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    /* ── DESKTOP: full week grid ── */
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:8 }}>
                      {DAGAR.map((dag, i) => {
                        const dateStr = weekDates[i]
                        const entry = entryByDate[dateStr]
                        const isToday = isDagbokThisWeek && dag === TODAY
                        const isEditing = dagbokEditDay === i
                        const dayDate = new Date(dateStr)
                        return (
                          <div key={i} style={{ background: isToday ? '#f0f7ee' : '#fff', borderRadius:10, border: isToday ? '2px solid '+C.moss : '1.5px solid '+C.parchment, padding:12, minHeight:180, display:'flex', flexDirection:'column' }}>
                            <div style={{ fontWeight:'bold', fontSize:'0.82rem', color:C.bark, fontFamily:'Georgia,serif', marginBottom:4, textAlign:'center' }}>
                              {DAGAR_SHORT[i]} {dayDate.getDate()}/{dayDate.getMonth()+1}
                            </div>
                            {isEditing ? (
                              <DagbokForm key={dagbokHorse+'|'+dateStr}
                                initVad={entry?.vad||''} initKandes={entry?.kandes||''} initOvrigt={entry?.ovrigt||''}
                                onSave={async (vad, kandes, ovrigt) => { await saveDagbokEntry(dagbokHorse, dateStr, vad, kandes, ovrigt); setDagbokEditDay(null) }}
                                isUpdate={!!entry} onCancel={() => setDagbokEditDay(null)} compact />
                            ) : entry ? (
                              <div style={{ flex:1, fontSize:'0.75rem', color:C.bark }}>
                                {entry.vad && <div style={{ marginBottom:4 }}><strong>Vad:</strong> {entry.vad}</div>}
                                {entry.kandes && <div style={{ marginBottom:4 }}><strong>Kändes:</strong> {entry.kandes}</div>}
                                {entry.ovrigt && <div style={{ marginBottom:4 }}><strong>Övrigt:</strong> {entry.ovrigt}</div>}
                                <div style={{ fontSize:'0.65rem', color:C.muted, marginTop:6 }}>— {entry.name}</div>
                                <button onClick={() => setDagbokEditDay(i)} style={{ marginTop:6, background:C.parchment, border:'none', borderRadius:6, padding:'4px 10px', fontSize:'0.7rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark }}>✏️ Redigera</button>
                              </div>
                            ) : (
                              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                                <p style={{ color:C.muted, fontStyle:'italic', fontSize:'0.75rem', marginBottom:8 }}>Inget pass</p>
                                <button onClick={() => setDagbokEditDay(i)} style={{ background:C.gold, border:'none', borderRadius:7, padding:'6px 12px', fontSize:'0.75rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark, fontWeight:'bold' }}>➕ Skriv</button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
              {!dagbokHorse && <p style={{ color:C.muted, fontStyle:'italic', fontSize:'0.85rem', textAlign:'center', marginTop:20 }}>Välj en häst ovan för att se dagboken.</p>}
            </div>
          )
        })()}

        {tab === 'settings' && isAdmin && (
          <SettingsTab riderConfig={riderConfig} setRiderConfig={saveRiderConfig} horseNames={horseNames} isMobile={isMobile} />
        )}

        {tab === 'export' && isAdmin && (
          <ExportTab stroLog={stroLog} hoLog={hoLog} isMobile={isMobile} userId={userId} />
        )}

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
                <button onClick={clearSelection} style={{ background:'transparent', color:C.straw, border:'1px solid rgba(200,169,110,0.4)', borderRadius:7, padding:'8px 12px', cursor:'pointer', fontFamily:'Georgia,serif', fontSize:'0.85rem', marginLeft:'auto' }}>✕</button>
              </div>
            )}
            <div style={{ overflowX:'auto', borderRadius:10, border:'1.5px solid '+C.parchment, maxHeight: isMobile ? '60vh' : '70vh', overflowY:'auto' }}
              onMouseLeave={onDragEnd} onMouseUp={onDragEnd}
              onMouseDown={e => { if (isMobile) return; const td = e.target.closest('td[data-dk]'); if (!td) return; onCellMouseDown(e, td.dataset.dk, td.dataset.slot) }}
              onMouseOver={e => { if (isMobile || !isDragging.current) return; const td = e.target.closest('td[data-dk]'); if (!td) return; onCellMouseEnter(td.dataset.dk, td.dataset.slot) }}
              onClick={e => { if (!isMobile) return; const td = e.target.closest('td[data-dk]'); if (!td) return; toggleCell(td.dataset.dk, td.dataset.slot) }}
            >
              <table style={{ borderCollapse:'collapse', minWidth: 80 + PADDOCK_SLOTS.length * (isMobile ? 44 : 58) }}>
                <thead>
                  <tr style={{ background:'#3d1f10', position:'sticky', top:0, zIndex:10 }}>
                    <th style={{ padding:'8px 10px', textAlign:'left', color:'#fff', fontSize:'0.72rem', fontWeight:'bold', textTransform:'uppercase', whiteSpace:'nowrap', position:'sticky', left:0, background:'#3d1f10', zIndex:11, minWidth:isMobile?60:80 }}>Datum</th>
                    {PADDOCK_SLOTS.map(s => <th key={s} style={{ padding:'5px 2px', textAlign:'center', color:'#fff', fontSize: isMobile ? '0.55rem' : '0.68rem', fontWeight:'bold', borderLeft:'1px solid rgba(255,255,255,0.12)', whiteSpace:'nowrap', minWidth: isMobile ? 44 : 58, lineHeight:1.2 }}><div>{s.split('-')[0]}</div><div style={{ fontSize: isMobile ? '0.5rem' : '0.6rem', fontWeight:'bold' }}>{s.split('-')[1]}</div></th>)}
                  </tr>
                </thead>
                <tbody>
                  {getDaysInMonth(paddockMonth.year, paddockMonth.month).map((day, di) => {
                    const dk = dateKey(day); const isToday = dk === TODAY_DATE; const daySlots = paddockGrid[dk] || {}
                    return (
                      <tr key={dk} style={{ background: isToday ? 'rgba(74,103,65,0.07)' : di%2===0 ? '#fff' : C.cream }}>
                        <td style={{ padding: isMobile ? '4px 6px' : '5px 8px', fontSize: isMobile ? '0.6rem' : '0.72rem', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? C.moss : C.bark, whiteSpace:'nowrap', borderBottom:'1px solid '+C.parchment, position:'sticky', left:0, background: isToday ? '#f0f7ee' : di%2===0 ? '#fff' : C.cream, zIndex:5, borderRight:'1.5px solid '+C.parchment }}>
                          {day.getDate() + ' ' + MONTHS_SHORT[day.getMonth()]}{!isMobile && ' ' + ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'][day.getDay()]}{isToday ? ' ●' : ''}
                        </td>
                        {PADDOCK_SLOTS.map(slot => {
                          const booking = daySlots[slot]; const ck = cellKey(dk, slot); const isSel = selection.has(ck)
                          return (
                            <td key={slot} data-dk={dk} data-slot={slot}
                              style={{ padding:'2px', borderLeft:'1px solid '+C.parchment, borderBottom:'1px solid '+C.parchment, cursor:'pointer', minWidth: isMobile ? 36 : 48, height: isMobile ? 28 : 30, userSelect:'none', outline: isSel ? '2px solid #1976d2' : 'none', outlineOffset:'-2px', opacity: !canBookDate(dk) && !booking ? 0.4 : 1 }}>
                              {booking ? (
                                <div style={{ background: isSel ? (booking.type==='grön' ? '#81c784' : '#e57373') : (booking.type==='grön' ? '#c8e6c9' : '#ffcdd2'), borderRadius:3, height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 1px', pointerEvents:'none' }}>
                                  <span style={{ fontSize: isMobile ? '0.45rem' : '0.58rem', fontWeight:'bold', color: booking.type==='grön' ? '#2d6a2d' : '#c62828', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth: isMobile ? 32 : 44, pointerEvents:'none' }}>{booking.name}</span>
                                </div>
                              ) : (
                                <div style={{ background: isSel ? 'rgba(25,118,210,0.15)' : 'transparent', borderRadius:3, height:'100%', pointerEvents:'none' }} />
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
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', padding: isMobile ? 0 : 20 }} onClick={() => setBookModal(false)}>
                <div style={{ background:C.cream, borderRadius: isMobile ? '18px 18px 0 0' : 14, padding: isMobile ? '24px 20px 32px' : 24, maxWidth:380, width:'100%', boxShadow:'0 -8px 40px rgba(0,0,0,0.25)', border:'1.5px solid '+C.straw }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ color:C.bark, fontFamily:'Georgia,serif', marginBottom:4, fontSize:'1.1rem' }}>Boka {selection.size} tidsfält</h3>
                  <p style={{ fontSize:'0.78rem', color:C.muted, marginBottom:18 }}>Välj namn och typ.</p>
                  <Field label="Namn"><input value={bookName} onChange={e => setBookName(e.target.value)} placeholder="Ditt namn..." style={inp} autoFocus /></Field>
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
      {!isMobile && (
        <footer style={{ textAlign:'center', padding:'20px', color:C.muted, fontSize:'0.72rem', borderTop:'1px solid '+C.parchment, marginTop:20 }}>
          🌿 Höglanda Hästgård · Stallapp
        </footer>
      )}
    </div>
  )
}

const HORSES_SORTED = ['Calle','Celma','Charina','Hippo','Joker','Lova','Maggan','Mini','Selma','Skye','Spot','Spotty','Storm']

function HoTab({ isAdmin, isMobile, hoLog, hoForm, setHoForm, hoOk, hoEditId, setHoEditId, hoEditData, setHoEditData, submitHo, saveHoEdit, deleteHo, allowedHorses, filterHorses, setFilterHorses }) {
  const horseList = allowedHorses || HORSES_SORTED
  const filtered = isAdmin && filterHorses.length > 0 ? hoLog.filter(l => filterHorses.includes(l.horse)) : hoLog
  const hoTotal = filtered.filter(l => l.item === 'Hö').reduce((s, l) => s + l.amount, 0)
  const halmTotal = filtered.filter(l => l.item === 'Halm').reduce((s, l) => s + l.amount, 0)
  return (
    <div>
      <SectionTitle icon="🌾" title="Hö & Halm" sub={isAdmin ? 'Admin ser alla loggar' : 'Du ser bara dina egna loggar'} />
      <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 16 : 22, border:'1.5px solid '+C.parchment, marginBottom:16 }}>
        <h3 style={{ color:C.bark, marginBottom:16, fontSize:'1rem' }}>Logga förbrukning</h3>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
          <Field label="Typ">
            <div style={{ display:'flex', gap:8 }}>
              {['Hö','Halm'].map(item => (
                <label key={item} style={{ flex:1, padding:'12px 10px', borderRadius:9, cursor:'pointer', border:'2px solid '+(hoForm.item===item ? C.gold : C.parchment), background: hoForm.item===item ? '#fdf6d8' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:'0.95rem', fontWeight:'bold', color:C.bark }}>
                  <input type="radio" checked={hoForm.item===item} onChange={() => setHoForm(f => ({ ...f, item }))} style={{ display:'none' }} />
                  {item==='Hö' ? '🌾' : '🌿'} {item}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Häst">
            <select value={hoForm.horse} onChange={e => setHoForm(f => ({ ...f, horse: e.target.value }))} style={{ ...inp, width:'100%' }}>
              <option value="">Välj häst...</option>
              {horseList.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </Field>
          <Field label="Datum">
            <input type="date" value={hoForm.date} onChange={e => setHoForm(f => ({ ...f, date: e.target.value }))} style={inp} />
          </Field>
          <Field label="Antal kg">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={() => setHoForm(f => ({ ...f, amount: Math.max(0.25, Math.round((f.amount - 0.25)*100)/100) }))} style={{ width:46, height:46, borderRadius:9, border:'1.5px solid '+C.parchment, background:C.parchment, fontSize:'1.4rem', cursor:'pointer', flexShrink:0 }}>−</button>
              <select value={hoForm.amount} onChange={e => setHoForm(f => ({ ...f, amount: parseFloat(e.target.value) }))} style={{ flex:1, padding:'11px 10px', borderRadius:8, border:'1.5px solid '+C.parchment, fontSize:'1.1rem', fontFamily:'Georgia,serif', color:C.bark, background:C.cream, outline:'none', textAlign:'center', fontWeight:'bold' }}>
                {HO_AMOUNTS.map(v => <option key={v} value={v}>{v} kg</option>)}
              </select>
              <button onClick={() => setHoForm(f => ({ ...f, amount: Math.min(30, Math.round((f.amount + 0.25)*100)/100) }))} style={{ width:46, height:46, borderRadius:9, border:'1.5px solid '+C.parchment, background:C.parchment, fontSize:'1.4rem', cursor:'pointer', flexShrink:0 }}>+</button>
            </div>
          </Field>
        </div>
        {hoOk && <div style={{ background:'#e8f5e8', border:'1.5px solid '+C.moss, borderRadius:8, padding:'10px 14px', marginBottom:12, marginTop:12, fontSize:'0.9rem', color:C.forest }}>✓ Loggat!</div>}
        <button onClick={submitHo} style={{ width:'100%', padding:'14px', borderRadius:9, border:'none', background:C.gold, color:C.bark, fontFamily:'Georgia,serif', fontSize:'1rem', fontWeight:'bold', cursor:'pointer', marginTop:12 }}>Spara</button>
      </div>
      {isAdmin && (
        <div style={{ background:'#fff', borderRadius:12, padding:'14px 18px', border:'1.5px solid '+C.parchment, marginBottom:16 }}>
          <div style={{ fontSize:'0.78rem', color:C.muted, marginBottom:8, fontWeight:'bold', textTransform:'uppercase' }}>Filtrera på häst</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <button onClick={() => setFilterHorses([])} style={{ padding:'6px 12px', borderRadius:20, border:'1.5px solid '+(filterHorses.length===0 ? C.moss : C.parchment), background: filterHorses.length===0 ? '#e8f5e8' : '#fff', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Georgia,serif', color: filterHorses.length===0 ? C.forest : C.bark, fontWeight: filterHorses.length===0 ? 'bold' : 'normal' }}>Alla</button>
            {HORSES_SORTED.map(h => {
              const active = filterHorses.includes(h)
              return <button key={h} onClick={() => setFilterHorses(prev => active ? prev.filter(x=>x!==h) : [...prev, h])} style={{ padding:'6px 12px', borderRadius:20, border:'1.5px solid '+(active ? C.moss : C.parchment), background: active ? '#e8f5e8' : '#fff', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Georgia,serif', color: active ? C.forest : C.bark, fontWeight: active ? 'bold' : 'normal' }}>🐴 {h}</button>
            })}
          </div>
        </div>
      )}
      <div style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ background:'#fff', borderRadius:10, padding:'10px 16px', border:'1.5px solid '+C.parchment, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:'0.78rem', color:C.muted }}>🌾 Hö:</span>
          <span style={{ fontWeight:'bold', color:C.bark, fontSize:'1rem' }}>{hoTotal} kg</span>
        </div>
        <div style={{ background:'#fff', borderRadius:10, padding:'10px 16px', border:'1.5px solid '+C.parchment, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:'0.78rem', color:C.muted }}>🌿 Halm:</span>
          <span style={{ fontWeight:'bold', color:C.bark, fontSize:'1rem' }}>{halmTotal} kg</span>
        </div>
      </div>
      <h3 style={{ color:C.bark, marginBottom:12, fontSize:'1rem' }}>Logghistorik {!isAdmin && <span style={{ fontSize:'0.72rem', color:C.muted, fontWeight:'normal' }}>(bara dina)</span>}{isAdmin && filterHorses.length > 0 && <span style={{ fontSize:'0.72rem', color:C.moss, fontWeight:'normal' }}> ({filterHorses.join(', ')})</span>}</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.map(l => (
          <div key={l.id} style={{ background: hoEditId===l.id ? '#fffaf0' : '#fff', border:'1.5px solid '+(hoEditId===l.id ? C.gold : C.parchment), borderRadius:10, padding:'13px 14px' }}>
            {hoEditId===l.id ? (
              <div>
                <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
                  <select value={hoEditData.horse||''} onChange={e => setHoEditData(d => ({ ...d, horse: e.target.value }))} style={{ ...inp, flex:1, minWidth:100 }}>
                    <option value="">Välj häst...</option>
                    {horseList.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <select value={hoEditData.item} onChange={e => setHoEditData(d => ({ ...d, item: e.target.value }))} style={{ ...inp, flex:1, minWidth:80 }}>
                    <option>Hö</option><option>Halm</option>
                  </select>
                  <select value={hoEditData.amount} onChange={e => setHoEditData(d => ({ ...d, amount: parseFloat(e.target.value) }))} style={{ ...inp, flex:1, minWidth:80 }}>
                    {HO_AMOUNTS.map(v => <option key={v} value={v}>{v} kg</option>)}
                  </select>
                  <input type="date" value={hoEditData.date} onChange={e => setHoEditData(d => ({ ...d, date: e.target.value }))} style={{ ...inp, flex:1, minWidth:130 }} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={saveHoEdit} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:C.moss, color:'#fff', cursor:'pointer', fontSize:'0.9rem', fontFamily:'Georgia,serif', fontWeight:'bold' }}>Spara</button>
                  <button onClick={() => setHoEditId(null)} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid '+C.parchment, background:'#fff', cursor:'pointer', fontSize:'0.9rem', fontFamily:'Georgia,serif' }}>Avbryt</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <span style={{ fontWeight:'bold', fontSize:'0.95rem', color:C.bark }}>{l.horse ? '🐴 '+l.horse : l.name}</span>
                  <span style={{ color:C.muted, fontSize:'0.75rem' }}> · {l.item}{l.horse ? ' · '+l.name : ''}</span>
                  <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>{l.date}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:'1rem', fontWeight:'bold', color:C.earth }}>{l.amount} kg</span>
                  <button onClick={() => { setHoEditId(l.id); setHoEditData({ item:l.item, amount:l.amount, date:l.date, horse:l.horse||'' }) }} style={{ background:C.parchment, border:'none', borderRadius:7, width:36, height:36, cursor:'pointer', fontSize:'0.9rem' }}>✏️</button>
                  {isAdmin && <button onClick={() => deleteHo(l.id)} style={{ background:'#fce8e8', border:'none', borderRadius:7, width:36, height:36, cursor:'pointer', fontSize:'0.9rem' }}>🗑️</button>}
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p style={{ color:C.muted, fontStyle:'italic', fontSize:'0.85rem' }}>Inga loggar{filterHorses.length > 0 ? ' för vald häst' : ' ännu'}.</p>}
      </div>
    </div>
  )
}

function DagbokForm({ initVad, initKandes, initOvrigt, onSave, isUpdate, onCancel, compact }) {
  const [vad, setVad] = useState(initVad)
  const [kandes, setKandes] = useState(initKandes)
  const [ovrigt, setOvrigt] = useState(initOvrigt)
  const [saved, setSaved] = useState(false)
  const rows = compact ? 2 : 3
  const fontSize = compact ? '0.78rem' : '1rem'
  async function handleSave() {
    await onSave(vad, kandes, ovrigt)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  return (
    <div>
      <Field label="Vad gjorde du?">
        <textarea value={vad} onChange={e => setVad(e.target.value)} placeholder="Beskriv passet..." rows={rows} style={{ ...inp, resize:'vertical', fontSize }} />
      </Field>
      <Field label="Hur kändes det?">
        <textarea value={kandes} onChange={e => setKandes(e.target.value)} placeholder="Hur gick det, hur kändes hästen..." rows={rows} style={{ ...inp, resize:'vertical', fontSize }} />
      </Field>
      <Field label="Övriga kommentarer">
        <textarea value={ovrigt} onChange={e => setOvrigt(e.target.value)} placeholder="Eventuella noteringar..." rows={compact ? 1 : 2} style={{ ...inp, resize:'vertical', fontSize }} />
      </Field>
      {saved && <div style={{ background:'#e8f5e8', border:'1.5px solid '+C.moss, borderRadius:8, padding: compact ? '6px 10px' : '10px 14px', marginBottom:8, fontSize:'0.82rem', color:C.forest }}>✓ Sparat!</div>}
      <div style={{ display:'flex', gap:8 }}>
        {onCancel && (
          <button onClick={onCancel} style={{ flex:1, padding: compact ? '8px' : '14px', borderRadius:9, border:'1.5px solid '+C.parchment, background:'#fff', color:C.bark, fontFamily:'Georgia,serif', fontSize: compact ? '0.78rem' : '1rem', cursor:'pointer' }}>Avbryt</button>
        )}
        <button onClick={handleSave} style={{ flex:1, padding: compact ? '8px' : '14px', borderRadius:9, border:'none', background:C.gold, color:C.bark, fontFamily:'Georgia,serif', fontSize: compact ? '0.78rem' : '1rem', fontWeight:'bold', cursor:'pointer' }}>
          {isUpdate ? 'Uppdatera' : 'Spara'}
        </button>
      </div>
    </div>
  )
}

function ExportTab({ stroLog, hoLog, isMobile, userId }) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
  })
  const [toDate, setToDate] = useState(TODAY_DATE)
  const [selectedHorse, setSelectedHorse] = useState('')
  const [activeSection, setActiveSection] = useState('export')
  const [deliveries, setDeliveries] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [loadingInv, setLoadingInv] = useState(true)
  const [deliveryForm, setDeliveryForm] = useState({ product:'Stallströ', amount:'', date:TODAY_DATE, note:'' })
  const [adjustForm, setAdjustForm] = useState({ product:'Stallströ', amount:'', reason:'', date:TODAY_DATE })
  const [showDeliveryForm, setShowDeliveryForm] = useState(false)
  const [showAdjustForm, setShowAdjustForm] = useState(false)
  const [invMonth, setInvMonth] = useState('all')

  const PRODUCTS = [
    { id:'Stallströ', label:'🌿 Stallströ', unit:'balar' },
    { id:'Stallpellets', label:'⚪ Stallpellets', unit:'säckar' },
    { id:'Hö', label:'🌾 Hö', unit:'kg' },
    { id:'Halm', label:'🟡 Halm', unit:'kg' },
  ]

  useEffect(() => { loadInventory() }, [])
  async function loadInventory() {
    setLoadingInv(true)
    const [{ data: del }, { data: adj }] = await Promise.all([
      supabase.from('inventory_deliveries').select('*').order('date', { ascending: false }),
      supabase.from('inventory_adjustments').select('*').order('date', { ascending: false })
    ])
    if (del) setDeliveries(del)
    if (adj) setAdjustments(adj)
    setLoadingInv(false)
  }

  async function submitDelivery() {
    if (!deliveryForm.amount || +deliveryForm.amount <= 0) return
    const prod = PRODUCTS.find(p => p.id === deliveryForm.product)
    const { data } = await supabase.from('inventory_deliveries').insert({ product: deliveryForm.product, amount: +deliveryForm.amount, unit: prod.unit, date: deliveryForm.date, note: deliveryForm.note || null, user_id: userId }).select().single()
    if (data) { setDeliveries(p => [data, ...p]); setDeliveryForm({ product:'Stallströ', amount:'', date:TODAY_DATE, note:'' }); setShowDeliveryForm(false) }
  }
  async function submitAdjustment() {
    if (!adjustForm.amount || +adjustForm.amount <= 0) return
    const prod = PRODUCTS.find(p => p.id === adjustForm.product)
    const { data } = await supabase.from('inventory_adjustments').insert({ product: adjustForm.product, amount: +adjustForm.amount, unit: prod.unit, reason: adjustForm.reason || null, date: adjustForm.date, user_id: userId }).select().single()
    if (data) { setAdjustments(p => [data, ...p]); setAdjustForm({ product:'Stallströ', amount:'', reason:'', date:TODAY_DATE }); setShowAdjustForm(false) }
  }
  async function deleteDelivery(id) { await supabase.from('inventory_deliveries').delete().eq('id', id); setDeliveries(p => p.filter(d => d.id !== id)) }
  async function deleteAdjustment(id) { await supabase.from('inventory_adjustments').delete().eq('id', id); setAdjustments(p => p.filter(a => a.id !== id)) }

  function filterInvByMonth(list, dateField='date') {
    if (invMonth === 'all') return list
    return list.filter(item => item[dateField] && item[dateField].substring(0,7) === invMonth)
  }
  function calcBalance(productId) {
    const totalIn = filterInvByMonth(deliveries).filter(d => d.product === productId).reduce((s, d) => s + +d.amount, 0)
    const usageLogs = productId === 'Hö' || productId === 'Halm' ? hoLog : stroLog
    const totalUsed = filterInvByMonth(usageLogs).filter(l => l.item === productId).reduce((s, l) => s + +l.amount, 0)
    const totalAdjusted = filterInvByMonth(adjustments).filter(a => a.product === productId).reduce((s, a) => s + +a.amount, 0)
    return { totalIn, totalUsed, totalAdjusted, balance: totalIn - totalUsed - totalAdjusted }
  }

  function filterByDate(log) { return log.filter(l => l.date >= fromDate && l.date <= toDate) }
  const stro = filterByDate(stroLog), ho = filterByDate(hoLog)
  const stroByHorse = {}, hoByHorse = {}
  stro.forEach(l => { const h = l.horse || 'Okänd'; stroByHorse[h] = stroByHorse[h] || {}; stroByHorse[h][l.item] = (stroByHorse[h][l.item] || 0) + l.amount })
  ho.forEach(l => { const h = l.horse || 'Okänd'; hoByHorse[h] = hoByHorse[h] || {}; hoByHorse[h][l.item] = (hoByHorse[h][l.item] || 0) + l.amount })
  const allHorses = [...new Set([...Object.keys(stroByHorse), ...Object.keys(hoByHorse)])].sort((a,b) => a.localeCompare(b, 'sv'))
  const horseDetail = selectedHorse ? [
    ...stro.filter(l => (l.horse||'Okänd') === selectedHorse).map(l => ({ date:l.date, name:l.name, item:l.item, amount:l.amount, unit: l.item==='Stallströ' ? 'balar' : 'säckar' })),
    ...ho.filter(l => (l.horse||'Okänd') === selectedHorse).map(l => ({ date:l.date, name:l.name, item:l.item, amount:l.amount, unit:'kg' }))
  ].sort((a,b) => a.date.localeCompare(b.date)) : []

  function exportTotalCSV() {
    const rows = [['Häst','Stallströ (balar)','Stallpellets (säckar)','Hö (kg)','Halm (kg)']]
    allHorses.forEach(horse => rows.push([horse, stroByHorse[horse]?.['Stallströ']||0, stroByHorse[horse]?.['Stallpellets']||0, hoByHorse[horse]?.['Hö']||0, hoByHorse[horse]?.['Halm']||0]))
    exportCSV(rows, 'total-forbrukning-' + fromDate + '-' + toDate + '.csv')
  }
  function exportHorseDetailCSV(horse) {
    const detail = [...stro.filter(l => (l.horse||'Okänd') === horse).map(l => ({ date:l.date, name:l.name, item:l.item, amount:l.amount, unit: l.item==='Stallströ' ? 'balar' : 'säckar' })),
      ...ho.filter(l => (l.horse||'Okänd') === horse).map(l => ({ date:l.date, name:l.name, item:l.item, amount:l.amount, unit:'kg' }))].sort((a,b) => a.date.localeCompare(b.date))
    const rows = [['Datum','Produkt','Antal','Enhet','Registrerad av']]
    detail.forEach(l => rows.push([l.date, l.item, l.amount, l.unit, l.name]))
    rows.push([]); rows.push(['Sammanfattning'])
    if (stroByHorse[horse]?.['Stallströ']) rows.push(['Stallströ totalt', stroByHorse[horse]['Stallströ'], 'balar'])
    if (stroByHorse[horse]?.['Stallpellets']) rows.push(['Stallpellets totalt', stroByHorse[horse]['Stallpellets'], 'säckar'])
    if (hoByHorse[horse]?.['Hö']) rows.push(['Hö totalt', hoByHorse[horse]['Hö'], 'kg'])
    if (hoByHorse[horse]?.['Halm']) rows.push(['Halm totalt', hoByHorse[horse]['Halm'], 'kg'])
    exportCSV(rows, horse + '-forbrukning-' + fromDate + '-' + toDate + '.csv')
  }

  const btnStyle = { padding:'13px 20px', borderRadius:9, border:'none', color:'#fff', fontFamily:'Georgia,serif', fontSize:'0.92rem', fontWeight:'bold', cursor:'pointer' }
  const thStyle = { padding:'8px 12px', textAlign:'right', fontSize:'0.72rem', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.05em', color:C.bark }

  return (
    <div>
      <SectionTitle icon="📊" title="Export & Lager" sub="Förbrukningsexport och lagersaldo" />
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['export','inventory'].map(id => (
          <button key={id} onClick={() => setActiveSection(id)} style={{ flex:1, padding:'12px 16px', borderRadius:10, border:'2px solid '+(activeSection===id ? C.gold : C.parchment), background: activeSection===id ? '#fdf6d8' : '#fff', fontFamily:'Georgia,serif', fontSize:'0.92rem', fontWeight: activeSection===id ? 'bold' : 'normal', color:C.bark, cursor:'pointer' }}>
            {id === 'export' ? '📋 Förbrukning & Export' : '📦 Lagersaldo'}
          </button>
        ))}
      </div>

      {activeSection === 'export' && (<>
        <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 16 : 22, border:'1.5px solid '+C.parchment, marginBottom:16 }}>
          <h3 style={{ color:C.bark, marginBottom:14, fontSize:'1rem' }}>Välj period</h3>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ flex:'1 1 140px' }}><div style={{ fontSize:'0.72rem', color:C.earth, marginBottom:5, fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.05em' }}>Från</div><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inp} /></div>
            <div style={{ flex:'1 1 140px' }}><div style={{ fontSize:'0.72rem', color:C.earth, marginBottom:5, fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.05em' }}>Till</div><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inp} /></div>
          </div>
        </div>
        <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 16 : 22, border:'1.5px solid '+C.parchment, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
            <h3 style={{ color:C.bark, fontSize:'1rem', margin:0 }}>Totalöversikt per häst ({stro.length + ho.length} poster)</h3>
            <button onClick={exportTotalCSV} disabled={allHorses.length===0} style={{ ...btnStyle, background: allHorses.length > 0 ? C.forest : C.muted, fontSize:'0.82rem', padding:'10px 16px' }}>⬇️ Exportera totalöversikt</button>
          </div>
          {allHorses.length === 0 ? <p style={{ color:C.muted, fontStyle:'italic', fontSize:'0.85rem' }}>Inga loggar för vald period.</p> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth: isMobile ? 300 : 500 }}>
                <thead><tr style={{ background:C.parchment }}>
                  <th style={{ ...thStyle, textAlign:'left' }}>Häst</th><th style={thStyle}>Stallströ (balar)</th><th style={thStyle}>Stallpellets (säckar)</th><th style={thStyle}>Hö (kg)</th><th style={thStyle}>Halm (kg)</th>
                </tr></thead>
                <tbody>
                  {allHorses.map((horse, i) => (
                    <tr key={horse} style={{ background: i%2===0 ? '#fff' : C.cream, borderBottom:'1px solid '+C.parchment, cursor:'pointer' }} onClick={() => setSelectedHorse(selectedHorse === horse ? '' : horse)}>
                      <td style={{ padding:'10px 12px', fontWeight:'bold', color:C.bark, fontSize:'0.88rem' }}>🐴 {horse} {selectedHorse === horse ? '▾' : '▸'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color:C.earth, fontSize:'0.88rem' }}>{stroByHorse[horse]?.['Stallströ'] || '—'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color:C.earth, fontSize:'0.88rem' }}>{stroByHorse[horse]?.['Stallpellets'] || '—'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color:C.earth, fontSize:'0.88rem' }}>{hoByHorse[horse]?.['Hö'] || '—'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color:C.earth, fontSize:'0.88rem' }}>{hoByHorse[horse]?.['Halm'] || '—'}</td>
                    </tr>
                  ))}
                  <tr style={{ background:C.parchment, borderTop:'2px solid '+C.bark }}>
                    <td style={{ padding:'10px 12px', fontWeight:'bold', color:C.bark, fontSize:'0.88rem' }}>Totalt</td>
                    <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:'bold', color:C.bark, fontSize:'0.88rem' }}>{allHorses.reduce((s,h) => s + (stroByHorse[h]?.['Stallströ']||0), 0) || '—'}</td>
                    <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:'bold', color:C.bark, fontSize:'0.88rem' }}>{allHorses.reduce((s,h) => s + (stroByHorse[h]?.['Stallpellets']||0), 0) || '—'}</td>
                    <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:'bold', color:C.bark, fontSize:'0.88rem' }}>{allHorses.reduce((s,h) => s + (hoByHorse[h]?.['Hö']||0), 0) || '—'}</td>
                    <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:'bold', color:C.bark, fontSize:'0.88rem' }}>{allHorses.reduce((s,h) => s + (hoByHorse[h]?.['Halm']||0), 0) || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        {selectedHorse && (
          <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 16 : 22, border:'1.5px solid '+C.gold, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <h3 style={{ color:C.bark, fontSize:'1rem', margin:0 }}>🐴 {selectedHorse} — Detaljerad sammanställning</h3>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={() => exportHorseDetailCSV(selectedHorse)} style={{ ...btnStyle, background:C.moss, fontSize:'0.82rem', padding:'10px 16px' }}>⬇️ Exportera {selectedHorse}</button>
                <button onClick={() => setSelectedHorse('')} style={{ ...btnStyle, background:C.parchment, color:C.bark, fontSize:'0.82rem', padding:'10px 16px' }}>✕ Stäng</button>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
              {stroByHorse[selectedHorse]?.['Stallströ'] && <div style={{ background:C.cream, borderRadius:8, padding:'8px 14px', border:'1px solid '+C.parchment }}><span style={{ fontSize:'0.72rem', color:C.muted }}>🌿 Stallströ: </span><span style={{ fontWeight:'bold', color:C.bark }}>{stroByHorse[selectedHorse]['Stallströ']} balar</span></div>}
              {stroByHorse[selectedHorse]?.['Stallpellets'] && <div style={{ background:C.cream, borderRadius:8, padding:'8px 14px', border:'1px solid '+C.parchment }}><span style={{ fontSize:'0.72rem', color:C.muted }}>⚪ Stallpellets: </span><span style={{ fontWeight:'bold', color:C.bark }}>{stroByHorse[selectedHorse]['Stallpellets']} säckar</span></div>}
              {hoByHorse[selectedHorse]?.['Hö'] && <div style={{ background:C.cream, borderRadius:8, padding:'8px 14px', border:'1px solid '+C.parchment }}><span style={{ fontSize:'0.72rem', color:C.muted }}>🌾 Hö: </span><span style={{ fontWeight:'bold', color:C.bark }}>{hoByHorse[selectedHorse]['Hö']} kg</span></div>}
              {hoByHorse[selectedHorse]?.['Halm'] && <div style={{ background:C.cream, borderRadius:8, padding:'8px 14px', border:'1px solid '+C.parchment }}><span style={{ fontSize:'0.72rem', color:C.muted }}>🟡 Halm: </span><span style={{ fontWeight:'bold', color:C.bark }}>{hoByHorse[selectedHorse]['Halm']} kg</span></div>}
            </div>
            {horseDetail.length === 0 ? <p style={{ color:C.muted, fontStyle:'italic', fontSize:'0.85rem' }}>Inga poster under vald period.</p> : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth: isMobile ? 320 : 500 }}>
                  <thead><tr style={{ background:C.parchment }}>
                    <th style={{ ...thStyle, textAlign:'left' }}>Datum</th><th style={{ ...thStyle, textAlign:'left' }}>Produkt</th><th style={thStyle}>Antal</th><th style={{ ...thStyle, textAlign:'left' }}>Enhet</th><th style={{ ...thStyle, textAlign:'left' }}>Av</th>
                  </tr></thead>
                  <tbody>
                    {horseDetail.map((l, i) => (
                      <tr key={i} style={{ background: i%2===0 ? '#fff' : C.cream, borderBottom:'1px solid '+C.parchment }}>
                        <td style={{ padding:'8px 12px', fontSize:'0.85rem', color:C.bark }}>{l.date}</td>
                        <td style={{ padding:'8px 12px', fontSize:'0.85rem', color:C.bark }}>{l.item}</td>
                        <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:'bold', fontSize:'0.88rem', color:C.bark }}>{l.amount}</td>
                        <td style={{ padding:'8px 12px', fontSize:'0.85rem', color:C.muted }}>{l.unit}</td>
                        <td style={{ padding:'8px 12px', fontSize:'0.85rem', color:C.muted }}>{l.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </>)}

      {activeSection === 'inventory' && (<>
        <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 12 : 16, border:'1.5px solid '+C.parchment, marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={() => {
            if (invMonth === 'all') { const d = new Date(); setInvMonth(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'00')); return }
            const [y,m] = invMonth.split('-').map(Number); const d = new Date(y, m-2, 1)
            setInvMonth(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'))
          }} style={{ width:40, height:40, borderRadius:10, border:'1.5px solid '+C.parchment, background:C.cream, cursor:'pointer', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center', color:C.bark }}>‹</button>
          <div style={{ textAlign:'center', cursor:'pointer' }} onClick={() => setInvMonth('all')}>
            <div style={{ fontFamily:'Georgia,serif', fontWeight:'bold', fontSize:'1.1rem', color:C.bark }}>
              {invMonth === 'all' ? 'Totalt (alla perioder)' : MONTHS_SV[parseInt(invMonth.split('-')[1])-1] + ' ' + invMonth.split('-')[0]}
            </div>
            <div style={{ fontSize:'0.75rem', color: invMonth === 'all' ? C.moss : C.muted }}>
              {invMonth === 'all' ? 'Klicka pilarna för månadsvy' : (() => { const now = new Date(); const cur = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'); return invMonth === cur ? 'Aktuell månad' : 'Klicka för att visa totalt' })()}
            </div>
          </div>
          <button onClick={() => {
            if (invMonth === 'all') { const d = new Date(); setInvMonth(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')); return }
            const [y,m] = invMonth.split('-').map(Number); const d = new Date(y, m, 1)
            setInvMonth(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'))
          }} style={{ width:40, height:40, borderRadius:10, border:'1.5px solid '+C.parchment, background:C.cream, cursor:'pointer', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center', color:C.bark }}>›</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap:12, marginBottom:16 }}>
          {PRODUCTS.map(prod => {
            const bal = calcBalance(prod.id)
            const isLow = bal.balance <= 0
            return (
              <div key={prod.id} style={{ background:'#fff', borderRadius:12, padding:16, border:'1.5px solid '+(isLow ? '#e57373' : C.parchment), position:'relative' }}>
                {isLow && <div style={{ position:'absolute', top:8, right:8, background:'#c62828', color:'#fff', borderRadius:4, padding:'2px 6px', fontSize:'0.6rem', fontWeight:'bold' }}>⚠ Lågt</div>}
                <div style={{ fontSize:'0.78rem', color:C.muted, marginBottom:4 }}>{prod.label}</div>
                <div style={{ fontSize:'1.8rem', fontWeight:'bold', color: isLow ? '#c62828' : C.bark, marginBottom:8 }}>{bal.balance}<span style={{ fontSize:'0.7rem', fontWeight:'normal', color:C.muted }}> {prod.unit}</span></div>
                <div style={{ fontSize:'0.7rem', color:C.muted, lineHeight:1.6 }}>
                  <div>📦 Inlevererat: <strong style={{ color:C.moss }}>{bal.totalIn}</strong></div>
                  <div>📉 Förbrukat: <strong style={{ color:C.earth }}>{bal.totalUsed}</strong></div>
                  {bal.totalAdjusted > 0 && <div>❌ Svinn: <strong style={{ color:'#c62828' }}>{bal.totalAdjusted}</strong></div>}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <button onClick={() => { setShowDeliveryForm(!showDeliveryForm); setShowAdjustForm(false) }} style={{ ...btnStyle, background: showDeliveryForm ? C.bark : C.moss, fontSize:'0.88rem', padding:'12px 18px' }}>{showDeliveryForm ? '✕ Stäng' : '📦 Ny leverans'}</button>
          <button onClick={() => { setShowAdjustForm(!showAdjustForm); setShowDeliveryForm(false) }} style={{ ...btnStyle, background: showAdjustForm ? C.bark : '#c62828', fontSize:'0.88rem', padding:'12px 18px' }}>{showAdjustForm ? '✕ Stäng' : '❌ Logga svinn/saknat'}</button>
        </div>
        {showDeliveryForm && (
          <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 16 : 22, border:'1.5px solid '+C.moss, marginBottom:16 }}>
            <h3 style={{ color:C.bark, marginBottom:14, fontSize:'1rem' }}>📦 Registrera ny leverans</h3>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
              <Field label="Produkt">
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {PRODUCTS.map(p => (<button key={p.id} onClick={() => setDeliveryForm(f => ({ ...f, product: p.id }))} style={{ padding:'10px 14px', borderRadius:8, border:'2px solid '+(deliveryForm.product===p.id ? C.gold : C.parchment), background: deliveryForm.product===p.id ? '#fdf6d8' : '#fff', fontSize:'0.82rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark }}>{p.label}</button>))}
                </div>
              </Field>
              <Field label={'Antal (' + (PRODUCTS.find(p => p.id===deliveryForm.product)?.unit || '') + ')'}>
                <input type="number" min="0" step="0.25" value={deliveryForm.amount} onChange={e => setDeliveryForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={{ ...inp, width:'100%' }} />
              </Field>
              <Field label="Datum"><input type="date" value={deliveryForm.date} onChange={e => setDeliveryForm(f => ({ ...f, date: e.target.value }))} style={{ ...inp, width:'100%' }} /></Field>
              <Field label="Notering (valfritt)"><input value={deliveryForm.note} onChange={e => setDeliveryForm(f => ({ ...f, note: e.target.value }))} placeholder="T.ex. leverantör, ordernr..." style={{ ...inp, width:'100%' }} /></Field>
            </div>
            <button onClick={submitDelivery} style={{ width:'100%', padding:'14px', borderRadius:9, border:'none', background:C.moss, color:'#fff', fontFamily:'Georgia,serif', fontSize:'1rem', fontWeight:'bold', cursor:'pointer', marginTop:12 }}>✓ Registrera leverans</button>
          </div>
        )}
        {showAdjustForm && (
          <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 16 : 22, border:'1.5px solid #c62828', marginBottom:16 }}>
            <h3 style={{ color:C.bark, marginBottom:14, fontSize:'1rem' }}>❌ Logga svinn / saknat lager</h3>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
              <Field label="Produkt">
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {PRODUCTS.map(p => (<button key={p.id} onClick={() => setAdjustForm(f => ({ ...f, product: p.id }))} style={{ padding:'10px 14px', borderRadius:8, border:'2px solid '+(adjustForm.product===p.id ? '#c62828' : C.parchment), background: adjustForm.product===p.id ? '#fce8e8' : '#fff', fontSize:'0.82rem', cursor:'pointer', fontFamily:'Georgia,serif', color:C.bark }}>{p.label}</button>))}
                </div>
              </Field>
              <Field label={'Antal (' + (PRODUCTS.find(p => p.id===adjustForm.product)?.unit || '') + ')'}>
                <input type="number" min="0" step="0.25" value={adjustForm.amount} onChange={e => setAdjustForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={{ ...inp, width:'100%' }} />
              </Field>
              <Field label="Datum"><input type="date" value={adjustForm.date} onChange={e => setAdjustForm(f => ({ ...f, date: e.target.value }))} style={{ ...inp, width:'100%' }} /></Field>
              <Field label="Anledning (valfritt)"><input value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} placeholder="T.ex. skadade balar, felräkning..." style={{ ...inp, width:'100%' }} /></Field>
            </div>
            <button onClick={submitAdjustment} style={{ width:'100%', padding:'14px', borderRadius:9, border:'none', background:'#c62828', color:'#fff', fontFamily:'Georgia,serif', fontSize:'1rem', fontWeight:'bold', cursor:'pointer', marginTop:12 }}>✓ Logga svinn</button>
          </div>
        )}
        <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 16 : 22, border:'1.5px solid '+C.parchment, marginBottom:16 }}>
          <h3 style={{ color:C.bark, marginBottom:14, fontSize:'1rem' }}>Leveranshistorik</h3>
          {loadingInv ? <p style={{ color:C.muted }}>Laddar...</p> : deliveries.length === 0 ? <p style={{ color:C.muted, fontStyle:'italic', fontSize:'0.85rem' }}>Inga leveranser registrerade.</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {deliveries.map(d => {
                const prod = PRODUCTS.find(p => p.id === d.product)
                return (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:C.cream, borderRadius:8, border:'1px solid '+C.parchment }}>
                    <div>
                      <span style={{ fontWeight:'bold', color:C.bark, fontSize:'0.9rem' }}>{prod?.label || d.product}</span>
                      <span style={{ color:C.earth, fontSize:'0.85rem' }}> — {d.amount} {d.unit}</span>
                      {d.note && <span style={{ color:C.muted, fontSize:'0.75rem' }}> · {d.note}</span>}
                      <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>{d.date}</div>
                    </div>
                    <button onClick={() => deleteDelivery(d.id)} style={{ background:'#fce8e8', border:'none', borderRadius:7, width:34, height:34, cursor:'pointer', fontSize:'0.85rem' }}>🗑️</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {adjustments.length > 0 && (
          <div style={{ background:'#fff', borderRadius:12, padding: isMobile ? 16 : 22, border:'1.5px solid #e57373', marginBottom:16 }}>
            <h3 style={{ color:C.bark, marginBottom:14, fontSize:'1rem' }}>Svinn / Saknat</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {adjustments.map(a => {
                const prod = PRODUCTS.find(p => p.id === a.product)
                return (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'#fff8f8', borderRadius:8, border:'1px solid #e57373' }}>
                    <div>
                      <span style={{ fontWeight:'bold', color:'#c62828', fontSize:'0.9rem' }}>{prod?.label || a.product}</span>
                      <span style={{ color:C.earth, fontSize:'0.85rem' }}> — {a.amount} {a.unit}</span>
                      {a.reason && <span style={{ color:C.muted, fontSize:'0.75rem' }}> · {a.reason}</span>}
                      <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>{a.date}</div>
                    </div>
                    <button onClick={() => deleteAdjustment(a.id)} style={{ background:'#fce8e8', border:'none', borderRadius:7, width:34, height:34, cursor:'pointer', fontSize:'0.85rem' }}>🗑️</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </>)}
      <p style={{ color:C.muted, fontSize:'0.75rem', marginTop:10 }}>CSV öppnas direkt i Excel/Numbers. UTF-8 med BOM.</p>
    </div>
  )
}

function SettingsTab({ riderConfig, setRiderConfig, horseNames, isMobile }) {
  const [newName, setNewName] = useState({})
  const [newFrom, setNewFrom] = useState({})
  const [newTo, setNewTo] = useState({})
  const today = TODAY_DATE

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
