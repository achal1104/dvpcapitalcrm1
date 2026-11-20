import { useState } from 'react'
import { useStore } from './store'
import { STAGES, inr } from './data'
import { DelayBadge, ProcessingPanel, SanctionPanel } from './LoanOps'
const inp = 'rounded-lg border border-slate-300 p-2 text-sm'
const box = 'rounded-xl border border-slate-200 bg-white shadow-sm'
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const PRESETS = ['All time', 'Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'This month', 'Previous month', 'Financial year', 'Custom']
export function inRange(v: unknown, p: string, from: string, to: string) {
  if (p === 'All time') return true
  const d = String(v).slice(0, 10), n = new Date(), ago = (o: number) => { const x = new Date(n); x.setDate(x.getDate() - o); return ymd(x) }
  let a = '', b = ymd(n)
  if (p === 'Today') a = b; else if (p === 'Yesterday') a = b = ago(1); else if (p === 'Last 7 days') a = ago(6); else if (p === 'Last 30 days') a = ago(29)
  else if (p === 'This month') a = ymd(new Date(n.getFullYear(), n.getMonth(), 1))
  else if (p === 'Previous month') { a = ymd(new Date(n.getFullYear(), n.getMonth() - 1, 1)); b = ymd(new Date(n.getFullYear(), n.getMonth(), 0)) }
  else if (p === 'Financial year') { const y = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1; a = `${y}-04-01`; b = `${y + 1}-03-31` }
  else { a = from || '0000'; b = to || '9999' }
  return d >= a && d <= b
}
export function DateFilter({ dp, setDp, from, setFrom, to, setTo }: { dp: string; setDp: (v: string) => void; from: string; setFrom: (v: string) => void; to: string; setTo: (v: string) => void }) {
  return <div className="flex items-center gap-2"><select aria-label="Date range" value={dp} onChange={e => setDp(e.target.value)} className={inp}>{PRESETS.map(x => <option key={x}>{x}</option>)}</select>
    {dp === 'Custom' && <><input type="date" aria-label="From" value={from} onChange={e => setFrom(e.target.value)} className={inp} /><input type="date" aria-label="To" value={to} onChange={e => setTo(e.target.value)} className={inp} /></>}</div>
}
function ReplyBox({ onSend }: { onSend: (v: string) => void }) {
  const [v, setV] = useState('')
  return <span className="mt-1 flex gap-1"><input value={v} onChange={e => setV(e.target.value)} placeholder="Type your reply" className="rounded border border-slate-300 p-1 text-xs" /><button disabled={!v.trim()} onClick={() => onSend(v.trim())} className="rounded bg-royal px-2 text-xs text-white disabled:opacity-40">Send</button></span>
}
type D = { internal: string[]; customer: string[]; queries: { t: string; open: boolean; r?: string }[]; reason: string }
export function LoanDetail({ id, role, close }: { id: string; role: string; close: () => void }) {
  const loan = useStore(s => s.loans.find(l => l.id === id))!
  const k = 'dvp-ln-' + id
  const [d, setD] = useState<D>(() => { try { const j = localStorage.getItem(k); if (j) return JSON.parse(j) } catch { /* storage unavailable */ } return { internal: [], customer: [], queries: [], reason: '' } })
  const put = (x: D) => { setD(x); try { localStorage.setItem(k, JSON.stringify(x)) } catch { /* storage unavailable */ } }
  const ho = role !== 'Franchise Owner' && role !== 'Customer'
  const tabs = ['Overview', 'Processing', 'Sanction letter', 'Timeline', 'Queries', 'Customer remarks', ...(ho ? ['Internal remarks'] : [])]
  const [tab, setTab] = useState('Overview'); const [n, setN] = useState('')
  const sanc = Math.max(0, ...loan.lenders.filter(x => x.status === 'Approved').map(x => x.amount)); const idx = STAGES.indexOf(loan.stage)
  const none = <p className="text-sm text-slate-500">Nothing here yet.</p>
  const add = () => { const t = n.trim(); if (!t) return; put(tab === 'Queries' ? { ...d, queries: [...d.queries, { t, open: true }] } : tab === 'Customer remarks' ? { ...d, customer: [...d.customer, t] } : { ...d, internal: [...d.internal, t] }); setN('') }
  const canAdd = tab === 'Queries' ? ho : tab === 'Customer remarks' || tab === 'Internal remarks'
  return <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl">
    <div className="mb-3 flex items-center justify-between"><b className="text-lg text-navy">{loan.id} · {loan.customer}</b><button onClick={close} className="text-sm text-slate-500">Close</button></div>
    <div className="mb-4 flex flex-wrap gap-1">{tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-sm ${t === tab ? 'bg-royal text-white' : 'bg-slate-100'}`}>{t}</button>)}</div>
    {tab === 'Overview' && <div className="space-y-3 text-sm"><div className="flex gap-0.5">{STAGES.map((s, i) => <div key={s} title={s} className={`h-1.5 flex-1 rounded ${i <= idx ? 'bg-royal' : 'bg-slate-200'}`} />)}</div><p className="flex flex-wrap items-center gap-2 font-semibold">{loan.stage}<DelayBadge loan={loan} /></p>
      {[['Category', loan.category], ['Handled by', loan.assignee ?? 'Not assigned'], ['Sanction letter', loan.sanctions?.length ? `Uploaded (${loan.sanctions.length})` : sanc ? 'Not uploaded' : '—'], ['Requested', inr(loan.amount)], ['Sanctioned (best approved offer)', sanc ? inr(sanc) : '—'], ['Disbursed', loan.disbursed ? inr(loan.disbursed) : '—']].map(([a, b]) => <div key={a} className="flex justify-between border-b border-slate-100 py-1"><span className="text-slate-500">{a}</span><span>{b}</span></div>)}
      {loan.lenders.length > 0 && <div className="pt-2"><div className="mb-1 text-xs font-semibold text-slate-500">Lender submissions</div>{loan.lenders.map((x, i) => <div key={i} className="flex flex-wrap justify-between gap-x-3 border-b border-slate-100 py-1"><span>{x.name}</span><span className="text-slate-500">{x.appId ? 'ID ' + x.appId : x.status === 'Not Submitted' ? 'Not submitted' : 'ID pending'}</span><span>{x.status}{x.amount ? ' · ' + inr(x.amount) : ''}</span></div>)}</div>}
      {loan.stage.startsWith('Closed') && <input value={d.reason} disabled={!ho} onChange={e => put({ ...d, reason: e.target.value })} placeholder="Rejection or closure reason" className={inp + ' w-full'} />}</div>}
    {tab === 'Processing' && <ProcessingPanel loan={loan} role={role} />}
    {tab === 'Sanction letter' && <SanctionPanel loan={loan} role={role} />}
    {tab === 'Timeline' && ((loan.h?.length ? loan.h.map((x, i) => <p key={i} className="border-b border-slate-100 py-2 text-sm">{x}</p>) : none))}
    {tab === 'Queries' && <div className="space-y-2">{d.queries.length ? d.queries.map((q, i) => <div key={i} className="flex items-center justify-between rounded bg-slate-50 p-2 text-sm"><span className={q.open ? '' : 'text-slate-400 line-through'}>{q.t}{q.r && <em className="mt-1 block text-xs not-italic text-green-700">Reply: {q.r}</em>}{!ho && q.open && !q.r && <ReplyBox onSend={v => put({ ...d, queries: d.queries.map((x, j) => j === i ? { ...x, r: v } : x) })} />}</span><button className="text-royal" onClick={() => put({ ...d, queries: d.queries.map((x, j) => j === i ? { ...x, open: !x.open } : x) })}>{q.open ? 'Mark resolved' : 'Reopen'}</button></div>) : none}</div>}
    {tab === 'Customer remarks' && (d.customer.length ? d.customer.map((x, i) => <p key={i} className="rounded bg-slate-50 p-2 text-sm">{x}</p>) : none)}
    {tab === 'Internal remarks' && (d.internal.length ? d.internal.map((x, i) => <p key={i} className="rounded bg-amber-50 p-2 text-sm">{x}</p>) : none)}
    {canAdd && <div className="mt-3 space-y-2"><textarea value={n} onChange={e => setN(e.target.value)} placeholder={tab === 'Queries' ? 'Raise a query for the franchise' : 'Add a remark'} className={inp + ' w-full'} /><button onClick={add} className="rounded-lg bg-royal px-3 py-1.5 text-sm text-white">{tab === 'Queries' ? 'Raise query' : 'Add remark'}</button></div>}
  </div>
}
const PERF = [{ n: 'Akshay Finance', leads: 62, files: 31, disb: 18500000, svc: 92 }, { n: 'Mumbai Credit Hub', leads: 48, files: 22, disb: 14200000, svc: 85 }, { n: 'Nashik Finserv', leads: 35, files: 14, disb: 7500000, svc: 70 }, { n: 'Satara Capital', leads: 12, files: 3, disb: 0, svc: 40 }]
export function Performance() {
  const m = (k: 'leads' | 'files' | 'disb') => Math.max(...PERF.map(p => p[k]))
  const rows = PERF.map(p => { const s = Math.round(20 * p.leads / m('leads') + 20 * p.files / m('files') + 40 * p.disb / m('disb') + 20 * p.svc / 100); return { ...p, s, cat: s >= 85 ? 'Premium Performer' : s >= 65 ? 'Growth Franchise' : s >= 40 ? 'Active Franchise' : s >= 15 ? 'New Franchise' : 'Inactive Franchise' } }).sort((a, b) => b.s - a.s)
  return <div className="space-y-3"><h1 className="text-2xl font-bold text-navy">Franchise leaderboard</h1><p className="text-sm text-slate-500">Score = leads 20% + files submitted 20% + disbursement 40% + query resolution 20%. Weights are illustrative and sample data is used.</p>
    <div className={box + ' overflow-x-auto'}><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Rank', 'Franchise', 'Leads', 'Files', 'Disbursed', 'Query resolution', 'Score', 'Category'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={r.n} className="border-t border-slate-100"><td className="px-4 py-3">{i + 1}</td><td className="px-4 py-3 font-medium">{r.n}</td><td className="px-4 py-3">{r.leads}</td><td className="px-4 py-3">{r.files}</td><td className="px-4 py-3">{inr(r.disb)}</td><td className="px-4 py-3">{r.svc}%</td>
        <td className="px-4 py-3"><div className="h-2 w-24 rounded bg-slate-200"><div className="h-2 rounded bg-gold" style={{ width: r.s + '%' }} /></div>{r.s}</td><td className="px-4 py-3">{r.cat}</td></tr>)}</tbody></table></div></div>
}
const RMS = ['Unassigned', 'Neha Joshi', 'Sandeep Kale', 'Rutuja More']
export function HighTicket() {
  const loans = useStore(s => s.loans).filter(l => l.amount >= 5000000)
  const [a, setA] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem('dvp-ht') || '{}') } catch { return {} } })
  const set = (id: string, v: string) => { const x = { ...a, [id]: v }; setA(x); try { localStorage.setItem('dvp-ht', JSON.stringify(x)) } catch { /* storage unavailable */ } }
  return <div className="space-y-3"><h1 className="text-2xl font-bold text-navy">High-ticket loan desk</h1><p className="text-sm text-slate-500">Files of ₹50 lakh and above, assigned to a senior relationship manager.</p>
    <div className={box + ' overflow-x-auto'}><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Loan', 'Customer', 'Category', 'Amount', 'Stage', 'Lenders', 'Senior RM'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody>{loans.map(l => <tr key={l.id} className="border-t border-slate-100"><td className="px-4 py-3">{l.id}</td><td className="px-4 py-3">{l.customer}</td><td className="px-4 py-3">{l.category}</td><td className="px-4 py-3">{inr(l.amount)}</td><td className="px-4 py-3">{l.stage}</td><td className="px-4 py-3">{l.lenders.length}</td>
        <td className="px-4 py-3"><select value={a[l.id] ?? 'Unassigned'} onChange={e => set(l.id, e.target.value)} className="rounded-md border border-slate-200 p-1 text-xs">{RMS.map(x => <option key={x}>{x}</option>)}</select></td></tr>)}
        {loans.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No files of ₹50 lakh or above yet.</td></tr>}</tbody></table></div></div>
}
