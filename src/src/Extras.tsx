import { useEffect, useState } from 'react'
import { readJson, writeJson } from './data'
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
