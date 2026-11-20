import { useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LogOut, Menu, Search, Trash2, Plus, Landmark, X } from 'lucide-react'
import { useStore } from './store'
import { useIdleLogout } from './Extras'
import { Login, ChangePassword } from './Login'
import { Page, LeadsView, tableRows } from './Modules2'
import { HAS_OWN_DASHBOARD, RoleDashboard } from './Dashboards'
import { CustomerHome, Landing, commSummary, loadComm } from './Modules4'
import { CAT_MIX, FRANCHISES, FR_PERF, LEAD_STATUS, LOAN_CATS, MY_FRANCHISE, REVENUE, ROLES, STAGES, TREND, inr, navFor, slug, type Lead, type Role } from './data'

const card = 'rounded-xl bg-white border border-slate-200 shadow-sm'
const COLORS = ['#0b1f44','#1d4ed8','#c9a227','#60a5fa','#94a3b8']

function Layout({ role }: { role: Role }) {
  const [open, setOpen] = useState(false); const logout = useStore(s => s.logout); useIdleLogout(logout)
  const items = navFor(role); const loc = useLocation()
  const title = items.find(i => '/' + slug(i) === loc.pathname) ?? 'Dashboard'
  return (
    <div className="min-h-screen lg:flex lg:items-start">
      {open && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`no-scrollbar fixed inset-y-0 left-0 z-30 w-64 shrink-0 overflow-y-auto overscroll-contain bg-navy p-4 text-slate-200 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
        <div className="mb-6 flex items-start justify-between"><div className="flex items-center gap-2"><Landmark className="text-gold" /><b className="text-lg text-white">DVP CAPITALS</b></div><button className="lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X /></button></div>        <nav className="space-y-1">{items.map(i => (
          <NavLink key={i} to={'/' + slug(i)} onClick={() => setOpen(false)} className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-royal text-white border-l-2 border-gold' : 'hover:bg-white/10'}`}>{i}</NavLink>))}</nav>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
          <div className="min-w-0 truncate text-sm text-slate-500"><span className="hidden sm:inline">DVP CAPITALS / </span><span className="font-semibold text-navy">{title}</span></div>
          <div className="ml-auto flex items-center gap-3 text-sm"><span className="hidden rounded-full bg-amber-50 px-3 py-1 text-amber-700 sm:inline">{role}</span>
            <NavLink to="/change-password" className="text-slate-600 hover:text-royal"><span className="hidden sm:inline">Change password</span><span className="sm:hidden">Password</span></NavLink><button onClick={logout} className="flex items-center gap-1 text-slate-600 hover:text-red-600"><LogOut size={16} />Log out</button></div>
        </header>
        <main className="p-4 lg:p-6">
          <Routes>
            <Route path="/dashboard" element={role === 'Customer' ? <CustomerHome /> : HAS_OWN_DASHBOARD.includes(role) ? <RoleDashboard role={role} /> : <Dashboard role={role} />} />
            <Route path="/leads" element={<LeadsView role={role}><Leads role={role} /></LeadsView>} />
            {items.filter(i => !['Dashboard', 'Leads'].includes(i)).map(i => <Route key={i} path={'/' + slug(i)} element={<Page name={i} role={role} />} />)}
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className={card + ' p-4'}><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold text-navy">{value}</div></div>
}

