import { useEffect, useState } from 'react'
import { EMP_SEED, inr, readJson, writeJson } from './data'
export function useIdleLogout(logout: () => void, mins = 15) {
  useEffect(() => {
    let t = setTimeout(logout, mins * 60000); const reset = () => { clearTimeout(t); t = setTimeout(logout, mins * 60000) }
    const ev = ['mousemove', 'keydown', 'click', 'touchstart']; ev.forEach(e => addEventListener(e, reset))
    return () => { clearTimeout(t); ev.forEach(e => removeEventListener(e, reset)) }
  }, [logout, mins])
}
const Q: [string, string, string[]][] = [
  ['fee', 'Franchise fee model', ['One-time franchise fee', 'Annual renewal fee', 'One-time fee + annual renewal', 'Custom fee structure']],
  ['comm', 'Franchise commission model', ['Fixed percentage of loan commission', 'Fixed commission per disbursed loan', 'Both, depending on loan category', 'Custom commission per transaction']],
  ['terr', 'Franchise territory', ['One exclusive franchise per location', 'Multiple franchises in one city', 'District-wise territory allocation', 'Admin decides territory allocation']],
  ['portal', 'Portals to develop', ['All three: Admin + Franchise + Customer', 'Admin + Franchise only', 'All three + mobile app for franchises']],
  ['auth', 'Final authority over loan applications', ['Head office manages the entire loan process', 'Franchise and head office work collaboratively', 'Final approval exclusively by the lending institution']],
]
export function BusinessConfig() {
  const [v, setV] = useState<Record<string, string>>(() => readJson('dvp-bizcfg', {} as Record<string, string>)); const [saved, setSaved] = useState(false)
  const val = (k: string, o: string[]) => v[k] ?? o[0]; const fld = 'w-full rounded-lg border border-slate-300 p-2 text-sm'
  return <div className="max-w-2xl space-y-4"><h1 className="text-2xl font-bold text-navy">Business configuration</h1>
    <p className="text-sm text-slate-500">Choose the business rules. These decide how the commission engine, franchise module and loan workflow work.</p>
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{Q.map(([k, l, o]) => <label key={k} className="block text-sm font-medium">{l}
      <select value={val(k, o)} onChange={e => { setV({ ...v, [k]: e.target.value }); setSaved(false) }} className={fld + ' mt-1 font-normal'}>{o.map(x => <option key={x}>{x}</option>)}</select></label>)}
      <label className="block text-sm font-medium">Other requirements (optional)<textarea rows={3} value={v.other ?? ''} onChange={e => { setV({ ...v, other: e.target.value }); setSaved(false) }} className={fld + ' mt-1 font-normal'} /></label>
      <button onClick={() => { writeJson('dvp-bizcfg', { ...Object.fromEntries(Q.map(([k, , o]) => [k, val(k, o)])), other: v.other ?? '' }); setSaved(true) }} className="rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white">Save business decisions</button>
      {saved && <p role="status" className="text-sm text-green-700">Saved in this browser (demo).</p>}</div></div>
}
const tc = 'px-4 py-3'; const box = 'overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm'
export function Attendance() {
  const today = new Date().toISOString().slice(0, 10); const [d, setD] = useState(today)
  const [all, setAll] = useState<Record<string, Record<string, string>>>(() => readJson('dvp-attend', {} as Record<string, Record<string, string>>))
  const day = all[d] ?? {}; const O = ['Not marked', 'Present', 'Half day', 'Leave', 'Absent']
  const set = (n: string, s: string) => { const x = { ...all, [d]: { ...day, [n]: s } }; setAll(x); writeJson('dvp-attend', x) }
  return <div className="space-y-4"><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-navy">Attendance</h1><input type="date" aria-label="Date" value={d} max={today} onChange={e => setD(e.target.value || today)} className="rounded-lg border border-slate-300 p-2 text-sm" />
    <span className="text-sm text-slate-500">Present: {EMP_SEED.filter(e => day[e.name] === 'Present').length} of {EMP_SEED.length}</span></div>
    <div className={box}><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Employee', 'Department', 'Status'].map(h => <th key={h} className={tc + ' font-medium'}>{h}</th>)}</tr></thead>
      <tbody>{EMP_SEED.map(e => <tr key={e.id} className="border-t border-slate-100"><td className={tc}>{e.name}</td><td className={tc}>{e.dept}</td><td className={tc}><select value={day[e.name] ?? 'Not marked'} onChange={ev => set(e.name, ev.target.value)} className="rounded-md border border-slate-200 p-1 text-xs">{O.map(o => <option key={o}>{o}</option>)}</select></td></tr>)}</tbody></table></div></div>
}
export function Targets({ rows }: { rows: { n: string; disb: number }[] }) {
  const [t, setT] = useState<Record<string, number>>(() => readJson('dvp-targets', {} as Record<string, number>))
  const put = (n: string, v: number) => { const x = { ...t, [n]: Math.max(0, v) }; setT(x); writeJson('dvp-targets', x) }
  return <div className="mt-6 space-y-2"><h2 className="text-lg font-bold text-navy">Monthly targets and bonus</h2><p className="text-sm text-slate-500">Set a monthly disbursement target per franchise. A franchise that reaches 100% is marked bonus eligible. Sample data.</p>
    <div className={box}><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Franchise', 'Disbursed', 'Monthly target (₹)', 'Achieved', 'Bonus'].map(h => <th key={h} className={tc + ' font-medium'}>{h}</th>)}</tr></thead>
      <tbody>{rows.map(r => { const tg = t[r.n] ?? 10000000; const p = tg > 0 ? Math.round(r.disb * 100 / tg) : 0
        return <tr key={r.n} className="border-t border-slate-100"><td className={tc + ' font-medium'}>{r.n}</td><td className={tc}>{inr(r.disb)}</td><td className={tc}><input type="number" aria-label={'Target for ' + r.n} value={tg} onChange={e => put(r.n, +e.target.value)} className="w-32 rounded-md border border-slate-300 p-1 text-sm" /></td>
          <td className={tc}><div className="h-2 w-24 rounded bg-slate-200"><div className="h-2 rounded bg-gold" style={{ width: Math.min(100, p) + '%' }} /></div>{p}%</td><td className={tc}>{p >= 100 ? 'Eligible' : '—'}</td></tr> })}</tbody></table></div></div>
}
