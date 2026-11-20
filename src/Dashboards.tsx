import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from './store'
import { tableRows } from './Modules2'
import { OB_SEED, commSummary, loadComm } from './Modules4'
import type { Ob } from './Modules4'
import { expState } from './Documents'
import { delayState, isActive, meName, openEscalation } from './ops'
import { L_STATUS, LEAD_STATUS, STAGES, inr, navFor, readJson, slug, type Loan, type Role } from './data'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
const card = 'rounded-xl border border-slate-200 bg-white shadow-sm'
const COLORS = ['#0b1f44', '#1d4ed8', '#c9a227', '#60a5fa', '#94a3b8', '#dc2626']
const OB_STEPS = ['Inquiry', 'Verification', 'Application and KYC', 'Fee payment', 'Agreement', 'Activation', 'Welcome kit']

type Kpi = { label: string; value: string | number; page?: string; tone?: 'warn' | 'good' }

/* ---------- shared building blocks ---------- */
function Shell({ role, blurb, kpis, children }: { role: Role; blurb: string; kpis: Kpi[]; children: ReactNode }) {
  const allowed = navFor(role)
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold text-navy">{role} dashboard</h1><p className="text-sm text-slate-500">{blurb}</p></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(k => {
      const body = <><div className="text-xs text-slate-500">{k.label}</div>
        <div className={`mt-1 text-2xl font-bold ${k.tone === 'warn' && Number(k.value) > 0 ? 'text-red-600' : k.tone === 'good' ? 'text-green-700' : 'text-navy'}`}>{k.value}</div></>
      return k.page && allowed.includes(k.page)
        ? <NavLink key={k.label} to={'/' + slug(k.page)} className={card + ' block p-4 hover:border-royal'}>{body}</NavLink>
        : <div key={k.label} className={card + ' p-4'}>{body}</div>
    })}</div>
    {children}
  </div>
}

function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <div className={card + ' p-4'}><b className="text-sm text-navy">{title}</b>{note && <p className="text-xs text-slate-500">{note}</p>}<div className="mt-3">{children}</div></div>
}