function Dashboard({ role }: { role: Role }) {
  const leads = useStore(s => s.leads); const loans = useStore(s => s.loans)
  const fr = role === 'Franchise Owner'
  const mine = fr ? leads.filter(l => l.franchise === MY_FRANCHISE) : leads
  const kpis: [string, string | number][] = fr
    ? (() => { const L = loans.filter(l => l.franchise === MY_FRANCHISE); const at = (a: string, b: string) => L.filter(l => STAGES.indexOf(l.stage) >= STAGES.indexOf(a) && STAGES.indexOf(l.stage) <= STAGES.indexOf(b)).length; const c = commSummary(loadComm(), MY_FRANCHISE)
      return [['Total leads', mine.length], ['New customers', mine.filter(l => l.status === 'New Lead').length], ['Documents pending', L.filter(l => l.stage === 'Documents Pending').length], ['Files submitted', at('File Submitted', 'Disbursed')], ['Under processing', at('Under Verification', 'Under Bank Processing')], ['Approved loans', at('Approved / Sanctioned', 'Disbursement Pending')], ['Disbursed loans', L.filter(l => l.stage === 'Disbursed').length], ['Total loan value', inr(L.reduce((a, l) => a + l.disbursed, 0))], ['Commission earned', inr(c.earned)], ['Pending commission', inr(c.pending)], ['Paid commission', inr(c.paid)]] as [string, string | number][] })()
    : (() => { const fr = tableRows('Franchise Management'); const cm = loadComm(); return [['Total franchises', fr.length], ['Active franchises', fr.filter(f => f.status === 'Active').length], ['Pending applications', fr.filter(f => ['Inquiry', 'Under Verification', 'Agreement Pending'].includes(String(f.status))).length], ['Total leads', leads.length], ['Loan applications', loans.length], ['Disbursed loans', loans.filter(l => l.stage === 'Disbursed').length], ['Disbursement value', inr(loans.reduce((a, l) => a + l.disbursed, 0))], ['Registered customers', tableRows('Customers').length], ['Lender commission received', inr(cm.reduce((a, r) => a + r.received, 0))], ['Franchise commission payable', inr(commSummary(cm).payable)], ['Franchise commission paid', inr(commSummary(cm).paid)]] as [string, string | number][] })()
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-navy">{fr ? MY_FRANCHISE : 'Head office overview'}</h1><p className="text-sm text-slate-500">{fr ? 'Sample data for demonstration.' : 'Numbers are live from the CRM. Trend charts use sample data.'}</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(([l, v]) => <Stat key={l} label={l} value={v} />)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card + ' p-4'}><b className="text-sm">Monthly revenue and commission</b><div className="h-64"><ResponsiveContainer><AreaChart data={REVENUE}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="m" /><YAxis tickFormatter={v => v / 100000 + 'L'} /><Tooltip formatter={(v: number) => inr(v)} /><Area dataKey="revenue" stroke="#1d4ed8" fill="#dbeafe" /><Area dataKey="commission" stroke="#c9a227" fill="#fef3c7" /></AreaChart></ResponsiveContainer></div></div>
        <div className={card + ' p-4'}><b className="text-sm">Applications vs disbursed</b><div className="h-64"><ResponsiveContainer><BarChart data={TREND}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="m" /><YAxis /><Tooltip /><Bar dataKey="applied" fill="#0b1f44" radius={4} /><Bar dataKey="disbursed" fill="#c9a227" radius={4} /></BarChart></ResponsiveContainer></div></div>
        {!fr && <div className={card + ' p-4'}><b className="text-sm">Franchise performance (disbursed files)</b><div className="h-64"><ResponsiveContainer><BarChart data={FR_PERF} layout="vertical"><XAxis type="number" /><YAxis type="category" dataKey="n" width={96} /><Tooltip /><Bar dataKey="v" fill="#1d4ed8" radius={4} /></BarChart></ResponsiveContainer></div></div>}
        <div className={card + ' p-4'}><b className="text-sm">Loan category mix (%)</b><div className="h-64"><ResponsiveContainer><PieChart><Pie data={CAT_MIX} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>{CAT_MIX.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></div>
      </div>
    </div>
  )
}

