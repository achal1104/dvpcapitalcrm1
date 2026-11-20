import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Download, CheckCircle2, Circle } from 'lucide-react'
import { useStore } from './store'
import { COMM_SEED, FRANCHISES, IFSC_RE, LOAN_CATS, MY_FRANCHISE, STAGES, audit, getLenderProfile, inr, lenderRows, readJson, saveFranProfile, slug, upsertAgreement, writeJson } from './data'
import { employeeNames } from './Profiles'

const box = 'rounded-xl border border-slate-200 bg-white shadow-sm'
const inp = 'w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-royal focus:outline-none focus:ring-2 focus:ring-blue-100'
const btn = 'rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40'
const btn2 = 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const save = (name: string, content: string, type = 'text/plain') => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click()
}
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const linkFor = (fr: string) => `${window.location.origin}/apply/${slug(fr)}`
const maxNum = (ids: string[]) => Math.max(100, ...ids.map(i => parseInt(i.replace(/\D/g, '')) || 0))

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return <label className="block text-xs font-medium text-slate-600">{label}{children}{error && <span role="alert" className="mt-1 block text-xs font-normal text-red-600">{error}</span>}</label>
}

/* ------------------------------------------------------------------ Commission helpers */
export type CommRow = (typeof COMM_SEED)[number]
export const COMM_KEY = 'dvp-comm'
export const frShare = () => readJson<number>('dvp-share', 40)
export const loadComm = (): CommRow[] => readJson<CommRow[]>(COMM_KEY, COMM_SEED)
export function commSummary(rows: CommRow[], fr?: string) {
  const r = rows.filter(x => (!fr || x.franchise === fr) && x.status !== 'Reversed / Adjusted'); const s = frShare() / 100
  const earned = r.reduce((a, x) => a + x.expected * s, 0), received = r.reduce((a, x) => a + x.received * s, 0)
  const paid = r.filter(x => x.status === 'Paid').reduce((a, x) => a + x.expected * s, 0)
  return { earned, received, fromLenders: Math.max(0, earned - received), paid, payable: Math.max(0, received - paid), pending: Math.max(0, earned - paid) }
}
export function CommissionSummary({ fr }: { fr: string }) {
  const s = commSummary(loadComm(), fr)
  const cards: [string, number][] = [['Total commission earned', s.earned], ['Received by head office', s.received], ['Pending from lenders', s.fromLenders], ['Paid to franchise', s.paid], ['Payable balance', s.payable]]
  const stmt = () => save('commission-statement.csv', ['Loan,Expected from lender,Received by HO,Status,Franchise share (' + frShare() + '%)', ...loadComm().filter(x => x.franchise === fr).map(x => [x.loan, x.expected, x.received, x.status, x.expected * frShare() / 100].join(','))].join('\n'), 'text/csv')
  return <div className="space-y-2"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{cards.map(([l, v]) => <div key={l} className={box + ' p-4'}><div className="text-xs text-slate-500">{l}</div><div className="mt-1 text-xl font-bold text-navy">{inr(v)}</div></div>)}</div>
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500"><span>Franchise share is shown at {frShare()}% (illustrative; follows your signed agreement). Payable balance only counts commission already received by head office.</span><button onClick={stmt} className="flex items-center gap-1 text-royal"><Download size={14} />Download statement</button></div></div>
}
export function PaymentHistory({ role }: { role: string }) {
  const fr = role === 'Franchise Owner'; const rows = loadComm().filter(x => !fr || x.franchise === MY_FRANCHISE)
  let bal = 0
  const ledger = rows.flatMap(x => {
    const out: { loan: string; franchise: string; type: string; amt: number; bal: number; row: CommRow }[] = []
    if (x.received > 0 && x.status !== 'Reversed / Adjusted') { bal += x.received * frShare() / 100; out.push({ loan: x.loan, franchise: x.franchise, type: 'Commission received by head office (franchise share)', amt: x.received * frShare() / 100, bal, row: x }) }
    if (x.status === 'Paid') { bal -= x.expected * frShare() / 100; out.push({ loan: x.loan, franchise: x.franchise, type: 'Payout to franchise', amt: -x.expected * frShare() / 100, bal, row: x }) }
    return out
  })
  const receipt = (x: CommRow) => save(`payout-receipt-${x.loan}.txt`, `DVP CAPITALS - PAYOUT RECEIPT\nFranchise: ${x.franchise}\nLoan: ${x.loan}\nFranchise share (${frShare()}%): ${inr(x.expected * frShare() / 100)}\nStatus: ${x.status}\nTDS and taxes: as applicable under your agreement\n`)
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold text-navy">Payment history</h1><p className="text-sm text-slate-500">A transaction ledger: every entry is a credit or a payout, and the balance is calculated from them, not typed in.</p></div>
    {fr && <CommissionSummary fr={MY_FRANCHISE} />}
    <div className={box + ' overflow-x-auto'}><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Loan', 'Franchise', 'Entry', 'Amount', 'Running balance', ''].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody>{ledger.map((l, i) => <tr key={i} className="border-t border-slate-100"><td className="px-4 py-3">{l.loan}</td><td className="px-4 py-3">{l.franchise}</td><td className="px-4 py-3">{l.type}</td><td className={`px-4 py-3 ${l.amt < 0 ? 'text-red-600' : 'text-green-700'}`}>{l.amt < 0 ? '-' : '+'}{inr(Math.abs(l.amt))}</td><td className="px-4 py-3">{inr(l.bal)}</td>
        <td className="px-4 py-3">{l.amt < 0 && <button className="text-royal" onClick={() => receipt(l.row)}>Receipt</button>}</td></tr>)}
        {ledger.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No payment entries yet.</td></tr>}</tbody></table></div></div>
}

