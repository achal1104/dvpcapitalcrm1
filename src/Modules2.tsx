import { useState } from 'react'
import { Download, Plus, Search, Trash2 } from 'lucide-react'
import { Loans, Commissions } from './Modules'
import { QRCodeSVG } from 'qrcode.react'
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from './store'
import { DateFilter, HighTicket, Performance, inRange } from './Modules3'
import { Content } from './Content'
import { Attendance, BusinessConfig } from './Extras'
import { ApplyLoan, AddCustomer, FranchiseHub, LenderDashboard, MarketingKit, PaymentHistory, Training, TrackApplication } from './Modules4'
import { DocsPage } from './Documents'
import { FranchiseProfile, LenderProfileView, MyProfile } from './Profiles'
import type { Sub } from './Profiles'
import { AGR_SEED, CNOTIF_SEED, EMP_SEED, LEAD_STATUS, LEND_SEED, lenderRows, LOAN_CATS, MY_FRANCHISE, NOTIF_SEED, REVENUE, ROLES, inr, isMyLoan, navFor, readJson, slug, writeJson } from './data'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
type F = { k: string; l: string; opts?: string[]; num?: boolean; money?: boolean; date?: boolean; file?: boolean }
type Cfg = { id: string; title: string; note?: string; pre: string; fields: F[]; seed: Row[]; status?: string; own?: string; flt?: [string, string[]]; df?: string; ro?: boolean; open?: boolean; guard?: (r: Row, a: Row[]) => string | null }
const f = (k: string, l: string, x: Partial<F> = {}): F => ({ k, l, ...x })
const FRS = ['Akshay Finance', 'Satara Capital', 'Mumbai Credit Hub', 'Nashik Finserv']
const TK = ['Open', 'In Progress', 'Waiting for Response', 'Resolved', 'Closed']
const DT = ['PAN Card', 'Aadhaar / Permitted KYC Proof', 'Photograph', 'Bank Statements', 'Salary Slips', 'ITR', 'GST Returns', 'Business Registration', 'Property Documents', 'Financial Statements']
const SRC = ['Website', 'Facebook', 'Instagram', 'Google Ads', 'WhatsApp', 'Walk-in', 'Customer Referral', 'Business Networking', 'Other']
const PR = ['Low', 'Medium', 'High']
const DS = ['Uploaded', 'Verified', 'Rejected', 'Missing']
const docNote = 'Demo only: files (PDF, JPG, PNG up to 1.5 MB) are kept in this browser. Production needs private encrypted storage with expiring links.'
const fran: Cfg = { id: 'fran', pre: 'FR', title: 'Franchise management', status: 'status',
  fields: [f('name', 'Business name'), f('owner', 'Owner'), f('city', 'City'), f('territory', 'Territory', { opts: ['Exclusive', 'Shared', 'Non-exclusive'] }), f('fee', 'Franchise fee', { num: true, money: true }), f('status', 'Status', { opts: ['Inquiry', 'Under Verification', 'Agreement Pending', 'Active', 'Suspended', 'Terminated'] })],
  seed: [{ id: 'FR-101', name: 'Akshay Finance', owner: 'Akshay Patil', city: 'Pune', territory: 'Exclusive', fee: 500000, status: 'Active' }, { id: 'FR-102', name: 'Satara Capital', owner: 'Mahesh Pawar', city: 'Satara', territory: 'Exclusive', fee: 350000, status: 'Active' }, { id: 'FR-103', name: 'Mumbai Credit Hub', owner: 'Farhan Khan', city: 'Mumbai', territory: 'Shared', fee: 900000, status: 'Active' }, { id: 'FR-104', name: 'Nashik Finserv', owner: 'Pooja Shinde', city: 'Nashik', territory: 'Exclusive', fee: 350000, status: 'Under Verification' }],
  guard: (r, a) => r.territory === 'Exclusive' && a.some(x => x.city === r.city && x.territory === 'Exclusive') ? `${r.city} already has an exclusive franchise.` : null }
const cust: Cfg = { id: 'cust', pre: 'CU', title: 'Customers', status: 'consent', own: 'franchise', note: 'Consent must be recorded before documents are collected or shared with lenders.',
  fields: [f('name', 'Full name'), f('mobile', 'Mobile'), f('city', 'City'), f('franchise', 'Franchise', { opts: FRS }), f('consent', 'Consent', { opts: ['Given', 'Withdrawn'] })],
  seed: [{ id: 'CU-101', name: 'Rohit Deshmukh', mobile: '9822012345', city: 'Pune', franchise: 'Akshay Finance', consent: 'Given' }, { id: 'CU-102', name: 'Sneha Kulkarni', mobile: '9890123456', city: 'Pune', franchise: 'Akshay Finance', consent: 'Given' }, { id: 'CU-103', name: 'Imran Shaikh', mobile: '9923456789', city: 'Satara', franchise: 'Satara Capital', consent: 'Given' }, { id: 'CU-104', name: 'Vikas Jadhav', mobile: '9011223344', city: 'Nashik', franchise: 'Nashik Finserv', consent: 'Given' }, { id: 'CU-105', name: 'Anjali Mehta', mobile: '9988776655', city: 'Mumbai', franchise: 'Mumbai Credit Hub', consent: 'Withdrawn' }],
  guard: (r, a) => !/^[6-9]\d{9}$/.test(String(r.mobile)) ? 'Enter a valid 10-digit Indian mobile number.' : a.some(x => x.mobile === r.mobile) ? 'Duplicate mobile number: this customer already exists.' : null }