const SOURCES = ['Website', 'Facebook', 'Instagram', 'Google Ads', 'WhatsApp', 'Walk-in', 'Customer Referral', 'Business Networking', 'Referral link', 'Franchise entry', 'Other']
function Leads({ role }: { role: Role }) {
  const { leads, loans, addLead, addLoan, setStatus, removeLead } = useStore()
  const [q, setQ] = useState(''); const [sf, setSf] = useState('All'); const [ff, setFf] = useState('All'); const [show, setShow] = useState(false); const [msg, setMsg] = useState('')
  const [f, setF] = useState({ name: '', mobile: '', city: '', category: LOAN_CATS[0], amount: 500000, source: SOURCES[0] })
  const fr = role === 'Franchise Owner'
  const rows = leads.filter(l => (!fr || l.franchise === MY_FRANCHISE) && (sf === 'All' || l.status === sf) && (fr || ff === 'All' || l.franchise === ff) && (l.name + l.mobile + l.id + (l.city ?? '')).toLowerCase().includes(q.toLowerCase()))
  const dup = f.mobile.length > 0 && leads.some(l => l.mobile === f.mobile)
  const valid = f.name.trim().length > 1 && /^[6-9]\d{9}$/.test(f.mobile) && f.amount > 0 && !dup
  const loanFor = (l: Lead) => loans.find(x => x.customer === l.name && x.category === l.category && !x.stage.startsWith('Closed'))
  const convert = (l: Lead) => { const id = addLoan({ customer: l.name, category: l.category, amount: l.amount, stage: 'Documents Pending', franchise: l.franchise, lenders: [], disbursed: 0 }); setStatus(l.id, 'Documents Pending'); setMsg(`Loan file ${id} created for ${l.name}. Collect documents next.`) }
  const csv = () => { const cols: (keyof Lead)[] = ['id', 'name', 'mobile', 'city', 'category', 'amount', 'source', 'franchise', 'status']; const body = [cols, ...rows.map(r => cols.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`))].map(a => a.join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); a.download = 'leads.csv'; a.click() }
  const fld = 'rounded-lg border border-slate-300 p-2 text-sm'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-navy">Leads</h1>
        <div className="relative ml-auto"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, mobile, city, ID" className="rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" /></div>
        <select aria-label="Status filter" value={sf} onChange={e => setSf(e.target.value)} className={fld}>{['All', ...LEAD_STATUS].map(s => <option key={s}>{s}</option>)}</select>
        {!fr && <select aria-label="Franchise filter" value={ff} onChange={e => setFf(e.target.value)} className={fld}>{['All', ...FRANCHISES, 'Head Office'].map(s => <option key={s}>{s}</option>)}</select>}
        {!fr && <button onClick={csv} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Export CSV</button>}
        <button onClick={() => setShow(!show)} className="flex items-center gap-1 rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white"><Plus size={16} />Add lead</button></div>
      {msg && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{msg}</p>}
      {show && <div className={card + ' grid gap-3 p-4 sm:grid-cols-4'}>
        <input placeholder="Customer name" aria-label="Customer name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className={fld} />
        <div><input placeholder="Mobile (10 digits)" aria-label="Mobile" value={f.mobile} onChange={e => setF({ ...f, mobile: e.target.value })} className={'w-full ' + fld} />{dup && <p className="text-xs text-amber-600">Duplicate mobile number: this lead already exists.</p>}</div>
        <input placeholder="City" aria-label="City" value={f.city} onChange={e => setF({ ...f, city: e.target.value })} className={fld} />
        <select aria-label="Loan category" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} className={fld}>{LOAN_CATS.map(c => <option key={c}>{c}</option>)}</select>
        <input type="number" aria-label="Amount" value={f.amount} onChange={e => setF({ ...f, amount: +e.target.value })} className={fld} />
        <select aria-label="Lead source" value={f.source} onChange={e => setF({ ...f, source: e.target.value })} className={fld}>{SOURCES.map(c => <option key={c}>{c}</option>)}</select>
        <button disabled={!valid} onClick={() => { addLead({ ...f, city: f.city.trim(), status: 'New Lead', franchise: fr ? MY_FRANCHISE : 'Head Office' }); setF({ ...f, name: '', mobile: '', city: '' }); setShow(false) }} className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 sm:col-span-2">Save lead</button></div>}
      <div className={card + ' overflow-x-auto'}>
        <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['ID', 'Customer', 'Mobile', 'City', 'Category', 'Amount', 'Source', 'Franchise', 'Status', 'Loan file', ''].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rows.map(l => { const ln = loanFor(l); return <tr key={l.id} className="border-t border-slate-100">
            <td className="px-4 py-3">{l.id}</td><td className="px-4 py-3 font-medium">{l.name}</td><td className="px-4 py-3">+91 {l.mobile}</td><td className="px-4 py-3">{l.city || '—'}</td><td className="px-4 py-3">{l.category}</td><td className="px-4 py-3">{inr(l.amount)}</td><td className="px-4 py-3">{l.source || '—'}</td><td className="px-4 py-3">{l.franchise}</td>
            <td className="px-4 py-3"><select value={l.status} onChange={e => setStatus(l.id, e.target.value)} className="rounded-md border border-slate-200 p-1 text-xs">{LEAD_STATUS.map(s => <option key={s}>{s}</option>)}</select></td>
            <td className="px-4 py-3">{ln ? <span className="text-xs text-slate-600">{ln.id}</span> : l.status === 'Lost' ? '—' : <button onClick={() => convert(l)} className="rounded bg-royal px-2 py-1 text-xs text-white">Create loan file</button>}</td>
            <td className="px-4 py-3"><button title="Delete lead" onClick={() => confirm(`Delete ${l.name}?`) && removeLead(l.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button></td></tr> })}
            {rows.length === 0 && <tr><td colSpan={11} className="p-8 text-center text-slate-500">No leads match. Add a lead to get started.</td></tr>}</tbody></table>
      </div>
    </div>
  )
}

export default function App() {
  const role = useStore(s => s.role)
  return <Routes><Route path="/apply/:slug" element={<Landing />} /><Route path="/login" element={role ? <Navigate to="/dashboard" /> : <Login />} /><Route path="/*" element={role ? <Layout role={role} /> : <Navigate to="/login" />} /></Routes>
}
