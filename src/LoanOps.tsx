import { useState } from 'react'
import { useStore } from './store'
import { inr, type Loan } from './data'
import { ACCEPT, FilePreview, checkFile, delBlob, fmtSize, mimeOf, putBlob, readDataUrl } from './FileKit'
import { ASSIGN_ROLES, ESC_TARGETS, SANCTION_ROLES, delayState, fmtDay, fmtDur, fmtWhen, inStageMs, isActive, openEscalation, overdueMs, processors, slaDays, stageDurations, totalMs } from './ops'

const inp = 'rounded-lg border border-slate-300 p-2 text-sm'
const btn = 'rounded-lg bg-royal px-3 py-1.5 text-sm text-white disabled:opacity-40'
const todayIso = () => new Date().toISOString().slice(0, 10)

export function DelayBadge({ loan }: { loan: Loan }) {
  const d = delayState(loan); const esc = !!openEscalation(loan)
  if (d === 'done') return <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Completed</span>
  return <span className="inline-flex flex-wrap gap-1">
    {d === 'ok' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">On track</span>}
    {d === 'delayed' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Delayed {fmtDur(overdueMs(loan))}</span>}
    {d === 'critical' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Critical {fmtDur(overdueMs(loan))} over</span>}
    {esc && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">Escalated</span>}
  </span>
}

export function ProcessingPanel({ loan, role }: { loan: Loan; role: string }) {
  const { assignLoan, escalate, resolveEscalation } = useStore()
  const canAct = ASSIGN_ROLES.includes(role); const internal = role !== 'Franchise Owner' && role !== 'Customer'
  const [reason, setReason] = useState(''); const [to, setTo] = useState(ESC_TARGETS[0]); const [err, setErr] = useState(''); const [note, setNote] = useState('')
  const open = openEscalation(loan); const sla = slaDays(loan); const dur = stageDurations(loan)
  const people = [...new Set([...processors(), ...(loan.assignee ? [loan.assignee] : [])])]
  const cell = (a: string, b: string, warn?: boolean) => <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{a}</div><div className={`text-lg font-semibold ${warn ? 'text-red-600' : 'text-navy'}`}>{b}</div></div>
  return <div className="space-y-4 text-sm">
    <div><div className="mb-1 text-xs font-semibold text-slate-500">Assigned to</div>
      {canAct ? <select aria-label="Assign file to" value={loan.assignee ?? ''} onChange={e => assignLoan(loan.id, e.target.value, role)} className={inp + ' w-full'}><option value="">Unassigned</option>{people.map(p => <option key={p}>{p}</option>)}</select>
        : <p className="font-medium">{loan.assignee ?? 'Not assigned yet'}</p>}
      {internal && (loan.assignLog?.length ?? 0) > 0 && <ul className="mt-2 space-y-0.5 text-xs text-slate-500">{[...loan.assignLog!].reverse().slice(0, 4).map((a, i) => <li key={i}>{fmtWhen(a.at)}: {a.to} (by {a.by})</li>)}</ul>}
    </div>
    <div className="grid grid-cols-2 gap-2">
      {cell(isActive(loan) ? 'Total processing time (running)' : 'Total processing time', fmtDur(totalMs(loan)))}
      {cell('Time in current stage', fmtDur(inStageMs(loan)), delayState(loan) !== 'ok' && delayState(loan) !== 'done')}
      {cell('Allowed in this stage', sla ? `${sla} day${sla > 1 ? 's' : ''}` : '—')}
      <div className="rounded-lg bg-slate-50 p-3"><div className="mb-1 text-xs text-slate-500">Status</div><DelayBadge loan={loan} /></div>
    </div>
    <div><div className="mb-1 text-xs font-semibold text-slate-500">Time spent per stage</div>
      {dur.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-500"><tr><th className="py-1 font-medium">Stage</th><th className="font-medium">Entered</th><th className="text-right font-medium">Time</th></tr></thead>
        <tbody>{dur.map((d, i) => <tr key={i} className="border-t border-slate-100"><td className="py-1">{d.s}{d.open && <em className="ml-1 text-slate-400">(current)</em>}</td><td>{fmtDay(d.from)}</td><td className={`text-right ${d.over ? 'font-semibold text-red-600' : ''}`}>{fmtDur(d.ms)}</td></tr>)}</tbody></table></div>
        : <p className="text-slate-500">No stage timing was recorded for this file.</p>}
      <p className="mt-1 text-xs text-slate-400">Calendar days. Red means more than the allowed time for that stage.</p></div>
    {internal && <div className="space-y-2 border-t border-slate-200 pt-3"><div className="text-xs font-semibold text-slate-500">Escalation</div>
      {open ? <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
        <p><b>{open.auto ? 'Auto-escalated' : 'Escalated'} to {open.to}</b> · {fmtWhen(open.at)}</p><p className="text-slate-700">{open.reason}</p>
        {canAct && <div className="flex gap-2"><input value={note} onChange={e => setNote(e.target.value)} placeholder="Resolution note" className={inp + ' flex-1'} /><button className={btn} onClick={() => { resolveEscalation(loan.id, open.id, note.trim() || 'Resolved', role); setNote('') }}>Resolve</button></div>}</div>
        : isActive(loan) && canAct ? <div className="space-y-2"><textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why does this file need escalation?" className={inp + ' w-full'} />
          <div className="flex gap-2"><select aria-label="Escalate to" value={to} onChange={e => setTo(e.target.value)} className={inp}>{ESC_TARGETS.map(t => <option key={t}>{t}</option>)}</select>
            <button className={btn} disabled={reason.trim().length < 5} onClick={() => { const r = escalate(loan.id, reason.trim(), to, role); if (r) setErr(r); else { setErr(''); setReason('') } }}>Escalate</button></div>
          {err && <p role="alert" className="text-red-600">{err}</p>}
          <p className="text-xs text-slate-400">Files that stay in a stage for {2}× the allowed time are escalated to the Operations Manager automatically.</p></div>
          : <p className="text-slate-500">{isActive(loan) ? 'No open escalation.' : 'This file is complete.'}</p>}
      {(loan.escalations ?? []).filter(e => e.resolvedAt).length > 0 && <div><div className="mb-1 text-xs text-slate-500">Earlier escalations</div><ul className="space-y-1 text-xs text-slate-600">{[...loan.escalations!].filter(e => e.resolvedAt).reverse().map(e => <li key={e.id}>{fmtDay(e.at)} · {e.stage} · {e.note ?? 'Resolved'} ({e.resolvedBy})</li>)}</ul></div>}
    </div>}
  </div>
}

export function SanctionPanel({ loan, role }: { loan: Loan; role: string }) {
  const { addSanction, removeSanction } = useStore()
  const can = SANCTION_ROLES.includes(role); const approved = loan.lenders.filter(x => x.status === 'Approved')
  const [lender, setLender] = useState(''); const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayIso()); const [till, setTill] = useState('')
  const [file, setFile] = useState<File | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [view, setView] = useState<string | null>(null); const [fk, setFk] = useState(0)
  const pick = lender || approved[0]?.name || ''; const lenderAmt = approved.find(x => x.name === pick)?.amount ?? 0
  const list = loan.sanctions ?? []
  const upload = async () => {
    if (!file) return setErr('Choose the sanction letter file.')
    const bad = checkFile(file); if (bad) return setErr(bad)
    const amt = Number(amount || lenderAmt); if (!(amt > 0)) return setErr('Enter the sanctioned amount.')
    if (!date) return setErr('Enter the sanction letter date.')
    if (till && till < date) return setErr('Validity date cannot be before the letter date.')
    setBusy(true)
    try {
      const id = 'SL-' + Date.now(); const key = `san-${loan.id}-${id}`; const e = putBlob(key, await readDataUrl(file)); if (e) { setErr(e); return }
      addSanction(loan.id, { id, lender: pick, amount: amt, letterDate: date, validTill: till || undefined, name: file.name, size: file.size, mime: mimeOf(file.name), on: new Date().toISOString(), by: role, key })
      setFile(null); setAmount(''); setTill(''); setErr(''); setFk(fk + 1)
    } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return <div className="space-y-4 text-sm">
    {list.length === 0 && <p className="text-slate-500">No sanction letter uploaded yet.</p>}
    {list.map(x => { const exp = x.validTill && x.validTill < todayIso()
      return <div key={x.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><b>{x.lender}</b><span>{inr(x.amount)}</span></div>
        <div className="text-xs text-slate-500">Letter dated {fmtDay(x.letterDate)}{x.validTill && <> · valid till <span className={exp ? 'font-semibold text-red-600' : ''}>{fmtDay(x.validTill)}{exp ? ' (expired)' : ''}</span></>}<br />{x.name} {fmtSize(x.size)} · uploaded {fmtWhen(x.on)} by {x.by}</div>
        <div className="flex gap-3"><button className="text-royal" onClick={() => setView(view === x.id ? null : x.id)}>{view === x.id ? 'Hide preview' : 'Preview'}</button>
          {can && <button className="text-slate-400 hover:text-red-600" onClick={() => { if (confirm('Remove this sanction letter?')) { delBlob(x.key); removeSanction(loan.id, x.id) } }}>Remove</button>}</div>
        {view === x.id && <FilePreview blobKey={x.key} name={x.name} mime={x.mime} />}</div> })}
    {can && <div className="space-y-2 border-t border-slate-200 pt-3"><div className="text-xs font-semibold text-slate-500">Upload sanction letter</div>
      {approved.length === 0 ? <p className="rounded-lg bg-amber-50 p-3 text-amber-800">No lender has approved this file yet. Mark a lender as Approved under Lenders, then upload its sanction letter.</p> : <>
        <select aria-label="Lender" value={pick} onChange={e => setLender(e.target.value)} className={inp + ' w-full'}>{approved.map(x => <option key={x.name}>{x.name}</option>)}</select>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2"><label className="text-xs text-slate-500">Sanctioned amount (₹)<input type="number" value={amount} placeholder={String(lenderAmt || '')} onChange={e => setAmount(e.target.value)} className={inp + ' w-full'} /></label>
          <label className="text-xs text-slate-500">Letter date<input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp + ' w-full'} /></label>
          <label className="text-xs text-slate-500">Valid till (optional)<input type="date" value={till} onChange={e => setTill(e.target.value)} className={inp + ' w-full'} /></label>
          <label className="text-xs text-slate-500">File (PDF, JPG, PNG)<input key={fk} type="file" accept={ACCEPT} onChange={e => setFile(e.target.files?.[0] ?? null)} className={inp + ' w-full'} /></label></div>
        <button className={btn} disabled={busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload letter'}</button>
        {err && <p role="alert" className="text-red-600">{err}</p>}</>}
    </div>}
    <p className="text-xs text-slate-400">Demo only: the file is kept in this browser. Production needs private encrypted storage.</p>
  </div>
}