/* ------------------------------------------------------------------ Marketing kit */
const KITS: { k: string; l: string; w: number; h: number }[] = [
  { k: 'logo', l: 'Logo lock-up', w: 700, h: 220 }, { k: 'card', l: 'Visiting card', w: 1050, h: 600 }, { k: 'wa', l: 'WhatsApp creative', w: 1080, h: 1080 },
  { k: 'banner', l: 'Digital banner', w: 1200, h: 400 }, { k: 'post', l: 'Social media post', w: 1080, h: 1080 },
]
function kitSvg(kind: string, fr: string, w: number, h: number, url: string) {
  const big = Math.round(Math.min(w, h) * (kind === 'logo' || kind === 'banner' ? 0.2 : 0.09)); const sm = Math.round(big * 0.45)
  const msg = kind === 'wa' || kind === 'post' ? 'Loans for your next step: home, business, property and more.' : kind === 'card' ? url.replace(/^https?:\/\//, '') : 'Powered by DVP Capitals'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#0b1f44"/><rect x="0" y="${h - 14}" width="${w}" height="14" fill="#c9a227"/>` +
    `<text x="${w / 2}" y="${h / 2}" fill="#fff" font-family="Arial,sans-serif" font-weight="700" font-size="${big}" text-anchor="middle">${esc(fr)}</text>` +
    `<text x="${w / 2}" y="${h / 2 + sm * 1.8}" fill="#c9a227" font-family="Arial,sans-serif" font-size="${sm}" text-anchor="middle">Powered by DVP Capitals</text>` +
    `<text x="${w / 2}" y="${h / 2 + sm * 3.4}" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="${Math.round(sm * 0.75)}" text-anchor="middle">${esc(msg)}</text></svg>`
}
export function MarketingKit({ role }: { role: string }) {
  const fo = role === 'Franchise Owner'; const [fr, setFr] = useState(fo ? MY_FRANCHISE : FRANCHISES[0]); const url = linkFor(fr)
  const [done, setDone] = useState<string[]>(() => readJson<string[]>('dvp-welcome', []))
  const tick = (x: string) => { const n = done.includes(x) ? done.filter(y => y !== x) : [...done, x]; setDone(n); writeJson('dvp-welcome', n) }
  const WELCOME = ['Read the operating guidelines', 'Finish the training modules', 'Download your branding files', 'Share your referral link or QR code', 'Add your first customer']
  const brochure = () => save('loan-products.txt', `${fr} - Powered by DVP Capitals\n\nLoan products\n${LOAN_CATS.map(c => '- ' + c).join('\n')}\n\nApproval and terms are decided by the lender. Apply: ${url}\n`)
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-navy">Marketing and branding kit</h1><p className="text-sm text-slate-500">Everything you need to promote {fr} under the DVP Capitals network.</p></div>
    {!fo && <select aria-label="Franchise" value={fr} onChange={e => setFr(e.target.value)} className={inp + ' max-w-xs'}>{FRANCHISES.map(x => <option key={x}>{x}</option>)}</select>}
    <div className={box + ' flex flex-wrap items-center gap-6 p-5'}><QRCodeSVG value={url} size={130} />
      <div className="space-y-2"><b className="text-navy">Your referral link and QR code</b><div className="flex flex-wrap items-center gap-2"><code className="break-all rounded bg-slate-100 px-2 py-1 text-sm">{url}</code><button className="text-sm text-royal" onClick={() => navigator.clipboard?.writeText(url)}>Copy</button></div>
        <p className="max-w-md text-xs text-slate-500">Customers who register through this link are recorded under {fr}. This protects your customer ownership.</p><a href={`/apply/${slug(fr)}`} target="_blank" rel="noreferrer" className="inline-block text-sm text-royal underline">Preview your landing page</a></div></div>
    <div className={box + ' p-5'}><b className="text-navy">Branding downloads</b><p className="text-xs text-slate-500">Generated with your franchise name. Files download as SVG, which prints at any size.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{KITS.map(x => <div key={x.k} className="rounded-lg border border-slate-200 p-3"><div className="mb-2 overflow-hidden rounded bg-slate-100" dangerouslySetInnerHTML={{ __html: kitSvg(x.k, fr, x.w, x.h, url).replace(/width="\d+" height="\d+"/, 'width="100%"') }} />
        <div className="flex items-center justify-between text-sm"><span>{x.l}</span><button onClick={() => save(`${slug(fr)}-${x.k}.svg`, kitSvg(x.k, fr, x.w, x.h, url), 'image/svg+xml')} className="flex items-center gap-1 text-royal"><Download size={14} />SVG</button></div></div>)}
        <div className="rounded-lg border border-slate-200 p-3 text-sm"><div className="mb-2 font-medium">Loan product brochure</div><button onClick={brochure} className="flex items-center gap-1 text-royal"><Download size={14} />Download</button></div>
        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500"><div className="mb-2 font-medium">Marketing video templates</div>Shared by head office when available.</div></div></div>
    <div className={box + ' p-5'}><b className="text-navy">Welcome kit checklist</b><p className="text-xs text-slate-500">{done.length} of {WELCOME.length} done</p>
      <ul className="mt-3 space-y-2 text-sm">{WELCOME.map(x => <li key={x}><button onClick={() => tick(x)} className="flex items-center gap-2 text-left">{done.includes(x) ? <CheckCircle2 size={18} className="text-green-600" /> : <Circle size={18} className="text-slate-400" />}<span className={done.includes(x) ? 'text-slate-400 line-through' : ''}>{x}</span></button></li>)}</ul></div></div>
}

/* ------------------------------------------------------------------ Training */
const TRAIN = [['Understanding DVP Capitals loan products', '20 min'], ['Collecting documents correctly', '15 min'], ['Customer consent and data privacy', '15 min'], ['Using the CRM: leads to disbursement', '25 min'], ['How commissions are calculated and paid', '10 min'], ['Working with queries from head office', '10 min']]
export function Training() {
  const [done, setDone] = useState<string[]>(() => readJson<string[]>('dvp-train', []))
  const tick = (x: string) => { const n = done.includes(x) ? done.filter(y => y !== x) : [...done, x]; setDone(n); writeJson('dvp-train', n) }
  const pct = Math.round(done.length / TRAIN.length * 100)
  return <div className="space-y-5"><div><h1 className="text-2xl font-bold text-navy">Training and support</h1><p className="text-sm text-slate-500">Complete these modules before you start onboarding customers.</p></div>
    <div className={box + ' p-5'}><div className="mb-2 flex justify-between text-sm"><b className="text-navy">Your progress</b><span>{pct}%</span></div><div className="h-2 rounded bg-slate-200"><div className="h-2 rounded bg-gold" style={{ width: pct + '%' }} /></div>
      <ul className="mt-4 divide-y divide-slate-100">{TRAIN.map(([t, d]) => <li key={t} className="flex items-center justify-between py-3 text-sm"><span className={done.includes(t) ? 'text-slate-400 line-through' : ''}>{t} <span className="text-xs text-slate-400">· {d}</span></span><button className="text-royal" onClick={() => tick(t)}>{done.includes(t) ? 'Mark not done' : 'Mark complete'}</button></li>)}</ul></div>
    <div className="grid gap-4 md:grid-cols-2"><div className={box + ' p-5 text-sm'}><b className="text-navy">Always</b><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600"><li>Record customer consent before collecting documents.</li><li>Upload complete, readable documents.</li><li>Use only your own referral link for your leads.</li><li>Reply to head office queries promptly.</li></ul></div>
      <div className={box + ' border-red-200 p-5 text-sm'}><b className="text-red-700">Never</b><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600"><li>Promise a loan approval, rate or amount.</li><li>Share customer documents through public links.</li><li>Use customer data for unrelated marketing.</li><li>Download or copy the customer database.</li></ul></div></div>
    <p className="text-sm text-slate-500">Need help with a file or a payout? <NavLink to="/helpdesk" className="text-royal underline">Raise a ticket</NavLink>.</p></div>
}

/* ------------------------------------------------------------------ Customer: home and tracking */
const CSTEPS = ['Application received', 'Documents', 'Verification', 'With lender', 'Approved', 'Disbursed']
const cstep = (s: string) => ['New Inquiry'].includes(s) ? 0 : s === 'Documents Pending' ? 1 : ['File Submitted', 'Under Verification', 'Query Raised'].includes(s) ? 2 : ['Ready for Lender Submission', 'Submitted to Bank / NBFC', 'Under Bank Processing'].includes(s) ? 3 : ['Approved / Sanctioned', 'Disbursement Pending'].includes(s) ? 4 : s === 'Disbursed' ? 5 : -1
const MY_LOANS = ['LN-2001', 'LN-2002']
export function TrackApplication() {
  const loans = useStore(s => s.loans).filter(l => MY_LOANS.includes(l.id) || l.customer === 'Demo Customer')
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold text-navy">Track your application</h1><p className="text-sm text-slate-500">Live status of each loan you have applied for.</p></div>
    {loans.map(l => { const i = cstep(l.stage); const d = readJson<{ customer: string[]; queries: { t: string; open: boolean }[] }>('dvp-ln-' + l.id, { customer: [], queries: [] }); const open = d.queries.filter(q => q.open)
      return <div key={l.id} className={box + ' p-5'}><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-navy">{l.category} · {l.id}</b><span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-royal">{i < 0 ? 'Closed' : CSTEPS[i]}</span></div>
        <p className="mt-1 text-sm text-slate-500">Amount requested {inr(l.amount)}</p>
        {i < 0 ? <p className="mt-4 text-sm text-slate-600">This application is closed. Please contact your franchise for the reason and next options.</p> :
          <ol className="mt-4 grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 md:grid-cols-6">{CSTEPS.map((s, j) => <li key={s} className="text-xs"><div className={`mb-1 h-1.5 rounded ${j <= i ? 'bg-royal' : 'bg-slate-200'}`} /><span className={j <= i ? 'font-semibold text-navy' : 'text-slate-400'}>{s}</span></li>)}</ol>}
        {open.length > 0 && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><b>Action needed</b>{open.map((q, k) => <p key={k}>{q.t}</p>)}<NavLink to="/upload-documents" className="mt-1 inline-block text-royal underline">Upload documents</NavLink></div>}
        {d.customer.length > 0 && <div className="mt-4 text-sm"><b className="text-navy">Updates from DVP Capitals</b>{d.customer.map((x, k) => <p key={k} className="mt-1 rounded bg-slate-50 p-2">{x}</p>)}</div>}</div> })}
    {loans.length === 0 && <p className={box + ' p-8 text-center text-sm text-slate-500'}>You have no applications yet.</p>}</div>
}
export function CustomerHome() {
  const loans = useStore(s => s.loans).filter(l => MY_LOANS.includes(l.id) || l.customer === 'Demo Customer')
  const docs = readJson<Row[]>('dvp-m-cdocs', [{ status: 'Missing' }]).filter(x => ['Missing', 'Rejected'].includes(x.status)).length
  const unread = readJson<Row[]>('dvp-m-ncu', [{ status: 'Unread' }]).filter(x => x.status === 'Unread').length
  const stats: [string, number, string][] = [['Active applications', loans.filter(l => cstep(l.stage) >= 0).length, '/track-application'], ['Documents needed', docs, '/upload-documents'], ['Unread updates', unread, '/notifications']]
  return <div className="space-y-5"><div><h1 className="text-2xl font-bold text-navy">Welcome</h1><p className="text-sm text-slate-500">Apply for a loan, upload documents and follow your application here.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stats.map(([l, v, to]) => <NavLink key={l} to={to} className={box + ' block p-4 hover:border-royal'}><div className="text-xs text-slate-500">{l}</div><div className="mt-1 text-3xl font-bold text-navy">{v}</div></NavLink>)}</div>
    <div className="flex flex-wrap gap-3"><NavLink to="/apply-for-loan" className={btn}>Apply for a loan</NavLink><NavLink to="/track-application" className={btn2}>Track application</NavLink><NavLink to="/privacy-consent" className={btn2}>Privacy and consent</NavLink></div></div>
}