const docs: Cfg = { id: 'docs', pre: 'DC', title: 'Documents', note: docNote, status: 'status', own: 'franchise', fields: [f('customer', 'Customer'), f('docType', 'Document', { opts: DT }), f('file', 'File', { file: true }), f('status', 'Status', { opts: DS }), f('franchise', 'Franchise', { opts: FRS })],
  seed: [{ id: 'DC-101', customer: 'Rohit Deshmukh', docType: 'PAN Card', file: 'pan.pdf', status: 'Verified', franchise: 'Akshay Finance' }, { id: 'DC-102', customer: 'Rohit Deshmukh', docType: 'Bank Statements', file: '', status: 'Missing', franchise: 'Akshay Finance' }, { id: 'DC-103', customer: 'Sneha Kulkarni', docType: 'Salary Slips', file: 'slips.pdf', status: 'Rejected', franchise: 'Akshay Finance' }, { id: 'DC-104', customer: 'Imran Shaikh', docType: 'GST Returns', file: 'gst.pdf', status: 'Uploaded', franchise: 'Satara Capital' }] }
const tick: Cfg = { id: 'tick', pre: 'TK', title: 'Support tickets', status: 'status', own: 'franchise', fields: [f('subject', 'Subject'), f('priority', 'Priority', { opts: PR }), f('franchise', 'Franchise', { opts: FRS }), f('status', 'Status', { opts: TK })],
  seed: [{ id: 'TK-101', subject: 'Need 6-month bank statement format', priority: 'Medium', franchise: 'Akshay Finance', status: 'Open' }, { id: 'TK-102', subject: 'Commission statement mismatch', priority: 'High', franchise: 'Nashik Finserv', status: 'In Progress' }] }
