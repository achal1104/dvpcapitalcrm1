import { useEffect, useState } from 'react'
import { Download, Plus, Search, Trash2 } from 'lucide-react'
import { MY_FRANCHISE, daysUntil, notifyCustomer, notifyHO, readJson, todayStr, writeJson } from './data'
import { ACCEPT, FilePreview, checkFile, delBlob, fmtSize, mimeOf, putBlob, readDataUrl } from './FileKit'
import { fmtWhen } from './ops'

type Ver = { v: number; name: string; size: number; mime: string; on: string; by: string; note?: string }
type Remark = { t: string; by: string; at: string }
export type Doc = { id: string; customer: string; docType: string; file: string; status: string; franchise?: string; expiry?: string; versions?: Ver[]; remarks?: Remark[]; alert?: string; _h?: string[] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Seed = Record<string, any>
type Props = { storeKey: string; pre: string; title: string; note?: string; seed: Seed[]; customerMode?: boolean; role: string; types: string[]; statuses: string[]; franchises: string[] }

export const VERIFY_ROLES = ['Super Admin', 'Operations Manager', 'Loan Processing Executive', 'Document Verification Executive']
export const EXPIRY_WARN_DAYS = 30
type Exp = 'none' | 'ok' | 'soon' | 'expired'
export const expState = (d?: string): Exp => (!d ? 'none' : daysUntil(d) < 0 ? 'expired' : daysUntil(d) <= EXPIRY_WARN_DAYS ? 'soon' : 'ok')
/** Versions of a record. Older records only have a file name, so they count as version 1 with no stored file. */
export const versionsOf = (d: Doc): Ver[] => d.versions?.length ? d.versions : d.file ? [{ v: 1, name: d.file, size: 0, mime: mimeOf(d.file), on: '', by: '' }] : []
const blobKey = (id: string, v: number) => `doc-${id}-v${v}`
const inp = 'rounded-lg border border-slate-300 p-2 text-sm'
const tone: Record<string, string> = { Verified: 'bg-green-50 text-green-700', Uploaded: 'bg-blue-50 text-blue-700', Rejected: 'bg-red-50 text-red-700', Missing: 'bg-amber-50 text-amber-800' }

function ExpiryBadge({ d }: { d?: string }) {
  const st = expState(d); if (st === 'none') return <span className="text-slate-400">—</span>
  const n = daysUntil(d!)
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${st === 'expired' ? 'bg-red-100 text-red-700' : st === 'soon' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{d}{st === 'expired' ? ` · expired ${-n}d ago` : st === 'soon' ? ` · ${n === 0 ? 'today' : n + 'd left'}` : ''}</span>
}

export function DocsPage({ storeKey, pre, title, note, seed, customerMode, role, types, statuses, franchises }: Props) {
  const key = 'dvp-m-' + storeKey
  const [all, setAll] = useState<Doc[]>(() => readJson<Doc[]>(key, seed as Doc[]))
  const put = (r: Doc[]) => { setAll(r); writeJson(key, r) }
  const fo = role === 'Franchise Owner'; const verifier = VERIFY_ROLES.includes(role)
  const [q, setQ] = useState(''); const [fs, setFs] = useState('All'); const [fe, setFe] = useState('All'); const [pg, setPg] = useState(0)
  const [open, setOpen] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [fk, setFk] = useState(0)
  const [nf, setNf] = useState({ customer: '', docType: types[0], franchise: franchises[0], expiry: '', remark: '' }); const [nfile, setNfile] = useState<File | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const stamp = (d: Doc, m: string): Doc => ({ ...d, _h: [...(d._h ?? []), `${m} (${fmtWhen(new Date().toISOString())}, ${role})`] })
  const patch = (id: string, f: (d: Doc) => Doc) => put(all.map(d => d.id === id ? f(d) : d))

  // Expiry alerts: notify once when a document enters "expiring soon" or "expired", and again if it moves from soon to expired.
  useEffect(() => {
    const cur = readJson<Doc[]>(key, seed as Doc[]); const want = (d: Doc) => { const s = expState(d.expiry); return s === 'soon' || s === 'expired' ? s : undefined }
    const hit = cur.filter(d => (d.alert || undefined) !== want(d)); if (!hit.length) return
    hit.forEach(d => { const s = want(d); if (!s) return; const m = `${d.docType} for ${d.customer} ${s === 'expired' ? 'has expired' : `expires in ${daysUntil(d.expiry!)} days`}`; if (customerMode) notifyCustomer(m); else notifyHO(m, 'Document Expiring') })
    const next = cur.map(d => hit.includes(d) ? { ...d, alert: want(d) } : d); writeJson(key, next); setAll(next)
  }, [key, seed, customerMode])

  const visible = all.filter(d => !fo || customerMode || d.franchise === MY_FRANCHISE)
  const nExp = visible.filter(d => expState(d.expiry) === 'expired').length; const nSoon = visible.filter(d => expState(d.expiry) === 'soon').length
  const rows = visible.filter(d => (fs === 'All' || d.status === fs) && (fe === 'All' || (fe === 'Expired' ? expState(d.expiry) === 'expired' : fe === 'Expiring soon' ? expState(d.expiry) === 'soon' : expState(d.expiry) === 'none')) && JSON.stringify([d.id, d.customer, d.docType, d.file, d.status, d.remarks]).toLowerCase().includes(q.toLowerCase()))
  const pages = Math.max(1, Math.ceil(rows.length / 8)); const view = rows.slice(pg * 8, pg * 8 + 8)
  const chosen = all.find(d => d.id === sel)

  const store = async (id: string, file: File, v: number): Promise<{ ver: Ver } | { error: string }> => {
    const bad = checkFile(file); if (bad) return { error: bad }
    try { const e = putBlob(blobKey(id, v), await readDataUrl(file)); if (e) return { error: e } } catch (x) { return { error: (x as Error).message } }
    return { ver: { v, name: file.name, size: file.size, mime: mimeOf(file.name), on: new Date().toISOString(), by: role } }
  }
  const create = async () => {
    const customer = customerMode ? 'Me' : nf.customer.trim(); if (customer.length < 2) return setErr('Enter the customer name.')
    if (nf.expiry && nf.expiry < todayStr() && !confirm('This expiry date is already in the past. Add anyway?')) return
    const dup = all.find(d => d.customer.toLowerCase() === customer.toLowerCase() && d.docType === nf.docType)
    if (dup && !confirm(`${nf.docType} for ${customer} already exists (${dup.id}). To add a newer copy, open it and use Replace so the old file is kept in version history.\n\nAdd a separate record anyway?`)) return
    setBusy(true)
    const id = `${pre}-${Math.max(100, ...all.map(y => parseInt(y.id.replace(/\D/g, '')) || 0)) + 1}`
    let versions: Ver[] = []
    if (nfile) { const r = await store(id, nfile, 1); if ('error' in r) { setBusy(false); return setErr(r.error) } versions = [{ ...r.ver, note: nf.remark.trim() || undefined }] }
    const now = new Date().toISOString()
    const row: Doc = stamp({ id, customer, docType: nf.docType, file: nfile?.name ?? '', status: nfile ? 'Uploaded' : 'Missing', franchise: customerMode ? undefined : fo ? MY_FRANCHISE : nf.franchise, expiry: nf.expiry || undefined, versions, remarks: nf.remark.trim() ? [{ t: nf.remark.trim(), by: role, at: now }] : [] }, nfile ? `Uploaded v1: ${nfile.name}` : 'Requested (no file yet)')
    put([row, ...all]); if (!customerMode) notifyHO(`${nf.docType} ${nfile ? 'uploaded' : 'requested'} for ${customer} (${id})`, nfile ? 'Document Uploaded' : 'Document Requested')
    setNf({ ...nf, customer: '', expiry: '', remark: '' }); setNfile(null); setFk(fk + 1); setErr(''); setOpen(false); setBusy(false)
  }
  const replace = async (d: Doc, file: File, expiry: string, why: string): Promise<string | null> => {
    const vs = versionsOf(d); const v = Math.max(0, ...vs.map(x => x.v)) + 1
    const r = await store(d.id, file, v); if ('error' in r) return r.error
    const was = d.status; const now = new Date().toISOString()
    patch(d.id, x => stamp({ ...x, file: file.name, status: 'Uploaded', versions: [...vs, { ...r.ver, note: why || undefined }], expiry: expiry || x.expiry, remarks: why ? [...(x.remarks ?? []), { t: `New version v${v}: ${why}`, by: role, at: now }] : x.remarks }, `${vs.length ? 'Replaced with' : 'Uploaded'} v${v}: ${file.name}${was === 'Verified' ? ' (needs re-verification)' : ''}`))
    if (!customerMode) notifyHO(`${d.docType} for ${d.customer} ${vs.length ? 'replaced (v' + v + ')' : 'uploaded'}${was === 'Verified' ? ', needs re-verification' : ''} (${d.id})`, 'Document Uploaded')
    return null
  }
  const setStatus = (d: Doc, s: string) => {
    if (s === d.status) return
    if (s === 'Verified' && !versionsOf(d).length) return alert('Upload a file before verifying this document.')
    if (s === 'Verified' && expState(d.expiry) === 'expired' && !confirm('This document has expired. Verify anyway?')) return
    let reason = ''
    if (s === 'Rejected') { reason = (prompt('Reason for rejection (required). The uploader will see this remark.') ?? '').trim(); if (!reason) return }
    const now = new Date().toISOString()
    patch(d.id, x => stamp({ ...x, status: s, remarks: reason ? [...(x.remarks ?? []), { t: `Rejected: ${reason}`, by: role, at: now }] : x.remarks }, `Status: ${s}`))
    if (s === 'Rejected') { notifyHO(`${d.docType} for ${d.customer} was rejected: ${reason}`, 'Document Rejected'); if (customerMode) notifyCustomer(`Your ${d.docType} was rejected: ${reason}. Please upload it again.`) }
  }
  const remove = (d: Doc) => { if (!confirm('Delete this document and all its versions?')) return; versionsOf(d).forEach(x => delBlob(blobKey(d.id, x.v))); put(all.filter(y => y.id !== d.id)); if (sel === d.id) setSel(null) }
  const csv = () => {
    const cols = ['id', 'customer', 'docType', 'file', 'version', 'status', 'expiry', 'expiryStatus', 'remarks']
    const body = [cols, ...rows.map(d => [d.id, d.customer, d.docType, d.file, String(versionsOf(d).length), d.status, d.expiry ?? '', expState(d.expiry), (d.remarks ?? []).map(r => r.t).join(' | ')])].map(a => a.map(x => `"${x.replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); a.download = storeKey + '.csv'; a.click()
  }
  const flt = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => { set(e.target.value); setPg(0) }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-navy">{title}</h1>
      <div className="relative ml-auto"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={q} onChange={e => { setQ(e.target.value); setPg(0) }} placeholder="Search" className={inp + ' pl-9'} /></div>
      <select aria-label="Filter by status" value={fs} onChange={flt(setFs)} className={inp}>{['All', ...statuses].map(s => <option key={s}>{s}</option>)}</select>
      <select aria-label="Filter by expiry" value={fe} onChange={flt(setFe)} className={inp}>{['All', 'Expired', 'Expiring soon', 'No expiry date'].map(s => <option key={s}>{s}</option>)}</select>
      <button onClick={csv} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><Download size={16} />Export CSV</button>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white"><Plus size={16} />Add</button></div>
    {note && <p className="text-sm text-slate-500">{note}</p>}
    {(nExp > 0 || nSoon > 0) && <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <b>Expiry alert</b>{nExp > 0 && <button className="underline" onClick={() => { setFe('Expired'); setPg(0) }}>{nExp} expired</button>}{nSoon > 0 && <button className="underline" onClick={() => { setFe('Expiring soon'); setPg(0) }}>{nSoon} expiring within {EXPIRY_WARN_DAYS} days</button>}<span className="text-xs">Ask for a fresh copy and use Replace so the old file stays in version history.</span></div>}
    {open && <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
      {!customerMode && <input aria-label="Customer" placeholder="Customer name" value={nf.customer} onChange={e => setNf({ ...nf, customer: e.target.value })} className={inp} />}
      <select aria-label="Document" value={nf.docType} onChange={e => setNf({ ...nf, docType: e.target.value })} className={inp}>{types.map(t => <option key={t}>{t}</option>)}</select>
      {!customerMode && !fo && <select aria-label="Franchise" value={nf.franchise} onChange={e => setNf({ ...nf, franchise: e.target.value })} className={inp}>{franchises.map(t => <option key={t}>{t}</option>)}</select>}
      <label className="text-xs text-slate-500">Expiry date (optional)<input type="date" value={nf.expiry} onChange={e => setNf({ ...nf, expiry: e.target.value })} className={inp + ' w-full'} /></label>
      <label className="text-xs text-slate-500">File (PDF, JPG, PNG). Leave empty to request it<input key={fk} type="file" accept={ACCEPT} onChange={e => setNfile(e.target.files?.[0] ?? null)} className={inp + ' w-full'} /></label>
      <input aria-label="Remark" placeholder="Remark (optional)" value={nf.remark} onChange={e => setNf({ ...nf, remark: e.target.value })} className={inp} />
      <button disabled={busy} onClick={create} className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Save'}</button>{err && <p role="alert" className="text-sm text-red-600 sm:col-span-3">{err}</p>}</div>}
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['ID', ...(customerMode ? [] : ['Customer']), 'Document', 'File', 'Status', 'Expiry', 'Remarks', ''].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody>{view.map(d => { const vs = versionsOf(d); const last = (d.remarks ?? [])[(d.remarks ?? []).length - 1]
        return <tr key={d.id} className="border-t border-slate-100 align-top">
          <td className="px-4 py-3"><button className="text-royal underline" onClick={() => setSel(d.id)}>{d.id}</button></td>{!customerMode && <td className="px-4 py-3">{d.customer}</td>}<td className="px-4 py-3">{d.docType}</td>
          <td className="px-4 py-3">{d.file ? <>{d.file}<span className="ml-1 rounded bg-slate-100 px-1.5 text-xs text-slate-600">v{vs.length}</span></> : <span className="text-slate-400">No file</span>}</td>
          <td className="px-4 py-3">{verifier ? <select aria-label={`Status of ${d.id}`} value={d.status} className="rounded-md border border-slate-200 bg-white p-1 text-xs" onChange={e => setStatus(d, e.target.value)}>{statuses.map(o => <option key={o}>{o}</option>)}</select> : <span className={`rounded-full px-2 py-0.5 text-xs ${tone[d.status] ?? 'bg-slate-100'}`}>{d.status}</span>}</td>
          <td className="px-4 py-3"><ExpiryBadge d={d.expiry} /></td>
          <td className="max-w-48 px-4 py-3 text-xs text-slate-600">{last ? <button className="text-left" title={last.t} onClick={() => setSel(d.id)}><span className="line-clamp-2">{last.t}</span><span className="text-slate-400">{(d.remarks ?? []).length} total</span></button> : <span className="text-slate-400">—</span>}</td>
          <td className="flex gap-3 px-4 py-3"><button className="text-sm text-royal" onClick={() => setSel(d.id)}>{d.file ? 'Preview / Replace' : 'Upload'}</button>
            {(verifier || d.status !== 'Verified') && <button title="Delete" onClick={() => remove(d)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>}</td></tr> })}
        {view.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500">Nothing here yet. Use Add to create the first record.</td></tr>}</tbody></table></div>
    <div className="flex items-center justify-end gap-3 text-sm text-slate-500"><button disabled={pg === 0} onClick={() => setPg(pg - 1)} className="disabled:opacity-40">Previous</button>Page {pg + 1} of {pages}<button disabled={pg + 1 >= pages} onClick={() => setPg(pg + 1)} className="disabled:opacity-40">Next</button></div>
    {chosen && <DocDrawer key={chosen.id} d={chosen} role={role} verifier={verifier} statuses={statuses} customerMode={!!customerMode} close={() => setSel(null)} onReplace={replace} onStatus={setStatus}
      onExpiry={e => patch(chosen.id, x => stamp({ ...x, expiry: e || undefined }, e ? `Expiry set to ${e}` : 'Expiry cleared'))}
      onRemark={t => patch(chosen.id, x => ({ ...x, remarks: [...(x.remarks ?? []), { t, by: role, at: new Date().toISOString() }] }))} />}
  </div>
}

function DocDrawer({ d, role, verifier, statuses, customerMode, close, onReplace, onStatus, onExpiry, onRemark }: { d: Doc; role: string; verifier: boolean; statuses: string[]; customerMode: boolean; close: () => void
  onReplace: (d: Doc, f: File, expiry: string, why: string) => Promise<string | null>; onStatus: (d: Doc, s: string) => void; onExpiry: (e: string) => void; onRemark: (t: string) => void }) {
  const vs = versionsOf(d); const cur = vs.length ? vs[vs.length - 1].v : 0
  const [tab, setTab] = useState('Preview'); const [pv, setPv] = useState(cur); const [rf, setRf] = useState<File | null>(null); const [rexp, setRexp] = useState(''); const [why, setWhy] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [fk, setFk] = useState(0); const [n, setN] = useState('')
  const shown = vs.find(x => x.v === pv) ?? vs[vs.length - 1]
  const go = async () => {
    if (!rf) return setErr('Choose the new file.'); setBusy(true); const e = await onReplace(d, rf, rexp, why.trim()); setBusy(false)
    if (e) return setErr(e); setErr(''); setRf(null); setRexp(''); setWhy(''); setFk(fk + 1); setPv(cur + 1); setTab('Preview')
  }
  const remarks = d.remarks ?? []
  return <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl">
    <div className="mb-1 flex items-center justify-between"><b className="text-lg text-navy">{d.id} · {d.docType}</b><button onClick={close} className="text-sm text-slate-500">Close</button></div>
    <p className="mb-3 text-sm text-slate-500">{customerMode ? '' : d.customer + ' · '}{d.file || 'No file yet'}{cur > 0 && ` · v${cur}`}</p>
    <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
      <label className="text-xs text-slate-500">Status{verifier ? <select value={d.status} onChange={e => onStatus(d, e.target.value)} className={inp + ' w-full'}>{statuses.map(o => <option key={o}>{o}</option>)}</select> : <span className={`mt-1 block w-fit rounded-full px-2 py-0.5 text-sm ${tone[d.status] ?? 'bg-slate-100'}`}>{d.status}</span>}</label>
      <label className="text-xs text-slate-500">Expiry date<input type="date" value={d.expiry ?? ''} onChange={e => onExpiry(e.target.value)} className={inp + ' w-full'} /><span className="mt-1 block"><ExpiryBadge d={d.expiry} /></span></label></div>
    <div className="mb-4 flex flex-wrap gap-1">{['Preview', 'Replace', `Versions (${vs.length})`, `Remarks (${remarks.length})`].map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-sm ${t === tab ? 'bg-royal text-white' : 'bg-slate-100'}`}>{t}</button>)}</div>
    {tab === 'Preview' && (shown ? <div className="space-y-2">{vs.length > 1 && <select aria-label="Version" value={shown.v} onChange={e => setPv(+e.target.value)} className={inp}>{[...vs].reverse().map(x => <option key={x.v} value={x.v}>Version {x.v}{x.v === cur ? ' (current)' : ''} · {x.name}</option>)}</select>}
      <FilePreview key={`${d.id}-${shown.v}`} blobKey={blobKey(d.id, shown.v)} name={shown.name} mime={shown.mime} /></div> : <p className="text-sm text-slate-500">No file uploaded yet. Use the Replace tab to upload one.</p>)}
    {tab === 'Replace' && <div className="space-y-3 text-sm"><p className="text-slate-500">{cur ? `The new file becomes version ${cur + 1}. Earlier versions stay in version history.${d.status === 'Verified' ? ' Status goes back to Uploaded and needs verification again.' : ''}` : 'Upload the first file for this document.'}</p>
      <input key={fk} type="file" accept={ACCEPT} onChange={e => setRf(e.target.files?.[0] ?? null)} className={inp + ' w-full'} />
      <label className="block text-xs text-slate-500">New expiry date (optional)<input type="date" value={rexp} onChange={e => setRexp(e.target.value)} className={inp + ' w-full'} /></label>
      <input value={why} onChange={e => setWhy(e.target.value)} placeholder="Reason for replacing (optional)" className={inp + ' w-full'} />
      <button disabled={busy} onClick={go} className="rounded-lg bg-royal px-3 py-1.5 text-white disabled:opacity-40">{busy ? 'Uploading…' : cur ? 'Upload new version' : 'Upload'}</button>{err && <p role="alert" className="text-red-600">{err}</p>}</div>}
    {tab.startsWith('Versions') && <div className="space-y-3 text-sm">{vs.length === 0 && <p className="text-slate-500">No versions yet.</p>}
      {[...vs].reverse().map(x => <div key={x.v} className="rounded-lg border border-slate-200 p-3"><div className="flex justify-between"><b>Version {x.v}{x.v === cur && <span className="ml-2 rounded bg-green-50 px-1.5 text-xs font-normal text-green-700">Current</span>}</b><button className="text-royal" onClick={() => { setPv(x.v); setTab('Preview') }}>Preview</button></div>
        <div className="text-xs text-slate-500">{x.name} {fmtSize(x.size)}<br />{x.on ? `${fmtWhen(x.on)} by ${x.by}` : 'Uploaded before version tracking'}{x.note && <><br />Note: {x.note}</>}</div></div>)}
      {(d._h?.length ?? 0) > 0 && <div><div className="mb-1 text-xs font-semibold text-slate-500">Activity</div><ul className="space-y-1 text-xs text-slate-600">{[...d._h!].reverse().map((h, i) => <li key={i} className="border-b border-slate-100 pb-1">{h}</li>)}</ul></div>}</div>}
    {tab.startsWith('Remarks') && <div className="space-y-2 text-sm">{remarks.length === 0 && <p className="text-slate-500">No remarks yet.</p>}
      {[...remarks].reverse().map((r, i) => <div key={i} className="rounded bg-slate-50 p-2"><p>{r.t}</p><p className="mt-1 text-xs text-slate-400">{r.by} · {fmtWhen(r.at)}</p></div>)}
      <textarea value={n} onChange={e => setN(e.target.value)} placeholder="Add a remark" className={inp + ' w-full'} /><button disabled={!n.trim()} onClick={() => { onRemark(n.trim()); setN('') }} className="rounded-lg bg-royal px-3 py-1.5 text-white disabled:opacity-40">Add remark</button>
      <p className="text-xs text-slate-400">Remarks are visible to head office, the franchise and the customer. Added as {role}.</p></div>}
  </div>
}