/* ------------------------------------------------------------------ Add customer wizard */
const EMP = ['Salaried', 'Self-employed', 'Business owner']
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/, MOB = /^[6-9]\d{9}$/
const age = (d: string) => { const b = new Date(d); if (isNaN(+b)) return 0; const n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a }
export function AddCustomer({ role, seed }: { role: string; seed: Row[] }) {
  const nav = useNavigate(); const { leads, addLead, addLoan } = useStore(); const fo = role === 'Franchise Owner'
  const [step, setStep] = useState(0); const [tried, setTried] = useState(false); const [done, setDone] = useState<{ cid: string; lid: string | null } | null>(null)
  const [v, setV] = useState<Record<string, string>>({ franchise: fo ? MY_FRANCHISE : FRANCHISES[0], empType: EMP[0], category: LOAN_CATS[0], createLoan: 'yes' })
  const [c1, setC1] = useState(false); const [c2, setC2] = useState(false)
  const set = (k: string, x: string) => setV(p => ({ ...p, [k]: x }))
  const t = (k: string, p: Record<string, string> = {}) => <input className={inp} value={v[k] ?? ''} onChange={e => set(k, e.target.value)} {...p} />
  const custs = () => readJson<Row[]>('dvp-m-cust', seed)
  const e: Record<string, string> = {}
  if (step === 0) {
    if ((v.name ?? '').trim().length < 2) e.name = 'Enter the full name.'
    if (!MOB.test(v.mobile ?? '')) e.mobile = 'Enter a valid 10-digit mobile number.'
    else if (custs().some(x => x.mobile === v.mobile) || leads.some(l => l.mobile === v.mobile)) e.mobile = 'Duplicate: this mobile number is already registered. Existing customers are not reassigned.'
    if (v.whatsapp && !MOB.test(v.whatsapp)) e.whatsapp = 'Enter a valid 10-digit number.'
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) e.email = 'Enter a valid email.'
    if (!v.dob || age(v.dob) < 18) e.dob = 'Customer must be 18 or older.'
    if (!(v.city ?? '').trim()) e.city = 'Enter the city.'
    if (!/^\d{6}$/.test(v.pin ?? '')) e.pin = 'Enter a 6-digit PIN code.'
    if (!PAN.test((v.pan ?? '').toUpperCase())) e.pan = 'PAN format: ABCDE1234F.'
    if (v.aadhaar && !/^\d{4}$/.test(v.aadhaar)) e.aadhaar = 'Enter the last 4 digits only.'
  }
  if (step === 1) {
    if (!(v.company ?? '').trim()) e.company = 'Enter the company or business name.'
    if (!(Number(v.income) > 0)) e.income = 'Enter monthly income.'
    if (v.empType !== 'Salaried' && !(Number(v.turnover) > 0)) e.turnover = 'Enter annual turnover.'
  }
  if (step === 2) {
    if (!(Number(v.amount) > 0)) e.amount = 'Enter the loan amount.'
    if (!(v.purpose ?? '').trim()) e.purpose = 'Enter the loan purpose.'
  }
  const next = () => { setTried(true); if (Object.keys(e).length) return; setTried(false); setStep(step + 1) }
  const submit = () => {
    if (!c1 || !c2) return setTried(true)
    const list = custs(); const cid = `CU-${maxNum(list.map(x => String(x.id))) + 1}`; const name = v.name.trim(); const amount = Number(v.amount)
    writeJson('dvp-m-cust', [{ id: cid, name, mobile: v.mobile, city: v.city.trim(), franchise: v.franchise, consent: 'Given', _h: ['Customer registered with consent'] }, ...list])
    writeJson('dvp-cx-' + cid, { ...v, pan: v.pan.toUpperCase() })
    writeJson('dvp-consent-log', [{ customer: cid, at: new Date().toISOString(), privacyNotice: 'PN-1.0', purposes: ['Process personal information', 'Share with lending institutions'], status: 'Given' }, ...readJson<Row[]>('dvp-consent-log', [])])
    let lid: string | null = null
    if (v.createLoan === 'yes') { lid = addLoan({ customer: name, category: v.category, amount, stage: 'Documents Pending', franchise: v.franchise, lenders: [], disbursed: 0 }) }
    addLead({ name, mobile: v.mobile, category: v.category, amount, status: lid ? 'Documents Pending' : 'Interested', franchise: v.franchise, source: 'Franchise entry', city: v.city.trim() })
    setDone({ cid, lid })
  }
  if (done) return <div className={box + ' max-w-lg space-y-3 p-6'}><CheckCircle2 className="text-green-600" /><h1 className="text-xl font-bold text-navy">Customer added</h1>
    <p className="text-sm text-slate-600">Customer ID <b>{done.cid}</b>{done.lid && <> and loan application <b>{done.lid}</b></>} created. Consent was recorded with the privacy notice version and time.</p>
    <div className="flex gap-3"><button className={btn} onClick={() => nav(fo ? '/document-upload' : '/documents')}>Collect documents</button><button className={btn2} onClick={() => nav('/customers')}>View customers</button></div></div>
  const STEPS = ['Personal', 'Employment', 'Loan need', 'Consent']; const E = tried ? e : {}
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold text-navy">Add new customer</h1><p className="text-sm text-slate-500">Four short steps. Consent is required before documents can be collected.</p></div>
    <ol className="flex flex-wrap gap-2 text-sm">{STEPS.map((s, i) => <li key={s} className={`rounded-full px-3 py-1 ${i === step ? 'bg-royal text-white' : i < step ? 'bg-blue-100 text-royal' : 'bg-slate-100 text-slate-500'}`}>{i + 1}. {s}</li>)}</ol>
    <div className={box + ' grid gap-4 p-5 sm:grid-cols-2'}>
      {step === 0 && <>
        <Field label="Full name" error={E.name}>{t('name')}</Field><Field label="Mobile number" error={E.mobile}>{t('mobile', { inputMode: 'numeric', maxLength: '10' } as never)}</Field>
        <Field label="WhatsApp number (optional)" error={E.whatsapp}>{t('whatsapp')}</Field><Field label="Email (optional)" error={E.email}>{t('email')}</Field>
        <Field label="Date of birth" error={E.dob}>{t('dob', { type: 'date' })}</Field><Field label="PAN number" error={E.pan}><input className={inp + ' uppercase'} maxLength={10} value={v.pan ?? ''} onChange={ev => set('pan', ev.target.value.toUpperCase())} /></Field>
        <Field label="Residential address">{t('address')}</Field><Field label="City / district" error={E.city}>{t('city')}</Field><Field label="PIN code" error={E.pin}>{t('pin', { inputMode: 'numeric', maxLength: '6' } as never)}</Field>
        <Field label="Aadhaar, last 4 digits only (optional)" error={E.aadhaar}>{t('aadhaar', { inputMode: 'numeric', maxLength: '4' } as never)}</Field>
        {!fo && <Field label="Franchise"><select className={inp} value={v.franchise} onChange={ev => set('franchise', ev.target.value)}>{FRANCHISES.map(x => <option key={x}>{x}</option>)}</select></Field>}</>}
      {step === 1 && <>
        <Field label="Employment type"><select className={inp} value={v.empType} onChange={ev => set('empType', ev.target.value)}>{EMP.map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Company or business name" error={E.company}>{t('company')}</Field>
        <Field label="Monthly income (₹)" error={E.income}>{t('income', { type: 'number' })}</Field>
        {v.empType !== 'Salaried' && <Field label="Annual turnover (₹)" error={E.turnover}>{t('turnover', { type: 'number' })}</Field>}
        <Field label="Employment or business duration (years)">{t('years', { type: 'number' })}</Field><Field label="Existing loans (type and lender)">{t('existing')}</Field>
        <Field label="Existing monthly EMI (₹)">{t('emi', { type: 'number' })}</Field><Field label="Credit score (only if the customer shares it)">{t('score', { type: 'number' })}</Field></>}
      {step === 2 && <>
        <Field label="Loan category"><select className={inp} value={v.category} onChange={ev => set('category', ev.target.value)}>{LOAN_CATS.map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Loan amount (₹)" error={E.amount}>{t('amount', { type: 'number' })}</Field><Field label="Purpose" error={E.purpose}>{t('purpose')}</Field>
        <Field label="Preferred tenure (months)">{t('tenure', { type: 'number' })}</Field><Field label="Preferred EMI (₹)">{t('prefEmi', { type: 'number' })}</Field>
        <Field label="Existing bank relationship">{t('bank')}</Field><Field label="Security or collateral (if any)">{t('collateral')}</Field>
        <Field label="Create loan application now?"><select className={inp} value={v.createLoan} onChange={ev => set('createLoan', ev.target.value)}><option value="yes">Yes, start document collection</option><option value="no">No, save as a lead only</option></select></Field></>}
      {step === 3 && <div className="space-y-3 text-sm sm:col-span-2"><p className="text-slate-600">Read this to the customer or let them read it. Privacy notice version <b>PN-1.0</b>. Time of consent is saved automatically, and the customer can withdraw later.</p>
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={c1} onChange={ev => setC1(ev.target.checked)} />I consent to DVP Capitals and my franchise processing my personal information to assess and apply for a loan.</label>
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={c2} onChange={ev => setC2(ev.target.checked)} />I consent to sharing my information and documents with the banks and NBFCs relevant to my application.</label>
        {tried && (!c1 || !c2) && <p role="alert" className="text-red-600">Both consents are required to continue.</p>}</div>}
    </div>
    <div className="flex gap-3">{step > 0 && <button className={btn2} onClick={() => { setStep(step - 1); setTried(false) }}>Back</button>}{step < 3 ? <button className={btn} onClick={next}>Continue</button> : <button className={btn} onClick={submit}>Save customer</button>}</div></div>
}

/* ------------------------------------------------------------------ Franchise onboarding */
const OSTEPS = ['Inquiry', 'Verification', 'Application and KYC', 'Fee payment', 'Agreement', 'Activation', 'Welcome kit']
export type Ob = { id: string; name: string; owner: string; mobile: string; city: string; step: number; d: Record<string, string>; fid?: string }
export const OB_SEED: Ob[] = [{ id: 'OB-1', name: 'Kolhapur Finserv', owner: 'Sachin Mane', mobile: '9822000111', city: 'Kolhapur', step: 1, d: {} }, { id: 'OB-2', name: 'Nagpur Loans Hub', owner: 'Pooja Rathod', mobile: '9890000222', city: 'Nagpur', step: 3, d: { pan: 'ABCDE1234F', kyc: 'yes', verified: 'yes' } }]
export function FranchiseHub({ seed, terrSeed, render }: { seed: Row[]; terrSeed: Row[]; render: (v: number) => ReactNode }) {
  const [ver, setVer] = useState(0); const [list, setList] = useState<Ob[]>(() => readJson<Ob[]>('dvp-onb', OB_SEED)); const [open, setOpen] = useState(false)
  const [n, setN] = useState({ name: '', owner: '', mobile: '', city: '' }); const [err, setErr] = useState<Record<string, string>>({}); const [msg, setMsg] = useState('')
  const put = (x: Ob[]) => { setList(x); writeJson('dvp-onb', x) }
  const patch = (id: string, f: (o: Ob) => Ob) => put(list.map(o => o.id === id ? f(o) : o))
  const addInq = () => {
    const e: Record<string, string> = {}
    if (n.name.trim().length < 2) e.name = 'Enter the business name.'; if (n.owner.trim().length < 2) e.owner = 'Enter the owner name.'
    if (!MOB.test(n.mobile)) e.mobile = 'Enter a valid mobile number.'; if (!n.city.trim()) e.city = 'Enter the city.'
    setErr(e); if (Object.keys(e).length) return
    put([...list, { id: `OB-${Math.max(0, ...list.map(o => parseInt(o.id.replace(/\D/g, '')) || 0)) + 1}`, ...n, step: 0, d: {} }]); setN({ name: '', owner: '', mobile: '', city: '' }); setOpen(false)
  }
  const [inp2, setInp2] = useState<Record<string, string>>({}); const [serr, setSerr] = useState<Record<string, string>>({})
  const advance = (o: Ob) => {
    const g = (k: string) => (inp2[o.id + k] ?? o.d[k] ?? '').trim(); const d = { ...o.d }; let e = ''
    if (o.step === 1) { if (inp2[o.id + 'verified'] !== 'yes') e = 'Confirm that identity and background are verified.'; else d.verified = 'yes' }
    if (o.step === 2) { if (!PAN.test(g('pan').toUpperCase())) e = 'Enter a valid PAN (ABCDE1234F).'; else if (g('email') && !/^\S+@\S+\.\S+$/.test(g('email'))) e = 'Enter a valid owner email.'; else if (g('gst') && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(g('gst').toUpperCase())) e = 'GST number format is not valid.'; else if (inp2[o.id + 'kyc'] !== 'yes' && d.kyc !== 'yes') e = 'Confirm KYC documents are received.'; else { d.pan = g('pan').toUpperCase(); d.gst = g('gst').toUpperCase(); d.email = g('email'); d.address = g('address'); d.kyc = 'yes' } }
    if (o.step === 3) { const bank = g('accHolder') || g('bankName') || g('accNo') || g('ifsc')
      if (!(Number(g('fee')) > 0)) e = 'Enter the franchise fee received.'; else if (g('ref').length < 4) e = 'Enter the payment reference.'
      else if (bank && (g('accHolder').length < 2 || g('bankName').length < 2)) e = 'For bank details, enter the account holder and bank name, or clear all bank fields.'
      else if (bank && !/^\d{9,18}$/.test(g('accNo'))) e = 'Account number must be 9 to 18 digits.'
      else if (bank && !IFSC_RE.test(g('ifsc').toUpperCase())) e = 'IFSC format: 4 letters, 0, then 6 letters or digits.'
      else { d.fee = g('fee'); d.ref = g('ref'); d.accHolder = g('accHolder'); d.bankName = g('bankName'); d.accNo = g('accNo'); d.ifsc = g('ifsc').toUpperCase() } }
    if (o.step === 4) { if (!inp2[o.id + 'signed'] && d.signed !== 'yes') e = 'Confirm the agreement is signed.'; else if (!g('start')) e = 'Enter the agreement start date.'; else if (!g('expiry') || g('expiry') <= g('start')) e = 'Enter an agreement expiry date after the start date.'; else { d.signed = 'yes'; d.start = g('start'); d.expiry = g('expiry'); d.agrRef = g('agrRef') } }
    if (o.step === 5) {
      const type = g('type') || 'Exclusive'; const terr = readJson<Row[]>('dvp-m-terr', terrSeed)
      if (type === 'Exclusive' && terr.some(x => x.city === o.city && x.type === 'Exclusive')) e = `${o.city} already has an exclusive franchise. Choose Shared or Non-exclusive.`
      else { const fr = readJson<Row[]>('dvp-m-fran', seed); const fid = `FR-${maxNum(fr.map(x => String(x.id))) + 1}`
        writeJson('dvp-m-fran', [{ id: fid, name: o.name, owner: o.owner, city: o.city, territory: type, fee: Number(d.fee), status: 'Active', _h: ['Activated through onboarding'] }, ...fr])
        writeJson('dvp-m-terr', [{ id: `TR-${maxNum(terr.map(x => String(x.id))) + 1}`, city: o.city, franchise: o.name, type }, ...terr]); d.fid = fid; d.type = type
        saveFranProfile(fid, { mobile: o.mobile, email: d.email ?? '', address: d.address ?? '', pan: d.pan ?? '', gst: d.gst ?? '', kyc: 'Verified', accHolder: d.accHolder ?? '', bankName: d.bankName ?? '', accNo: d.accNo ?? '', ifsc: d.ifsc ?? '', accType: 'Current', bankVerified: false, rm: g('rm') })
        upsertAgreement(o.name, { start: d.start, expiry: d.expiry, ref: d.agrRef ?? '', renewal: 'Manual', signed: true }); audit('Franchise onboarding', `Activated ${o.name} as ${fid}`); setVer(x => x + 1); setMsg(`${o.name} is now active as ${fid}. Its portal login is created when the backend is connected.`) } }
    setSerr({ ...serr, [o.id]: e }); if (e) return
    patch(o.id, x => ({ ...x, d, step: x.step + 1, fid: d.fid }))
  }
  const ctl = (o: Ob, k: string, label: string, type = 'text') => <Field label={label}><input type={type} className={inp} value={inp2[o.id + k] ?? o.d[k] ?? ''} onChange={e => setInp2({ ...inp2, [o.id + k]: e.target.value })} /></Field>
  const chk = (o: Ob, k: string, label: string) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(inp2[o.id + k] ?? o.d[k]) === 'yes'} onChange={e => setInp2({ ...inp2, [o.id + k]: e.target.checked ? 'yes' : '' })} />{label}</label>
  return <div className="space-y-6"><div className={box + ' p-5'}><div className="flex flex-wrap items-center justify-between gap-2"><div><b className="text-navy">Franchise onboarding pipeline</b><p className="text-xs text-slate-500">Seven steps from inquiry to welcome kit. Activation creates the franchise and its territory.</p></div><button className={btn} onClick={() => setOpen(!open)}>New inquiry</button></div>
    {msg && <p role="status" className="mt-3 rounded bg-green-50 p-2 text-sm text-green-700">{msg}</p>}
    {open && <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">{(['name', 'owner', 'mobile', 'city'] as const).map(k => <Field key={k} label={{ name: 'Business name', owner: 'Owner', mobile: 'Mobile', city: 'City' }[k]} error={err[k]}><input className={inp} value={n[k]} onChange={e => setN({ ...n, [k]: e.target.value })} /></Field>)}<button className={btn + ' self-end'} onClick={addInq}>Add inquiry</button></div>}
    <div className="mt-4 space-y-3">{list.map(o => <div key={o.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><b>{o.name}</b><span className="text-slate-500">{o.owner} · {o.city} · {o.mobile}</span></div>
      <ol className="mt-2 flex flex-wrap gap-1 text-xs">{OSTEPS.map((s, i) => <li key={s} className={`rounded px-2 py-1 ${i < o.step ? 'bg-green-100 text-green-700' : i === o.step ? 'bg-royal text-white' : 'bg-slate-100 text-slate-500'}`}>{s}</li>)}</ol>
      {o.step < 7 ? <div className="mt-3 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {o.step === 0 && <p className="text-sm text-slate-600 sm:col-span-3">Head office contacts the applicant and starts verification.</p>}
        {o.step === 1 && <div className="sm:col-span-3">{chk(o, 'verified', 'Identity and background verified')}</div>}
        {o.step === 2 && <>{ctl(o, 'pan', 'PAN')}{ctl(o, 'gst', 'GST number (if any)')}{ctl(o, 'email', 'Owner email (optional)')}{ctl(o, 'address', 'Business address')}{chk(o, 'kyc', 'KYC documents received')}</>}
        {o.step === 3 && <>{ctl(o, 'fee', 'Franchise fee received (₹)', 'number')}{ctl(o, 'ref', 'Payment reference')}<p className="text-xs text-slate-500 sm:col-span-4">Bank account for commission payouts (optional now, can be added later in the franchise profile).</p>{ctl(o, 'accHolder', 'Account holder')}{ctl(o, 'bankName', 'Bank name')}{ctl(o, 'accNo', 'Account number')}{ctl(o, 'ifsc', 'IFSC code')}</>}
        {o.step === 4 && <>{ctl(o, 'start', 'Agreement start date', 'date')}{ctl(o, 'expiry', 'Agreement expiry date', 'date')}{ctl(o, 'agrRef', 'Agreement reference (optional)')}{chk(o, 'signed', 'Agreement signed by both parties')}</>}
        {o.step === 5 && <><Field label="Territory type"><select className={inp} value={inp2[o.id + 'type'] ?? 'Exclusive'} onChange={e => setInp2({ ...inp2, [o.id + 'type']: e.target.value })}>{['Exclusive', 'Shared', 'Non-exclusive'].map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Relationship manager"><select className={inp} value={inp2[o.id + 'rm'] ?? ''} onChange={e => setInp2({ ...inp2, [o.id + 'rm']: e.target.value })}><option value="">Assign later</option>{employeeNames().map(x => <option key={x}>{x}</option>)}</select></Field></>}
        {o.step === 6 && <p className="text-sm text-slate-600 sm:col-span-3">Send the welcome kit: branding files, training access and operating guidelines.</p>}
        <button className={btn} onClick={() => advance(o)}>{o.step === 6 ? 'Complete onboarding' : o.step === 5 ? 'Activate franchise' : 'Next step'}</button>
        {serr[o.id] && <p role="alert" className="text-sm text-red-600 sm:col-span-4">{serr[o.id]}</p>}</div>
        : <p className="mt-3 text-sm text-green-700">Onboarding complete{o.fid ? ` · ${o.fid}` : ''}.</p>}</div>)}</div></div>
    {render(ver)}</div>
}

/* ------------------------------------------------------------------ Lender dashboard */
const lendersNow = () => lenderRows().filter(r => r.status === 'Active').map(r => { const p = getLenderProfile(String(r.name)); return { n: String(r.name), t: String(r.type), cats: p.cats, min: p.minAmt, max: p.maxAmt, rate: p.rateFrom, fee: p.procFee, tat: p.tat, comm: p.commRate, score: p.minScore, income: p.minIncome, empTypes: p.empTypes } })
export function LenderDashboard() {
  const loans = useStore(s => s.loans); const [cat, setCat] = useState('Business Loan'); const [amt, setAmt] = useState(5000000); const [score, setScore] = useState(0); const [inc, setInc] = useState(0); const LENDERS = lendersNow()
  const stats = LENDERS.map(l => { const subs = loans.flatMap(x => x.lenders.filter(y => y.name === l.n && y.status !== 'Not Submitted')); const ap = subs.filter(s => s.status === 'Approved'), rj = subs.filter(s => s.status === 'Rejected')
    return { ...l, sub: subs.length, ap: ap.length, rj: rj.length, amt: ap.reduce((a, s) => a + s.amount, 0) } })
  const fit = LENDERS.map(l => ({ l, why: l.cats.length && !l.cats.includes(cat) ? 'Does not offer this loan category' : l.min && amt < l.min ? `Minimum is ${inr(l.min)}` : l.max && amt > l.max ? `Maximum is ${inr(l.max)}` : score && l.score && score < l.score ? `Needs credit score ${l.score}+` : inc && l.income && inc < l.income ? `Needs monthly income ${inr(l.income)}+` : '' })).sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0) || a.l.rate - b.l.rate)
  const pc = (a: number, b: number) => b ? Math.round(a / b * 100) + '%' : '—'
  return <div className="space-y-5"><div className={box + ' overflow-x-auto'}><div className="p-4"><b className="text-navy">Lender network performance</b><p className="text-xs text-slate-500">Calculated from the lender submissions on all loan files.</p></div>
    <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Lender', 'Type', 'Submitted', 'Approval ratio', 'Rejection ratio', 'Approved amount', 'Avg. turnaround'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody>{stats.map(s => <tr key={s.n} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{s.n}</td><td className="px-4 py-3">{s.t}</td><td className="px-4 py-3">{s.sub}</td><td className="px-4 py-3">{pc(s.ap, s.sub)}</td><td className="px-4 py-3">{pc(s.rj, s.sub)}</td><td className="px-4 py-3">{s.amt ? inr(s.amt) : '—'}</td><td className="px-4 py-3">{s.tat} days</td></tr>)}</tbody></table></div>
    <div className={box + ' p-4'}><b className="text-navy">Compare lenders for a customer</b><p className="text-xs text-slate-500">Uses the terms saved in each lender's profile (Banks & NBFC, Profile tab). Confirm current terms with each lender.</p>
      <div className="my-3 flex flex-wrap gap-3"><select aria-label="Loan category" className={inp + ' max-w-xs'} value={cat} onChange={e => setCat(e.target.value)}>{LOAN_CATS.map(x => <option key={x}>{x}</option>)}</select><input aria-label="Amount" type="number" className={inp + ' max-w-xs'} value={amt} onChange={e => setAmt(+e.target.value)} /><input aria-label="Customer credit score (optional)" placeholder="Credit score (optional)" type="number" className={inp + ' max-w-48'} value={score || ''} onChange={e => setScore(+e.target.value)} /><input aria-label="Monthly income (optional)" placeholder="Monthly income (optional)" type="number" className={inp + ' max-w-48'} value={inc || ''} onChange={e => setInc(+e.target.value)} /></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr>{['Lender', 'Eligibility', 'Rate from', 'Processing fee', 'Turnaround', 'DVP commission'].map(h => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}</tr></thead>
        <tbody>{fit.map(({ l, why }) => <tr key={l.n} className={`border-t border-slate-100 ${why ? 'text-slate-400' : ''}`}><td className="py-2 pr-4 font-medium">{l.n}</td><td className="pr-4">{why ? why : 'Eligible'}</td><td className="pr-4">{l.rate}%</td><td className="pr-4">{l.fee}%</td><td className="pr-4">{l.tat} days</td><td>{l.comm ? l.comm + '%' : '—'}</td></tr>)}</tbody></table></div></div></div>
}

/* ------------------------------------------------------------------ Public landing page */
export function Landing() {
  const { slug: s } = useParams(); const { leads, addLead } = useStore()
  const names = [...FRANCHISES, ...readJson<Row[]>('dvp-m-fran', []).map(x => String(x.name))]; const fr = names.find(x => slug(x) === s)
  const [f, setF] = useState({ name: '', mobile: '', city: '', category: LOAN_CATS[0], amount: '' }); const [ok, setOk] = useState(false); const [c, setC] = useState(false); const [err, setErr] = useState(''); const [dup, setDup] = useState(false)
  if (!fr) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-xl font-bold text-navy">Page not found</h1><p className="text-sm text-slate-500">This franchise link is not valid. Please check the link you were given.</p></div></div>
  const go = (e: React.FormEvent) => {
    e.preventDefault()
    if (f.name.trim().length < 2) return setErr('Please enter your name.')
    if (!MOB.test(f.mobile)) return setErr('Please enter a valid 10-digit mobile number.')
    if (!(Number(f.amount) > 0)) return setErr('Please enter the loan amount you need.')
    if (!c) return setErr('Please give your consent to continue.')
    setErr('')
    if (leads.some(l => l.mobile === f.mobile)) setDup(true)
    else addLead({ name: f.name.trim(), mobile: f.mobile, category: f.category, amount: Number(f.amount), status: 'New Lead', franchise: fr, source: 'Referral link', city: f.city.trim() })
    setOk(true)
  }
  return <div className="min-h-screen bg-slate-50"><header className="bg-navy px-6 py-8 text-white"><div className="mx-auto max-w-2xl"><h1 className="text-2xl font-bold">{fr}</h1><p className="text-gold">Powered by DVP Capitals</p><p className="mt-2 text-sm text-slate-300">Home, business, property and personal loans through a network of banks and NBFCs.</p></div></header>
    <main className="mx-auto max-w-2xl p-6">{ok ? <div className={box + ' p-6 text-center'}><CheckCircle2 className="mx-auto text-green-600" /><h2 className="mt-2 text-lg font-bold text-navy">Thank you</h2>
      <p className="mt-1 text-sm text-slate-600">{dup ? 'We already have an enquiry for this number, so your existing contact will follow up.' : `${fr} will contact you shortly to guide you with documents.`}</p></div> :
      <form onSubmit={go} className={box + ' grid gap-4 p-6 sm:grid-cols-2'}><h2 className="text-lg font-bold text-navy sm:col-span-2">Apply for a loan</h2>
        <Field label="Your name"><input className={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field><Field label="Mobile number"><input className={inp} inputMode="numeric" maxLength={10} value={f.mobile} onChange={e => setF({ ...f, mobile: e.target.value })} /></Field>
        <Field label="City"><input className={inp} value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></Field><Field label="Loan category"><select className={inp} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{LOAN_CATS.map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Amount needed (₹)"><input className={inp} type="number" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></Field>
        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" className="mt-1" checked={c} onChange={e => setC(e.target.checked)} />I agree that {fr} and DVP Capitals may contact me and process my details to help me apply for a loan, and share them with lenders when I proceed.</label>
        {err && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</p>}<button className={btn + ' sm:col-span-2'}>Submit enquiry</button>
        <p className="text-xs text-slate-500 sm:col-span-2">Submitting this form does not guarantee a loan. Approval, amount and rate are decided by the lender.</p></form>}</main></div>
}

export function ApplyLoan() {
  const addLoan = useStore(s => s.addLoan); const [f, setF] = useState({ category: LOAN_CATS[0], amount: '', purpose: '' }); const [id, setId] = useState(''); const [err, setErr] = useState('')
  const go = () => {
    if (!(Number(f.amount) > 0)) return setErr('Enter the amount you need.'); if (!f.purpose.trim()) return setErr('Enter the purpose.')
    setId(addLoan({ customer: 'Demo Customer', category: f.category, amount: Number(f.amount), stage: 'New Inquiry', franchise: MY_FRANCHISE, lenders: [], disbursed: 0 })); setErr('')
  }
  if (id) return <div className={box + ' max-w-lg space-y-3 p-6'}><CheckCircle2 className="text-green-600" /><h1 className="text-xl font-bold text-navy">Application submitted</h1><p className="text-sm text-slate-600">Your application <b>{id}</b> was sent to {MY_FRANCHISE}. Follow it under Track Application.</p><NavLink to="/track-application" className={btn}>Track application</NavLink></div>
  return <div className={box + ' grid max-w-lg gap-4 p-6'}><h1 className="text-xl font-bold text-navy">Apply for a loan</h1>
    <Field label="Loan category"><select className={inp} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{LOAN_CATS.map(x => <option key={x}>{x}</option>)}</select></Field>
    <Field label="Amount needed (₹)"><input type="number" className={inp} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></Field>
    <Field label="Purpose"><input className={inp} value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} /></Field>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}<button className={btn} onClick={go}>Submit application</button></div>
}