const CFG: Record<string, Cfg> = {
  'Franchise Management': fran,
  'Active Franchises': { ...fran, title: 'Active franchises', flt: ['status', ['Active']] },
  'Pending Approvals': { ...fran, title: 'Pending approvals', flt: ['status', ['Inquiry', 'Under Verification', 'Agreement Pending']] },
  'Suspended Franchises': { ...fran, title: 'Suspended franchises', flt: ['status', ['Suspended']] },
  'Terminated Franchises': { ...fran, title: 'Terminated franchises', flt: ['status', ['Terminated']] }, 'My Profile': { ...fran, own: 'name', ro: true, title: 'My franchise profile' },
  Customers: cust, 'Add New Customer': { ...cust, open: true },
  Documents: docs, 'Document Upload': docs,
  'Banks & NBFC': { id: 'lend', pre: 'LD', title: 'Banks and NBFCs', status: 'status', note: 'Open a lender ID and use the Profile tab for contacts, limits, eligibility, fees and the commission agreement.', fields: [f('name', 'Name'), f('type', 'Type', { opts: ['Bank', 'NBFC'] }), f('products', 'Loan categories'), f('rate', 'Interest rate'), f('tat', 'Turnaround'), f('status', 'Status', { opts: ['Active', 'Inactive'] })], seed: LEND_SEED },
  'Support & Tickets': tick, Helpdesk: tick, 'Training & Support': tick,
  Employees: { id: 'emp', pre: 'EM', title: 'Employees', status: 'status', fields: [f('name', 'Name'), f('dept', 'Department', { opts: ['Operations', 'Loan Processing', 'Accounts', 'Sales', 'Support', 'Audit'] }), f('role', 'Designation'), f('status', 'Status', { opts: ['Active', 'Inactive'] })],
    seed: EMP_SEED },
  Marketing: { id: 'mkt', pre: 'MK', title: 'Campaigns', status: 'status', note: 'Each franchise has its own referral link, QR code and landing page.', fields: [f('name', 'Campaign'), f('source', 'Lead source', { opts: SRC }), f('leads', 'Leads', { num: true }), f('status', 'Status', { opts: ['Draft', 'Live', 'Ended'] })],
    seed: [{ id: 'MK-101', name: 'Diwali Home Loan Drive', source: 'Instagram', leads: 38, status: 'Live' }, { id: 'MK-102', name: 'MSME Working Capital', source: 'WhatsApp', leads: 24, status: 'Ended' }] },
  Agreements: { id: 'agr', pre: 'AG', title: 'Franchise agreements', status: 'status', df: 'start', fields: [f('franchise', 'Franchise', { opts: FRS }), f('start', 'Start', { date: true }), f('expiry', 'Expiry', { date: true }), f('policy', 'Policy accepted', { opts: ['Yes', 'No'] }), f('esign', 'E-signature', { opts: ['Pending', 'Signed'] }), f('status', 'Status', { opts: ['Draft', 'Signed', 'Expiring', 'Expired'] })],
    seed: AGR_SEED },
  Notifications: { id: 'notif', pre: 'NT', title: 'Notifications', status: 'status', fields: [f('message', 'Message'), f('category', 'Category', { opts: ['New Loan Application', 'Document Rejected', 'Document Uploaded', 'Document Requested', 'Document Expiring', 'Query Raised', 'File Assigned', 'File Escalated', 'Commission Received', 'Agreement Expiring'] }), f('status', 'Status', { opts: ['Unread', 'Read'] })],
    seed: NOTIF_SEED },
  'Audit Logs': { id: 'audit', pre: 'AL', title: 'Audit logs', ro: true, df: 'time', fields: [f('user', 'User'), f('action', 'Action'), f('time', 'Time')], seed: [{ id: 'AL-101', user: 'Super Admin', action: 'Approved franchise FR-104 for verification', time: '2026-11-17 10:42' }, { id: 'AL-102', user: 'Accounts Manager', action: 'Marked C-3 as Paid', time: '2026-11-16 17:05' }, { id: 'AL-103', user: 'Franchise Manager', action: 'Suspended franchise FR-109', time: '2026-11-02 12:20' }, { id: 'AL-104', user: 'Super Admin', action: 'Changed role permissions', time: '2026-09-05 09:10' }] },
  Reports: { id: 'rep', pre: 'RP', title: 'Franchise performance report', ro: true, note: 'Use Export CSV to download.', fields: [f('franchise', 'Franchise'), f('leads', 'Leads', { num: true }), f('files', 'Files submitted', { num: true }), f('disbursed', 'Disbursed', { num: true, money: true }), f('commission', 'Commission paid', { num: true, money: true })],
    seed: [{ id: 'RP-1', franchise: 'Akshay Finance', leads: 62, files: 31, disbursed: 18500000, commission: 320000 }, { id: 'RP-2', franchise: 'Mumbai Credit Hub', leads: 48, files: 22, disbursed: 14200000, commission: 240000 }, { id: 'RP-3', franchise: 'Nashik Finserv', leads: 35, files: 14, disbursed: 7500000, commission: 150000 }] },
  Territories: { id: 'terr', pre: 'TR', title: 'Territory management', status: 'type', note: 'An exclusive territory can belong to only one franchise.', fields: [f('city', 'City'), f('franchise', 'Franchise', { opts: FRS }), f('type', 'Type', { opts: ['Exclusive', 'Shared', 'Non-exclusive'] })],
    seed: [{ id: 'TR-101', city: 'Pune', franchise: 'Akshay Finance', type: 'Exclusive' }, { id: 'TR-102', city: 'Satara', franchise: 'Satara Capital', type: 'Exclusive' }, { id: 'TR-103', city: 'Mumbai', franchise: 'Mumbai Credit Hub', type: 'Shared' }, { id: 'TR-104', city: 'Nashik', franchise: 'Nashik Finserv', type: 'Exclusive' }],
    guard: (r, a) => r.type === 'Exclusive' && a.some(x => x.city === r.city && x.type === 'Exclusive') ? `${r.city} already has an exclusive franchise.` : null },
  Tasks: { id: 'task', pre: 'TS', title: 'Employee tasks', status: 'status', df: 'due', fields: [f('title', 'Task'), f('assignee', 'Assigned to', { opts: EMP_SEED.map(e => e.name) }), f('due', 'Due date', { date: true }), f('priority', 'Priority', { opts: PR }), f('status', 'Status', { opts: ['To do', 'In progress', 'Done'] })],
    seed: [{ id: 'TS-101', title: 'Verify LN-2002 salary slips', assignee: 'Neha Joshi', due: '2026-11-25', priority: 'High', status: 'To do' }, { id: 'TS-102', title: 'Follow up Bank C query on LN-2001', assignee: 'Amit Deshpande', due: '2026-11-22', priority: 'Medium', status: 'In progress' }] },
  'Financial Reports': { id: 'fin', pre: 'FN', title: 'Financial reports', ro: true, note: 'Sample figures for demonstration. Use Export CSV to download.', fields: [f('franchise', 'Franchise'), f('fees', 'Franchise fees collected', { num: true, money: true }), f('received', 'Lender commission received', { num: true, money: true }), f('receivable', 'Outstanding receivable', { num: true, money: true }), f('payable', 'Franchise payable', { num: true, money: true }), f('profit', 'Head office profit', { num: true, money: true })],
    seed: [{ id: 'FN-1', franchise: 'Akshay Finance', fees: 500000, received: 320000, receivable: 70000, payable: 96000, profit: 724000 }, { id: 'FN-2', franchise: 'Satara Capital', fees: 350000, received: 120000, receivable: 0, payable: 48000, profit: 422000 }, { id: 'FN-3', franchise: 'Mumbai Credit Hub', fees: 900000, received: 240000, receivable: 40000, payable: 72000, profit: 1068000 }] },
  Settings: { id: 'set', pre: 'LC', title: 'Settings: loan categories', fields: [f('name', 'Loan category')], seed: LOAN_CATS.map((n, i) => ({ id: 'LC-' + (101 + i), name: n })) },
}
const CUST: Record<string, Cfg> = {
  'Apply for Loan': { id: 'apply', pre: 'AP', title: 'Apply for a loan', open: true, status: 'status', fields: [f('category', 'Loan category', { opts: LOAN_CATS }), f('amount', 'Amount needed', { num: true, money: true }), f('purpose', 'Purpose'), f('status', 'Status', { opts: ['Submitted'] })], seed: [] },
  'My Applications': { id: 'myapp', pre: 'MA', title: 'My applications', ro: true, fields: [f('category', 'Loan'), f('stage', 'Stage'), f('remark', 'Update from DVP Capitals')], seed: [{ id: 'LN-2001', category: 'Business Loan', stage: 'Under Bank Processing', remark: 'Your file is with the lender.' }, { id: 'LN-2002', category: 'Home Loan', stage: 'Documents Pending', remark: 'Please upload your latest salary slips.' }] },
  'Upload Documents': { ...docs, id: 'cdocs', own: undefined, fields: docs.fields.slice(0, 4), seed: [{ id: 'DC-201', customer: 'Me', docType: 'PAN Card', file: 'pan.pdf', status: 'Verified' }, { id: 'DC-202', customer: 'Me', docType: 'Salary Slips', file: '', status: 'Missing' }] },
  Notifications: { id: 'ncu', pre: 'NC', title: 'Notifications', status: 'status', fields: [f('message', 'Message'), f('status', 'Status', { opts: ['Unread', 'Read'] })], seed: CNOTIF_SEED },
  Support: { id: 'ctick', pre: 'CT', title: 'Support and complaints', status: 'status', fields: [f('subject', 'Subject'), f('priority', 'Priority', { opts: PR }), f('status', 'Status', { opts: TK })], seed: [] },
  'Privacy & Consent': { id: 'cons', pre: 'PC', title: 'Privacy and consent', status: 'status', note: 'You can withdraw consent at any time.', fields: [f('purpose', 'Purpose'), f('status', 'Status', { opts: ['Given', 'Withdrawn'] })], seed: [{ id: 'PC-1', purpose: 'Process my personal information', status: 'Given' }, { id: 'PC-2', purpose: 'Share my details with lenders', status: 'Given' }] },
}
export const tableRows = (name: string): Row[] => readJson<Row[]>('dvp-m-' + CFG[name].id, CFG[name].seed)
const inp = 'rounded-lg border border-slate-300 p-2 text-sm'
function Crud({ c, role }: { c: Cfg; role: string }) {
  const key = 'dvp-m-' + c.id
  const [all, setAll] = useState<Row[]>(() => { try { const j = localStorage.getItem(key); if (j) return JSON.parse(j) } catch { /* storage unavailable */ } return c.seed })
  const put = (r: Row[]) => { setAll(r); try { localStorage.setItem(key, JSON.stringify(r)) } catch { /* storage unavailable */ } }
  const [dp, setDp] = useState('All time'); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [edit, setEdit] = useState<Row | null>(null); const [det, setDet] = useState<Row | null>(null); const [tab, setTab] = useState('Overview'); const [q, setQ] = useState(''); const [pg, setPg] = useState(0); const [open, setOpen] = useState(!!c.open); const [v, setV] = useState<Row>({}); const [err, setErr] = useState('')
  const fo = role === 'Franchise Owner'
  const rows = all.filter(r => (!c.own || !fo || r[c.own] === MY_FRANCHISE) && (!c.flt || c.flt[1].includes(r[c.flt[0]])) && (!c.df || inRange(r[c.df], dp, from, to)) && JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
  const pages = Math.max(1, Math.ceil(rows.length / 6)); const view = rows.slice(pg * 6, pg * 6 + 6)
  const save = () => {
    const row: Row = { id: `${c.pre}-${Math.max(100, ...all.map(y => parseInt(String(y.id).replace(/\D/g, '')) || 0)) + 1}`, ...Object.fromEntries(c.fields.map(x => [x.k, v[x.k] ?? x.opts?.[0] ?? (x.num ? 0 : '')])) }
    if (!String(row[c.fields[0].k]).trim()) return setErr(`${c.fields[0].l} is required.`)
    if (c.own && fo) row[c.own] = MY_FRANCHISE
    const g = c.guard?.(row, all.filter(y => y !== edit)); if (g) return setErr(g)
    if (edit) { put(all.map(y => y === edit ? { ...y, ...row, id: y.id, _h: [...(y._h || []), 'Record edited'] } : y)); setEdit(null) } else put([row, ...all]); setV({}); setErr(''); setOpen(false)
  }
  const csv = () => { const cols = ['id', ...c.fields.map(x => x.k)]; const body = [cols, ...rows.map(r => cols.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`))].map(a => a.join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); a.download = c.id + '.csv'; a.click() }
  const cell = (r: Row, x: F) => x.k === c.status && !c.ro ? <select value={String(r[x.k])} className="rounded-md border border-slate-200 p-1 text-xs" onChange={e => put(all.map(y => y === r ? { ...y, [x.k]: e.target.value, _h: [...(y._h || []), `${x.l}: ${e.target.value}`] } : y))}>{x.opts!.map(o => <option key={o}>{o}</option>)}</select> : x.money ? inr(Number(r[x.k])) : String(r[x.k] || '—')
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-navy">{c.title}</h1>
      <div className="relative ml-auto"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={q} onChange={e => { setQ(e.target.value); setPg(0) }} placeholder="Search" className={inp + ' pl-9'} /></div>
      {c.df && <DateFilter dp={dp} setDp={setDp} from={from} setFrom={setFrom} to={to} setTo={setTo} />}{role !== 'Franchise Owner' && <button onClick={csv} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><Download size={16} />Export CSV</button>}
      <button onClick={() => window.print()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Export PDF</button>
      {!c.ro && <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white"><Plus size={16} />Add</button>}</div>
    {c.note && <p className="text-sm text-slate-500">{c.note}</p>}
    {open && <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">{c.fields.map(x => x.opts ? <select key={x.k} aria-label={x.l} value={String(v[x.k] ?? x.opts[0])} onChange={e => setV({ ...v, [x.k]: e.target.value })} className={inp}>{x.opts.map(o => <option key={o}>{o}</option>)}</select>
      : x.file ? <input key={x.k} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setV({ ...v, [x.k]: e.target.files?.[0]?.name ?? '' })} className={inp} />
      : <input key={x.k} type={x.date ? 'date' : x.num ? 'number' : 'text'} aria-label={x.l} placeholder={x.l} value={String(v[x.k] ?? '')} onChange={e => setV({ ...v, [x.k]: x.num ? +e.target.value : e.target.value })} className={inp} />)}
      <button onClick={save} className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white">Save</button>{err && <p role="alert" className="text-sm text-red-600 sm:col-span-3">{err}</p>}</div>}
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 font-medium">ID</th>{c.fields.map(x => <th key={x.k} className="px-4 py-3 font-medium">{x.l}</th>)}<th /></tr></thead>
      <tbody>{view.map(r => <tr key={String(r.id)} className="border-t border-slate-100"><td className="px-4 py-3"><button className="text-royal underline" onClick={() => { setDet(r); setTab('Overview') }}>{r.id}</button></td>{c.fields.map(x => <td key={x.k} className="px-4 py-3">{cell(r, x)}</td>)}
        <td className="flex gap-3 px-4 py-3">{!c.ro && <button onClick={() => { setEdit(r); setV(r); setOpen(true) }} className="text-sm text-royal">Edit</button>}{!c.ro && <button title="Delete" onClick={() => confirm('Delete this record?') && put(all.filter(y => y !== r))} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>}</td></tr>)}
        {view.length === 0 && <tr><td colSpan={c.fields.length + 2} className="p-8 text-center text-slate-500">Nothing here yet. {c.ro ? '' : 'Use Add to create the first record.'}</td></tr>}</tbody></table></div>
    <div className="flex items-center justify-end gap-3 text-sm text-slate-500"><button disabled={pg === 0} onClick={() => setPg(pg - 1)} className="disabled:opacity-40">Previous</button>Page {pg + 1} of {pages}<button disabled={pg + 1 >= pages} onClick={() => setPg(pg + 1)} className="disabled:opacity-40">Next</button></div>{det && <Detail c={c} r={all.find(y => y.id === det.id) || det} tab={tab} setTab={setTab} close={() => setDet(null)} role={role} onRow={p => put(all.map(y => y.id === det.id ? { ...y, ...p } : y))} />}</div>
}
function Detail({ c, r, tab, setTab, close, role, onRow }: { c: Cfg; r: Row; tab: string; setTab: (t: string) => void; close: () => void; role: string; onRow: (p: Row) => void }) {
  const loans = useStore(s => s.loans); const nk = 'dvp-n-' + r.id
  const [notes, setNotes] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(nk) || '[]') } catch { return [] } }); const [n, setN] = useState('')
  const addN = () => { if (!n.trim()) return; const x = [...notes, n.trim()]; setNotes(x); setN(''); try { localStorage.setItem(nk, JSON.stringify(x)) } catch { /* ignore */ } }
  let custs: Row[] = cust.seed; try { const j = localStorage.getItem('dvp-m-cust'); if (j) custs = JSON.parse(j) } catch { /* ignore */ }
  const tabs = ['Overview', ...(c.id === 'fran' ? ['Profile', 'Customers', 'Applications'] : c.id === 'lend' ? ['Profile'] : c.id === 'cust' ? ['Applications'] : []), 'Notes', 'History']
  const subs: Sub[] = c.id === 'lend' ? loans.flatMap(l => l.lenders.filter(x => x.name === r.name && x.status !== 'Not Submitted').map(x => ({ loan: l.id, customer: l.customer, appId: x.appId ?? '', status: x.status, amount: x.amount, on: x.submittedOn ?? '' }))) : []
  const apps = loans.filter(l => c.id === 'fran' ? l.franchise === r.name : l.customer === r.name)
  const none = <p className="text-sm text-slate-500">Nothing here yet.</p>; const hist: string[] = r._h || []
  return <div className={`fixed inset-y-0 right-0 z-40 w-full overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl ${tab === 'Profile' ? 'max-w-2xl' : 'max-w-md'}`}>
    <div className="mb-3 flex items-center justify-between"><b className="text-lg text-navy">{r.id}{c.id === 'fran' || c.id === 'lend' ? ' · ' + r.name : ''}</b><button onClick={close} className="text-sm text-slate-500">Close</button></div>
    <div className="mb-4 flex flex-wrap gap-1">{tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-sm ${t === tab ? 'bg-royal text-white' : 'bg-slate-100'}`}>{t}</button>)}</div>
    {tab === 'Overview' && c.id === 'fran' && <div className="mb-3 flex flex-wrap gap-1 text-xs">{['Inquiry', 'Under Verification', 'Agreement Pending', 'Active'].map((s, i, a) => <span key={s} className={`rounded px-2 py-1 ${a.indexOf(String(r.status)) >= i ? 'bg-royal text-white' : 'bg-slate-100'}`}>{s}</span>)}</div>}
    {tab === 'Overview' && c.fields.map(x => <div key={x.k} className="flex justify-between border-b border-slate-100 py-2 text-sm"><span className="text-slate-500">{x.l}</span><span>{x.money ? inr(Number(r[x.k])) : String(r[x.k] || '—')}</span></div>)}
    {tab === 'Profile' && c.id === 'fran' && <FranchiseProfile key={r.id} row={r} role={role} />}
    {tab === 'Profile' && c.id === 'lend' && <LenderProfileView key={r.id} row={r} role={role} subs={subs} onRow={onRow} />}
    {tab === 'Customers' && (custs.filter(x => x.franchise === r.name).map(x => <div key={x.id} className="border-b border-slate-100 py-2 text-sm">{x.name} · {x.city}</div>).concat() .length ? custs.filter(x => x.franchise === r.name).map(x => <div key={x.id} className="border-b border-slate-100 py-2 text-sm">{x.name} · {x.city}</div>) : none)}
    {tab === 'Applications' && (apps.length ? apps.map(l => <div key={l.id} className="border-b border-slate-100 py-2 text-sm">{l.id} · {l.category} · {l.stage}</div>) : none)}
    {tab === 'Notes' && <div className="space-y-2">{notes.length ? notes.map((x, i) => <p key={i} className="rounded bg-slate-50 p-2 text-sm">{x}</p>) : none}<textarea value={n} onChange={e => setN(e.target.value)} placeholder="Add an internal note" className={inp + ' w-full'} /><button onClick={addN} className="rounded-lg bg-royal px-3 py-1.5 text-sm text-white">Add note</button></div>}
    {tab === 'History' && (hist.length ? hist.map((x, i) => <p key={i} className="border-b border-slate-100 py-2 text-sm">{x}</p>) : none)}
  </div>
}
function Referral({ role }: { role: string }) {
  const [fr, setFr] = useState(role === 'Franchise Owner' ? MY_FRANCHISE : FRS[0]); const url = `${window.location.origin}/apply/${slug(fr)}`
  return <div className="flex flex-wrap items-center gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><QRCodeSVG value={url} size={110} />
    <div className="space-y-2"><b className="text-navy">Referral link</b>{role !== 'Franchise Owner' && <select value={fr} onChange={e => setFr(e.target.value)} className={inp + ' block'}>{FRS.map(x => <option key={x}>{x}</option>)}</select>}
      <div className="flex gap-2"><code className="rounded bg-slate-100 px-2 py-1 text-sm">{url}</code><button className="text-sm text-royal" onClick={() => navigator.clipboard?.writeText(url)}>Copy</button></div>
      <p className="text-xs text-slate-500">Leads from this link will belong to {fr}. <a className="text-royal underline" href={url} target="_blank" rel="noreferrer">Open landing page</a></p></div></div>
}
const BASE = ['PAN Card', 'Aadhaar / Permitted KYC Proof', 'Photograph']
const RULES: Record<string, string[]> = { 'Personal Loan': ['Salary Slips', 'Bank Statements'], 'Business Loan': ['Bank Statements', 'ITR', 'GST Returns', 'Business Registration'], 'Home Loan': ['Salary Slips', 'Bank Statements', 'Property Documents'], 'Loan Against Property': ['Property Documents', 'ITR', 'Bank Statements'], 'Machinery Loan': ['Financial Statements', 'GST Returns', 'Business Registration'], 'Working Capital': ['Bank Statements', 'GST Returns', 'Financial Statements'] }
const LX: Record<string, string[]> = { None: [], 'Bank A': ['ITR'], 'NBFC B': ['Financial Statements'], 'NBFC D': ['Business Registration'] }
function Checklist() {
  const [cat, setCat] = useState('Business Loan'); const [ln, setLn] = useState('None'); const [edit, setEdit] = useState(false)
  const [ov, setOv] = useState<Record<string, string[]>>(() => { try { return JSON.parse(localStorage.getItem('dvp-chk') || '{}') } catch { return {} } })
  const base = [...new Set([...BASE, ...(RULES[cat] ?? ['Bank Statements'])])]; const own = ov[cat] ?? base; const list = [...new Set([...own, ...LX[ln]])]
  const store = (n: Record<string, string[]>) => { setOv(n); try { localStorage.setItem('dvp-chk', JSON.stringify(n)) } catch { /* storage unavailable */ } }
  const toggle = (d: string) => store({ ...ov, [cat]: own.includes(d) ? own.filter(y => y !== d) : [...own, d] })
  const reset = () => { const n = { ...ov }; delete n[cat]; store(n) }
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><b className="text-navy">Document checklist</b><button className="text-sm text-royal" onClick={() => setEdit(!edit)}>{edit ? 'Done editing' : 'Edit rules'}</button></div><p className="text-xs text-slate-500">Rules apply per loan category. Lender-specific documents are added on top.</p>
    <div className="my-3 flex flex-wrap gap-3"><select value={cat} onChange={e => setCat(e.target.value)} className={inp}>{LOAN_CATS.map(x => <option key={x}>{x}</option>)}</select><select value={ln} onChange={e => setLn(e.target.value)} className={inp}>{Object.keys(LX).map(x => <option key={x}>{x}</option>)}</select></div>
    {edit && <div className="mb-3 rounded-lg bg-slate-50 p-3"><p className="mb-2 text-xs text-slate-500">Tick the documents required for {cat}.</p><div className="grid gap-1 text-sm sm:grid-cols-2">{DT.map(d => <label key={d} className="flex items-center gap-2"><input type="checkbox" checked={own.includes(d)} onChange={() => toggle(d)} />{d}</label>)}</div><button className="mt-2 text-xs text-royal" onClick={reset}>Reset to default</button></div>}
    <ul className="grid gap-1 text-sm sm:grid-cols-2">{list.map(x => <li key={x}>☐ {x}</li>)}</ul></div>
}
function Charts() {
  const pie = [{ n: 'Akshay Finance', v: 185 }, { n: 'Mumbai Credit Hub', v: 142 }, { n: 'Nashik Finserv', v: 75 }]; const col = ['#0b1f44', '#1d4ed8', '#c9a227']
  return <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-4"><b className="text-sm">Disbursed by franchise (₹ lakh)</b><div className="h-60"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="v" nameKey="n" outerRadius={85} label>{pie.map((_, i) => <Cell key={i} fill={col[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></div>
    <div className="rounded-xl border border-slate-200 bg-white p-4"><b className="text-sm">Revenue trend</b><div className="h-60"><ResponsiveContainer><LineChart data={REVENUE}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="m" /><YAxis tickFormatter={v => v / 100000 + 'L'} /><Tooltip formatter={(v: number) => inr(v)} /><Line dataKey="revenue" stroke="#1d4ed8" /><Line dataKey="commission" stroke="#c9a227" /></LineChart></ResponsiveContainer></div></div></div>
}
const MODS = ['Franchise Management', 'Leads', 'Customers', 'Loan Applications', 'Documents', 'Banks & NBFC', 'Commissions & Payouts', 'Marketing', 'Content', 'Support & Tickets', 'Agreements', 'Employees', 'Notifications', 'Reports', 'Audit Logs', 'Settings', 'Territories', 'Performance', 'High-Ticket Desk']
function Perms() {
  const [, tick] = useState(0); const roles = ROLES.filter(r => !['Super Admin', 'Franchise Owner', 'Customer'].includes(r))
  const toggle = (r: string, m: string) => { let o: Record<string, string[]> = {}; try { o = JSON.parse(localStorage.getItem('dvp-perm') || '{}') } catch { /* ignore */ }
    const cur = navFor(r as never); o[r] = cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m]; try { localStorage.setItem('dvp-perm', JSON.stringify(o)) } catch { /* ignore */ } tick(n => n + 1) }
  return <div className="space-y-3"><h1 className="text-2xl font-bold text-navy">Roles and permissions</h1><p className="text-sm text-slate-500">Changes update that role's sidebar the next time they sign in. Super Admin always has full access.</p>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2">Role</th>{MODS.map(m => <th key={m} className="px-2 py-2 text-xs font-medium">{m}</th>)}</tr></thead>
      <tbody>{roles.map(r => <tr key={r} className="border-t border-slate-100"><td className="px-3 py-2 font-medium">{r}</td>{MODS.map(m => <td key={m} className="px-2 text-center"><input type="checkbox" aria-label={`${r} ${m}`} checked={navFor(r as never).includes(m)} onChange={() => toggle(r, m)} /></td>)}</tr>)}</tbody></table></div></div>
}
export function LeadsView({ role, children }: { role: string; children: React.ReactNode }) {
  const [kb, setKb] = useState(false); const { leads, setStatus } = useStore(); const L = leads.filter(l => role !== 'Franchise Owner' || l.franchise === MY_FRANCHISE)
  return <div><div className="mb-3 flex gap-2 text-sm">{['Table', 'Kanban'].map(v => <button key={v} onClick={() => setKb(v === 'Kanban')} className={`rounded-full px-4 py-1.5 ${(v === 'Kanban') === kb ? 'bg-royal text-white' : 'bg-white border border-slate-200'}`}>{v}</button>)}</div>
    {kb ? <div className="grid gap-3 overflow-x-auto md:grid-cols-3 xl:grid-cols-6">{LEAD_STATUS.map(s => <div key={s} className="min-w-40 rounded-xl bg-slate-100 p-2"><div className="mb-2 text-sm font-semibold text-navy">{s} ({L.filter(l => l.status === s).length})</div>
      {L.filter(l => l.status === s).map(l => <div key={l.id} className="mb-2 rounded-lg bg-white p-2 text-sm shadow-sm"><b>{l.name}</b><div className="text-xs text-slate-500">{l.category} · {inr(l.amount)}</div><select value={l.status} onChange={e => setStatus(l.id, e.target.value)} className="mt-1 w-full rounded border border-slate-200 text-xs">{LEAD_STATUS.map(x => <option key={x}>{x}</option>)}</select></div>)}</div>)}</div> : children}</div>
}
function NotifPage({ c, role }: { c: Cfg; role: string }) {
  const [n, setN] = useState(0)
  const markAll = () => { const key = 'dvp-m-' + c.id; writeJson(key, readJson<Row[]>(key, c.seed).map(r => ({ ...r, status: 'Read' }))); setN(n + 1) }
  return <div className="space-y-3"><div className="flex justify-end"><button onClick={markAll} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Mark all as read</button></div><Crud key={c.id + role + n} c={c} role={role} /></div>
}
function MyApplications() {
  const loans = useStore(s => s.loans).filter(isMyLoan)
  const note = (id: string, stage: string) => { const d = readJson<{ customer: string[] }>('dvp-ln-' + id, { customer: [] }); return d.customer[d.customer.length - 1] ?? (stage === 'Documents Pending' ? 'Please upload your pending documents.' : stage.startsWith('Closed') ? 'This application is closed. Contact your franchise.' : 'Your file is being processed.') }
  return <div className="space-y-4"><h1 className="text-2xl font-bold text-navy">My applications</h1>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['ID', 'Loan', 'Requested', 'Stage', 'Update from DVP Capitals'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody>{loans.map(l => <tr key={l.id} className="border-t border-slate-100"><td className="px-4 py-3">{l.id}</td><td className="px-4 py-3">{l.category}</td><td className="px-4 py-3">{inr(l.amount)}</td><td className="px-4 py-3">{l.stage}</td><td className="px-4 py-3">{note(l.id, l.stage)}</td></tr>)}
        {loans.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">You have no applications yet.</td></tr>}</tbody></table></div></div>
}
export function Page({ name, role }: { name: string; role: string }) {
  if (name === 'Loan Applications' || name === 'Application Tracking') return <Loans role={role} />
  if (name === 'Commissions & Payouts' || name === 'My Commissions') return <Commissions role={role} />
  if (name === 'Payment History') return <PaymentHistory role={role} />
  if (name === 'Business Config') return <BusinessConfig />
  if (name === 'Attendance') return <Attendance />
  if (name === 'Permissions') return <Perms />
  if (name === 'Performance') return <Performance />
  if (name === 'High-Ticket Desk') return <HighTicket />
  if (name === 'Add New Customer') return <AddCustomer role={role} seed={cust.seed} />
  if (name === 'Apply for Loan' && role === 'Customer') return <ApplyLoan />
  if (name === 'My Profile' && role === 'Franchise Owner') return <MyProfile role={role} row={readJson<Row[]>('dvp-m-fran', fran.seed).find(x => x.name === MY_FRANCHISE)} />
  if (name === 'Content') return <Content role={role} />
  if (name === 'Marketing Kit') return <MarketingKit role={role} />
  if (name === 'Training & Support' && role === 'Franchise Owner') return <Training />
  if (name === 'Track Application' && role === 'Customer') return <TrackApplication />
  if (name === 'My Applications' && role === 'Customer') return <MyApplications />
  if (name === 'Franchise Management') return <FranchiseHub seed={fran.seed} terrSeed={CFG.Territories.seed} render={v => <Crud key={name + role + v} c={CFG[name]} role={role} />} />
  if (name === 'Banks & NBFC') lenderRows()
  const c = (role === 'Customer' && CUST[name]) || CFG[name]
  if (!c) return <p className="p-8 text-slate-500">This page is not available for your role.</p>
  if (name === 'Notifications') return <NotifPage c={c} role={role} />
  return <div className="space-y-6">{name === 'Marketing' && <Referral role={role} />}{['Documents', 'Document Upload'].includes(name) && role !== 'Customer' && <Checklist />}{name === 'Reports' && <Charts />}{name === 'Banks & NBFC' && <LenderDashboard />}{c.id === 'docs' || c.id === 'cdocs' ? <DocsPage key={name + role} storeKey={c.id} pre={c.pre} title={c.title} note={c.note} seed={c.seed} customerMode={c.id === 'cdocs'} role={role} types={DT} statuses={DS} franchises={FRS} /> : <Crud key={name + role} c={c} role={role} />}</div>
}