function List({ rows, empty }: { rows: [string, string, string?][]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>
  return <ul className="divide-y divide-slate-100 text-sm">{rows.slice(0, 6).map(([a, b, c], i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{a}</b> <span className="text-slate-500">{b}</span></span>{c && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{c}</span>}</li>)}</ul>
}

function Bars({ data, horizontal }: { data: { name: string; value: number }[]; horizontal?: boolean }) {
  const d = data.filter(x => x.value > 0)
  if (!d.length) return <p className="text-sm text-slate-500">No data yet.</p>
  return <div className="h-60"><ResponsiveContainer>{horizontal
    ? <BarChart data={d} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#1d4ed8" radius={4} /></BarChart>
    : <BarChart data={d}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#1d4ed8" radius={4} /></BarChart>}</ResponsiveContainer></div>
}

function Donut({ data }: { data: { name: string; value: number }[] }) {
  const d = data.filter(x => x.value > 0)
  if (!d.length) return <p className="text-sm text-slate-500">No data yet.</p>
  return <div className="h-60"><ResponsiveContainer><PieChart><Pie data={d} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>{d.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
}

const inStages = (loans: Loan[], ...s: string[]) => loans.filter(l => s.includes(l.stage))
const countBy = (rows: Row[], key: string, values: string[]) => values.map(v => ({ name: v, value: rows.filter(r => r[key] === v).length }))
const loanRow = (l: Loan): [string, string, string] => [l.id, `${l.customer} · ${l.category}`, l.stage]

/* ---------- one dashboard per role ---------- */
function Operations({ role }: { role: Role }) {
  const loans = useStore(s => s.loans); const tickets = tableRows('Support & Tickets')
  const processing = inStages(loans, 'File Submitted', 'Under Verification', 'Query Raised', 'Ready for Lender Submission', 'Submitted to Bank / NBFC', 'Under Bank Processing')
  const attention = inStages(loans, 'Query Raised', 'Documents Pending', 'Disbursement Pending')
  return <Shell role={role} blurb="Where every loan file stands across the network, and what needs a push." kpis={[
    { label: 'Total loan files', value: loans.length, page: 'Loan Applications' }, { label: 'In processing', value: processing.length, page: 'Loan Applications' },
    { label: 'Queries raised', value: inStages(loans, 'Query Raised').length, page: 'Loan Applications', tone: 'warn' }, { label: 'Approved, not disbursed', value: inStages(loans, 'Approved / Sanctioned', 'Disbursement Pending').length, page: 'Loan Applications' },
    { label: 'Disbursed files', value: inStages(loans, 'Disbursed').length, tone: 'good' }, { label: 'Disbursed value', value: inr(loans.reduce((a, l) => a + l.disbursed, 0)) },
    { label: 'High-ticket files (₹50L+)', value: loans.filter(l => l.amount >= 5000000).length, page: 'High-Ticket Desk' }, { label: 'Open support tickets', value: tickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length, page: 'Support & Tickets', tone: 'warn' },
  ]}>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Files by stage"><Bars horizontal data={STAGES.map(s => ({ name: s, value: loans.filter(l => l.stage === s).length }))} /></Panel>
      <Panel title="Needs attention" note="Queries, missing documents and approved files awaiting disbursement."><List rows={attention.map(loanRow)} empty="Nothing is stuck right now." /></Panel></div>
  </Shell>
}

function FranchiseOps({ role }: { role: Role }) {
  const fr = tableRows('Franchise Management'); const agr = tableRows('Agreements'); const terr = tableRows('Territories')
  const onb = readJson<Ob[]>('dvp-onb', OB_SEED).filter(o => o.step < 7)
  const risky = agr.filter(a => ['Expiring', 'Expired'].includes(a.status))
  return <Shell role={role} blurb="Franchise network health, onboarding progress and agreement renewals." kpis={[
    { label: 'Total franchises', value: fr.length, page: 'Franchise Management' }, { label: 'Active', value: fr.filter(f => f.status === 'Active').length, page: 'Active Franchises', tone: 'good' },
    { label: 'Pending approvals', value: fr.filter(f => ['Inquiry', 'Under Verification', 'Agreement Pending'].includes(f.status)).length, page: 'Pending Approvals' }, { label: 'Suspended or terminated', value: fr.filter(f => ['Suspended', 'Terminated'].includes(f.status)).length, page: 'Suspended Franchises' },
    { label: 'Onboarding in progress', value: onb.length, page: 'Franchise Management' }, { label: 'Agreements expiring or expired', value: risky.length, page: 'Agreements', tone: 'warn' },
    { label: 'Territories allocated', value: terr.length, page: 'Territories' }, { label: 'Exclusive territories', value: terr.filter(t => t.type === 'Exclusive').length, page: 'Territories' },
  ]}>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Onboarding pipeline"><List rows={onb.map(o => [o.name, `${o.owner} · ${o.city}`, OB_STEPS[o.step]])} empty="No franchise is being onboarded." /></Panel>
      <Panel title="Agreements to act on"><List rows={risky.map(a => [a.franchise, `expires ${a.expiry}`, a.status])} empty="No agreement is close to expiry." /></Panel></div>
    <Panel title="Franchises by status"><Bars data={countBy(fr, 'status', ['Inquiry', 'Under Verification', 'Agreement Pending', 'Active', 'Suspended', 'Terminated'])} /></Panel>
  </Shell>
}

function Processing({ role }: { role: Role }) {
  const loans = useStore(s => s.loans); const docs = tableRows('Documents'); const tickets = tableRows('Support & Tickets')
  const queue = inStages(loans, 'File Submitted', 'Under Verification', 'Query Raised')
  return <Shell role={role} blurb="Your processing queue, from file submission to lender response." kpis={[
    { label: 'New files submitted', value: inStages(loans, 'File Submitted').length, page: 'Loan Applications' }, { label: 'Under verification', value: inStages(loans, 'Under Verification').length, page: 'Loan Applications' },
    { label: 'Query raised', value: inStages(loans, 'Query Raised').length, page: 'Loan Applications', tone: 'warn' }, { label: 'Ready for lender', value: inStages(loans, 'Ready for Lender Submission').length, page: 'Loan Applications' },
    { label: 'With lenders', value: inStages(loans, 'Submitted to Bank / NBFC', 'Under Bank Processing').length, page: 'Loan Applications' }, { label: 'Documents to verify', value: docs.filter(d => d.status === 'Uploaded').length, page: 'Documents' },
    { label: 'Documents rejected', value: docs.filter(d => d.status === 'Rejected').length, page: 'Documents', tone: 'warn' }, { label: 'Delayed files', value: loans.filter(l => isActive(l) && delayState(l) !== 'ok').length, page: 'Loan Applications', tone: 'warn' }, { label: 'Escalated files', value: loans.filter(l => !!openEscalation(l)).length, page: 'Loan Applications', tone: 'warn' }, { label: 'Assigned to me', value: loans.filter(l => isActive(l) && !!meName(role) && l.assignee === meName(role)).length, page: 'Loan Applications' }, { label: 'Open tickets', value: tickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length, page: 'Support & Tickets' },
  ]}>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="My queue" note="Files waiting for verification or a reply."><List rows={queue.map(loanRow)} empty="Your queue is empty." /></Panel>
      <Panel title="Files by stage"><Bars horizontal data={STAGES.slice(1, 9).map(s => ({ name: s, value: loans.filter(l => l.stage === s).length }))} /></Panel></div>
  </Shell>
}

function DocVerify({ role }: { role: Role }) {
  const loans = useStore(s => s.loans); const docs = tableRows('Documents')
  const todo = docs.filter(d => ['Uploaded', 'Rejected', 'Missing'].includes(d.status))
  return <Shell role={role} blurb="Documents waiting for your check, and files blocked by missing papers." kpis={[
    { label: 'To verify', value: docs.filter(d => d.status === 'Uploaded').length, page: 'Documents' }, { label: 'Rejected', value: docs.filter(d => d.status === 'Rejected').length, page: 'Documents', tone: 'warn' },
    { label: 'Missing', value: docs.filter(d => d.status === 'Missing').length, page: 'Documents', tone: 'warn' }, { label: 'Expired or expiring (30 days)', value: docs.filter(d => ['expired', 'soon'].includes(expState(d.expiry))).length, page: 'Documents', tone: 'warn' }, { label: 'Verified', value: docs.filter(d => d.status === 'Verified').length, tone: 'good' },
    { label: 'Files waiting for documents', value: inStages(loans, 'Documents Pending').length, page: 'Loan Applications' }, { label: 'Files awaiting your check', value: inStages(loans, 'File Submitted', 'Under Verification').length, page: 'Loan Applications' },
  ]}>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Documents needing action"><List rows={todo.map(d => [d.customer, d.docType, d.status])} empty="All documents are verified." /></Panel>
      <Panel title="Documents by status"><Donut data={countBy(docs, 'status', ['Uploaded', 'Verified', 'Rejected', 'Missing'])} /></Panel></div>
  </Shell>
}

function Accounts({ role }: { role: Role }) {
  const rows = loadComm(); const s = commSummary(rows); const sum = (k: 'expected' | 'received') => rows.reduce((a, r) => a + r[k], 0)
  const byFr = [...new Set(rows.map(r => r.franchise))].map(f => ({ name: f, expected: rows.filter(r => r.franchise === f).reduce((a, r) => a + r.expected, 0), received: rows.filter(r => r.franchise === f).reduce((a, r) => a + r.received, 0) }))
  return <Shell role={role} blurb="Lender commission expected versus received, and franchise payouts due." kpis={[
    { label: 'Expected from lenders', value: inr(sum('expected')), page: 'Commissions & Payouts' }, { label: 'Received by head office', value: inr(sum('received')), page: 'Commissions & Payouts', tone: 'good' },
    { label: 'Still pending from lenders', value: inr(Math.max(0, sum('expected') - sum('received'))), page: 'Commissions & Payouts' }, { label: 'Franchise payable now', value: inr(s.payable), page: 'Commissions & Payouts', tone: 'warn' },
    { label: 'Paid to franchises', value: inr(s.paid), page: 'Commissions & Payouts' }, { label: 'On hold', value: rows.filter(r => r.status === 'On Hold').length, page: 'Commissions & Payouts' },
    { label: 'Awaiting payout approval', value: rows.filter(r => r.status === 'Received by Head Office').length, page: 'Commissions & Payouts', tone: 'warn' }, { label: 'Commission records', value: rows.length },
  ]}>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Expected vs received by franchise" note="Franchises are paid only after head office receives the lender commission."><div className="h-60"><ResponsiveContainer><BarChart data={byFr}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => v / 1000 + 'k'} /><Tooltip formatter={(v: number) => inr(v)} /><Legend /><Bar dataKey="expected" fill="#0b1f44" radius={4} /><Bar dataKey="received" fill="#c9a227" radius={4} /></BarChart></ResponsiveContainer></div></Panel>
      <Panel title="Recent commission records"><List rows={rows.map(r => [r.loan, `${r.franchise} · ${inr(r.expected)}`, r.status])} empty="No commission records yet." /></Panel></div>
  </Shell>
}

function Relationship({ role }: { role: Role }) {
  const loans = useStore(s => s.loans); const subs = loans.flatMap(l => l.lenders.map(x => ({ ...x, loan: l.id })))
  const names = [...new Set(subs.map(x => x.name))]
  const chart = names.map(n => ({ name: n, ...Object.fromEntries(L_STATUS.map(st => [st, subs.filter(x => x.name === n && x.status === st).length])) }))
  return <Shell role={role} blurb="Lender submissions, responses and files that need relationship follow-up." kpis={[
    { label: 'Lender submissions', value: subs.filter(x => x.status !== 'Not Submitted').length, page: 'Loan Applications' }, { label: 'Processing', value: subs.filter(x => x.status === 'Processing').length },
    { label: 'Queries from lenders', value: subs.filter(x => x.status === 'Query Raised').length, tone: 'warn' }, { label: 'Approved offers', value: subs.filter(x => x.status === 'Approved').length, tone: 'good' },
    { label: 'Rejected', value: subs.filter(x => x.status === 'Rejected').length }, { label: 'Not yet submitted', value: subs.filter(x => x.status === 'Not Submitted').length },
    { label: 'Lenders in network', value: names.length, page: 'Banks & NBFC' }, { label: 'Approved, awaiting disbursement', value: inStages(loans, 'Approved / Sanctioned', 'Disbursement Pending').length, page: 'Loan Applications' },
  ]}>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Outcome by lender"><div className="h-60"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend />{L_STATUS.map((st, i) => <Bar key={st} dataKey={st} stackId="a" fill={COLORS[i]} />)}</BarChart></ResponsiveContainer></div></Panel>
      <Panel title="Lender responses to chase" note="Open queries and applications still being processed."><List rows={subs.filter(x => ['Query Raised', 'Processing'].includes(x.status)).map(x => [x.name, `${x.loan} · ${x.amount ? inr(x.amount) : 'amount pending'}`, x.status])} empty="No open lender responses." /></Panel></div>
  </Shell>
}

function Sales({ role }: { role: Role }) {
  const leads = useStore(s => s.leads); const fr = tableRows('Franchise Management'); const onb = readJson<Ob[]>('dvp-onb', OB_SEED).filter(o => o.step < 7)
  const conv = leads.length ? Math.round(leads.filter(l => l.status === 'Converted').length / leads.length * 100) : 0
  const byFr = [...new Set(leads.map(l => l.franchise))].map(f => ({ name: f, value: leads.filter(l => l.franchise === f).length }))
  return <Shell role={role} blurb="Franchise inquiries and how leads are moving across the network." kpis={[
    { label: 'Franchise inquiries open', value: onb.filter(o => o.step < 2).length + fr.filter(f => f.status === 'Inquiry').length, page: 'Franchise Management' }, { label: 'In onboarding', value: onb.length, page: 'Franchise Management' },
    { label: 'Active franchises', value: fr.filter(f => f.status === 'Active').length, tone: 'good' }, { label: 'Total leads', value: leads.length, page: 'Leads' },
    { label: 'New leads', value: leads.filter(l => l.status === 'New Lead').length, page: 'Leads' }, { label: 'Converted', value: leads.filter(l => l.status === 'Converted').length },
    { label: 'Lead conversion', value: conv + '%' }, { label: 'Lost leads', value: leads.filter(l => l.status === 'Lost').length },
  ]}>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Leads by franchise"><Bars data={byFr} /></Panel><Panel title="Lead pipeline"><Donut data={LEAD_STATUS.map(s => ({ name: s, value: leads.filter(l => l.status === s).length }))} /></Panel></div>
    <Panel title="Franchise inquiries in progress"><List rows={onb.map(o => [o.name, `${o.owner} · ${o.city}`, OB_STEPS[o.step]])} empty="No open franchise inquiries." /></Panel>
  </Shell>
}

function Support({ role }: { role: Role }) {
  const tickets = tableRows('Support & Tickets'); const open = tickets.filter(t => !['Resolved', 'Closed'].includes(t.status)); const cust = tableRows('Customers')
  const rank: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
  return <Shell role={role} blurb="Tickets from franchises and customers, with the urgent ones first." kpis={[
    { label: 'Open tickets', value: open.length, page: 'Support & Tickets', tone: 'warn' }, { label: 'High priority open', value: open.filter(t => t.priority === 'High').length, page: 'Support & Tickets', tone: 'warn' },
    { label: 'In progress', value: tickets.filter(t => t.status === 'In Progress').length }, { label: 'Waiting for response', value: tickets.filter(t => t.status === 'Waiting for Response').length },
    { label: 'Resolved', value: tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length, tone: 'good' }, { label: 'Customers', value: cust.length, page: 'Customers' },
    { label: 'Consent withdrawn', value: cust.filter(c => c.consent === 'Withdrawn').length, page: 'Customers' },
  ]}>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Tickets to handle first"><List rows={[...open].sort((a, b) => rank[a.priority] - rank[b.priority]).map(t => [t.id, t.subject, `${t.priority} · ${t.status}`])} empty="No open tickets." /></Panel>
      <Panel title="Tickets by status"><Donut data={countBy(tickets, 'status', ['Open', 'In Progress', 'Waiting for Response', 'Resolved', 'Closed'])} /></Panel></div>
  </Shell>
}

export function RoleDashboard({ role }: { role: Role }) {
  switch (role) {
    case 'Operations Manager': return <Operations role={role} />
    case 'Franchise Manager': return <FranchiseOps role={role} />
    case 'Loan Processing Executive': return <Processing role={role} />
    case 'Document Verification Executive': return <DocVerify role={role} />
    case 'Accounts Manager': return <Accounts role={role} />
    case 'Relationship Manager': return <Relationship role={role} />
    case 'Sales Manager': return <Sales role={role} />
    case 'Support Executive': return <Support role={role} />
    default: return null
  }
}
export const HAS_OWN_DASHBOARD: Role[] = ['Operations Manager', 'Franchise Manager', 'Loan Processing Executive', 'Document Verification Executive', 'Accounts Manager', 'Relationship Manager', 'Sales Manager', 'Support Executive']
