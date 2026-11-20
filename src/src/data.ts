export type Role = 'Super Admin'|'Head Office Admin'|'Operations Manager'|'Franchise Manager'|'Loan Processing Executive'|'Relationship Manager'|'Document Verification Executive'|'Accounts Manager'|'Sales Manager'|'Support Executive'|'Auditor'|'Franchise Owner'|'Customer'
export const ROLES: Role[] = ['Super Admin','Head Office Admin','Operations Manager','Franchise Manager','Loan Processing Executive','Relationship Manager','Document Verification Executive','Accounts Manager','Sales Manager','Support Executive','Auditor','Franchise Owner','Customer']
export const FSUB = ['Active Franchises','Pending Approvals','Suspended Franchises','Terminated Franchises']
export const HO_NAV = ['Dashboard','Franchise Management',...FSUB,'Leads','Customers','Loan Applications','Documents','Banks & NBFC','Commissions & Payouts','Marketing','Content','Support & Tickets','Agreements','Employees','Notifications','Reports','Audit Logs','Settings','Territories','Performance','High-Ticket Desk','Business Config','Tasks','Financial Reports','Permissions']
export const FR_NAV = ['Dashboard','Leads','Customers','Add New Customer','Loan Applications','Document Upload','Application Tracking','My Commissions','Payment History','Marketing Kit','Content','Training & Support','Notifications','My Profile','Helpdesk']
export const CU_NAV = ['Dashboard','Apply for Loan','My Applications','Upload Documents','Track Application','Notifications','Support','Privacy & Consent']
const HO_EXTRA: Partial<Record<Role,string[]>> = {
 'Accounts Manager':['Dashboard','Commissions & Payouts','Reports','Banks & NBFC','Notifications'],
 'Loan Processing Executive':['Dashboard','Loan Applications','Documents','Customers','Support & Tickets','Notifications'],
 'Document Verification Executive':['Dashboard','Documents','Loan Applications','Notifications'],
 'Support Executive':['Dashboard','Support & Tickets','Customers','Notifications'],
 'Sales Manager':['Dashboard','Franchise Management','Leads','Performance','Marketing','Content','Reports','Notifications'],
 'Franchise Manager':['Dashboard','Franchise Management',...FSUB,'Territories','Agreements','Leads','Marketing','Content','Notifications'],
 'Relationship Manager':['Dashboard','Banks & NBFC','Loan Applications','Notifications'],
 'Auditor':['Dashboard','Audit Logs','Reports'],
}
export const navFor = (r: Role): string[] => {
  const b = r==='Franchise Owner'?FR_NAV : r==='Customer'?CU_NAV : HO_EXTRA[r]??HO_NAV
  if (r === 'Super Admin' || r === 'Franchise Owner' || r === 'Customer') return b
  try { const o = JSON.parse(localStorage.getItem('dvp-perm') || '{}')[r]
    if (Array.isArray(o)) return HO_NAV.filter(x => x === 'Dashboard' || o.includes(x) || (FSUB.includes(x) && o.includes('Franchise Management'))) } catch { /* ignore */ }
  return b.filter(x => x !== 'Permissions')
}
export const slug = (s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
export const inr = (n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)
export const LEAD_STATUS = ['New Lead','Contacted','Interested','Documents Pending','Converted','Lost']
export const LOAN_CATS = ['Personal Loan','Business Loan','Home Loan','Loan Against Property','Machinery Loan','Project Finance','Working Capital','Education Loan','Vehicle Loan','Balance Transfer','OD / CC Facility','LAP Top-up']
export const MY_FRANCHISE = 'Akshay Finance'
export type Lead = {id:string;name:string;mobile:string;category:string;amount:number;status:string;franchise:string;source?:string;city?:string}
export const FRANCHISES = ['Akshay Finance','Satara Capital','Mumbai Credit Hub','Nashik Finserv']
export const readJson = <T,>(k:string, d:T):T => { try { const j = localStorage.getItem(k); if (j) return JSON.parse(j) as T } catch { /* storage unavailable */ } return d }
export const writeJson = (k:string, v:unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }
export const SEED_LEADS: Lead[] = [
 {id:'L-1001',name:'Rohit Deshmukh',mobile:'9822012345',category:'Business Loan',amount:5000000,status:'Interested',franchise:'Akshay Finance'},
 {id:'L-1002',name:'Sneha Kulkarni',mobile:'9890123456',category:'Home Loan',amount:3500000,status:'Documents Pending',franchise:'Akshay Finance'},
 {id:'L-1003',name:'Imran Shaikh',mobile:'9923456789',category:'Machinery Loan',amount:12000000,status:'Contacted',franchise:'Satara Capital'},
 {id:'L-1004',name:'Priya Patil',mobile:'9765432101',category:'Personal Loan',amount:600000,status:'New Lead',franchise:'Akshay Finance'},
 {id:'L-1005',name:'Vikas Jadhav',mobile:'9011223344',category:'Loan Against Property',amount:8000000,status:'Converted',franchise:'Nashik Finserv'},
 {id:'L-1006',name:'Anjali Mehta',mobile:'9988776655',category:'Education Loan',amount:1500000,status:'Lost',franchise:'Mumbai Credit Hub'},
]
export const REVENUE = ['Jun','Jul','Aug','Sep','Oct','Nov'].map((m,i)=>({m,revenue:[18,22,27,25,34,41][i]*100000,commission:[7,9,11,10,14,17][i]*100000}))
export const TREND = ['Jun','Jul','Aug','Sep','Oct','Nov'].map((m,i)=>({m,applied:[42,55,61,58,76,88][i],disbursed:[12,18,21,20,29,35][i]}))
export const CAT_MIX = [{name:'Business',value:34},{name:'Home',value:22},{name:'LAP',value:18},{name:'Personal',value:14},{name:'Other',value:12}]
export const FR_PERF = [{n:'Akshay Finance',v:62},{n:'Mumbai Credit Hub',v:48},{n:'Nashik Finserv',v:35},{n:'Satara Capital',v:27}]
export const STAGES = ['New Inquiry','Documents Pending','File Submitted','Under Verification','Query Raised','Ready for Lender Submission','Submitted to Bank / NBFC','Under Bank Processing','Approved / Sanctioned','Disbursement Pending','Disbursed','Closed / Rejected / Cancelled']
export const L_STATUS = ['Not Submitted','Processing','Query Raised','Approved','Rejected']
export type Lender = { name: string; status: string; amount: number; appId?: string; submittedOn?: string }
export type LogEntry = { s: string; at: string }
export type Sanction = { id: string; lender: string; amount: number; letterDate: string; validTill?: string; name: string; size: number; mime: string; on: string; by: string; key: string }
export type Escalation = { id: string; at: string; by: string; to: string; reason: string; stage: string; stageAt: string; auto?: boolean; resolvedAt?: string; resolvedBy?: string; note?: string }
export type AssignEntry = { to: string; by: string; at: string }
export type Loan = { id: string; customer: string; category: string; amount: number; stage: string; franchise: string; lenders: Lender[]; disbursed: number; h?: string[]
  log?: LogEntry[]; assignee?: string; assignLog?: AssignEntry[]; sanctions?: Sanction[]; escalations?: Escalation[] }
const ago = (d: number) => new Date(Date.now() - d * 864e5).toISOString()
export const SEED_LOANS: Loan[] = [
 { id:'LN-2001', customer:'Rohit Deshmukh', category:'Business Loan', amount:5000000, stage:'Under Bank Processing', franchise:'Akshay Finance', disbursed:0, assignee:'Neha Joshi', log:[{s:'New Inquiry',at:ago(40)},{s:'Documents Pending',at:ago(38)},{s:'File Submitted',at:ago(30)},{s:'Under Verification',at:ago(28)},{s:'Ready for Lender Submission',at:ago(20)},{s:'Submitted to Bank / NBFC',at:ago(18)},{s:'Under Bank Processing',at:ago(12)}], lenders:[{name:'Bank A',status:'Rejected',amount:0,appId:'BA/BL/26/00418'},{name:'NBFC B',status:'Processing',amount:4000000,appId:'NB-771204'},{name:'Bank C',status:'Query Raised',amount:5000000,appId:'BC2026-55310'},{name:'NBFC D',status:'Approved',amount:3500000,appId:'ND/MSME/0932'},{name:'Bank E',status:'Not Submitted',amount:0}] },
 { id:'LN-2002', customer:'Sneha Kulkarni', category:'Home Loan', amount:3500000, stage:'Documents Pending', franchise:'Akshay Finance', disbursed:0, lenders:[], log:[{s:'New Inquiry',at:ago(11)},{s:'Documents Pending',at:ago(9)}] },
 { id:'LN-2003', customer:'Vikas Jadhav', category:'Loan Against Property', amount:8000000, stage:'Disbursed', franchise:'Nashik Finserv', disbursed:7500000, assignee:'Neha Joshi', log:[{s:'New Inquiry',at:ago(60)},{s:'Documents Pending',at:ago(58)},{s:'File Submitted',at:ago(52)},{s:'Under Verification',at:ago(51)},{s:'Ready for Lender Submission',at:ago(47)},{s:'Submitted to Bank / NBFC',at:ago(46)},{s:'Under Bank Processing',at:ago(44)},{s:'Approved / Sanctioned',at:ago(30)},{s:'Disbursement Pending',at:ago(27)},{s:'Disbursed',at:ago(21)}], lenders:[{name:'Bank C',status:'Approved',amount:7500000,appId:'BC2026-41872'}] },
]
export const DEMO_PASSWORD = 'Dvp@1234'
export const USERS = ROLES.map(r => ({ role: r, email: r.toLowerCase().replace(/[^a-z]/g, '') + '@dvpcapitals.in' }))
export const COMM_STATUS = ['Estimated','Pending Lender Payment','Received by Head Office','Approved for Payout','Payout Processing','Paid','On Hold','Reversed / Adjusted']
export const COMM_SEED = [
 { id:'C-1', franchise:'Nashik Finserv', loan:'LN-2003', expected:150000, received:150000, status:'Received by Head Office' },
 { id:'C-2', franchise:'Akshay Finance', loan:'LN-2001', expected:70000, received:0, status:'Estimated' },
 { id:'C-3', franchise:'Akshay Finance', loan:'LN-1990', expected:120000, received:120000, status:'Paid' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>
export const audit = (user: string, action: string) => {
  const rows = readJson<AnyRow[]>('dvp-m-audit', []); const n = Math.max(200, ...rows.map(r => parseInt(String(r.id).replace(/\D/g, '')) || 0)) + 1
  writeJson('dvp-m-audit', [{ id: 'AL-' + n, user, action, time: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...rows])
}
export const ensureCommission = (loan: string, franchise: string, disbursed: number, ratePct = 2) => {
  const rows = readJson<AnyRow[]>('dvp-comm', COMM_SEED); if (rows.some(r => r.loan === loan)) return
  writeJson('dvp-comm', [...rows, { id: 'C-' + Date.now(), franchise, loan, expected: Math.round(disbursed * ratePct / 100), received: 0, status: 'Pending Lender Payment' }])
}

export const NOTIF_SEED = [
  { id: 'NT-101', message: 'LN-2001 approved by NBFC D', category: 'Query Raised', status: 'Unread' },
  { id: 'NT-102', message: 'Satara Capital agreement expires 14 Dec 2026', category: 'Agreement Expiring', status: 'Unread' },
]
export const CNOTIF_SEED = [{ id: 'NC-1', message: 'Please upload your latest salary slips for LN-2002.', status: 'Unread' }]
export const isMyLoan = (l: { id: string; customer: string }) => ['LN-2001', 'LN-2002'].includes(l.id) || l.customer === 'Demo Customer'
const pushNote = (key: string, pre: string, seed: AnyRow[], row: AnyRow) => {
  const rows = readJson<AnyRow[]>(key, seed); const n = Math.max(100, ...rows.map(r => parseInt(String(r.id).replace(/\D/g, '')) || 0)) + 1
  writeJson(key, [{ id: `${pre}-${n}`, ...row, status: 'Unread' }, ...rows])
}
export const notifyHO = (message: string, category: string) => pushNote('dvp-m-notif', 'NT', NOTIF_SEED, { message, category })
export const notifyCustomer = (message: string) => pushNote('dvp-m-ncu', 'NC', CNOTIF_SEED, { message })

/* ------------------------------------------------------------------ Franchise and lender profiles */
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
export const todayStr = () => new Date().toISOString().slice(0, 10)
export const daysUntil = (d: string) => Math.round((new Date(d).getTime() - new Date(todayStr()).getTime()) / 86400000)

export const EMP_SEED: AnyRow[] = [
  { id: 'EM-101', name: 'Neha Joshi', dept: 'Loan Processing', role: 'Loan Processing Executive', status: 'Active' },
  { id: 'EM-102', name: 'Sandeep Kale', dept: 'Accounts', role: 'Accounts Manager', status: 'Active' },
  { id: 'EM-103', name: 'Rutuja More', dept: 'Support', role: 'Support Executive', status: 'Active' },
  { id: 'EM-104', name: 'Amit Deshpande', dept: 'Operations', role: 'Relationship Manager', status: 'Active' },
  { id: 'EM-105', name: 'Kavita Naik', dept: 'Operations', role: 'Relationship Manager', status: 'Active' },
  { id: 'EM-106', name: 'Rahul Patil', dept: 'Loan Processing', role: 'Loan Processing Executive', status: 'Active' },
  { id: 'EM-107', name: 'Pooja Kulkarni', dept: 'Loan Processing', role: 'Loan Processing Executive', status: 'Active' },
]
export const AGR_SEED: AnyRow[] = [
  { id: 'AG-101', franchise: 'Akshay Finance', start: '2025-04-01', expiry: '2027-03-31', status: 'Signed', ref: 'AGR/2025/0101', renewal: 'Manual' },
  { id: 'AG-102', franchise: 'Satara Capital', start: '2024-12-15', expiry: '2026-12-14', status: 'Expiring', ref: 'AGR/2024/0102', renewal: 'Manual' },
  { id: 'AG-103', franchise: 'Mumbai Credit Hub', start: '2025-08-01', expiry: '2028-07-31', status: 'Signed', ref: 'AGR/2025/0103', renewal: 'Auto-renew' },
]
export const agrStatus = (signed: boolean, expiry: string) => !signed ? 'Draft' : !expiry ? 'Signed' : daysUntil(expiry) < 0 ? 'Expired' : daysUntil(expiry) <= 60 ? 'Expiring' : 'Signed'
export const agreementOf = (franchise: string): AnyRow | undefined => readJson<AnyRow[]>('dvp-m-agr', AGR_SEED).find(a => a.franchise === franchise)
export const upsertAgreement = (franchise: string, a: { start: string; expiry: string; ref?: string; renewal?: string; signed: boolean }) => {
  const rows = readJson<AnyRow[]>('dvp-m-agr', AGR_SEED); const status = agrStatus(a.signed, a.expiry); const cur = rows.find(x => x.franchise === franchise)
  if (cur) { writeJson('dvp-m-agr', rows.map(x => x === cur ? { ...x, ...a, status, _h: [...(x._h || []), `Agreement updated (${status})`] } : x)); return }
  const n = Math.max(100, ...rows.map(x => parseInt(String(x.id).replace(/\D/g, '')) || 0)) + 1
  writeJson('dvp-m-agr', [{ id: 'AG-' + n, franchise, start: a.start, expiry: a.expiry, status, ref: a.ref ?? '', renewal: a.renewal ?? 'Manual' }, ...rows])
}

export type FranProfile = { mobile: string; email: string; address: string; pin: string; pan: string; gst: string; kyc: string
  accHolder: string; bankName: string; branch: string; accType: string; accNo: string; ifsc: string; bankVerified: boolean; rm: string }
export const FRAN_BLANK: FranProfile = { mobile: '', email: '', address: '', pin: '', pan: '', gst: '', kyc: 'Pending', accHolder: '', bankName: '', branch: '', accType: 'Current', accNo: '', ifsc: '', bankVerified: false, rm: '' }
// Sample demo values for the seeded franchises. Replace with real details in production.
export const FRAN_DEFAULTS: Record<string, Partial<FranProfile>> = {
  'Akshay Finance': { mobile: '9822011001', email: 'akshay@akshayfinance.example', address: 'Shop 4, Baner Road', pin: '411045', pan: 'ABCDE1234F', gst: '27ABCDE1234F1Z5', kyc: 'Verified', accHolder: 'Akshay Finance', bankName: 'HDFC Bank', branch: 'Baner, Pune', accType: 'Current', accNo: '50200012345678', ifsc: 'HDFC0001234', bankVerified: true, rm: 'Amit Deshpande' },
  'Satara Capital': { mobile: '9822011002', email: 'mahesh@sataracapital.example', address: 'Powai Naka, Satara', pin: '415001', pan: 'BCDEF2345G', gst: '27BCDEF2345G1Z3', kyc: 'Verified', accHolder: 'Satara Capital', bankName: 'State Bank of India', branch: 'Satara Main', accType: 'Current', accNo: '39001234567', ifsc: 'SBIN0000456', bankVerified: true, rm: 'Kavita Naik' },
  'Mumbai Credit Hub': { mobile: '9822011003', email: 'farhan@mumbaicredithub.example', address: 'Andheri East, Mumbai', pin: '400069', pan: 'CDEFG3456H', gst: '27CDEFG3456H1Z1', kyc: 'Verified', accHolder: 'Mumbai Credit Hub LLP', bankName: 'ICICI Bank', branch: 'Andheri East', accType: 'Current', accNo: '000405012345', ifsc: 'ICIC0000004', bankVerified: false, rm: 'Amit Deshpande' },
  'Nashik Finserv': { mobile: '9822011004', email: 'pooja@nashikfinserv.example', address: 'College Road, Nashik', pin: '422005', pan: 'DEFGH4567J', kyc: 'Received' },
}
export const franProfileKey = (id: string) => 'dvp-prof-fran-' + id
export const getFranProfile = (id: string, name: string): FranProfile => ({ ...FRAN_BLANK, ...FRAN_DEFAULTS[name], ...readJson<Partial<FranProfile>>(franProfileKey(id), {}) })
export const saveFranProfile = (id: string, p: Partial<FranProfile>) => writeJson(franProfileKey(id), { ...readJson<Partial<FranProfile>>(franProfileKey(id), {}), ...p })

export type LenderProfile = { rmName: string; contactName: string; contactRole: string; contactPhone: string; contactEmail: string
  cats: string[]; minAmt: number; maxAmt: number; rateFrom: number; rateTo: number; maxTenure: number; tat: number
  minScore: number; minIncome: number; minAge: number; maxAge: number; minVintage: number; empTypes: string[]; elig: string
  procFee: number; prepay: number; loginFee: number; otherFees: string
  commRate: number; commBasis: string; payoutDays: number; clawbackMonths: number; agrRef: string; agrStart: string; agrExpiry: string; agrFile: string; commNotes: string }
export const LENDER_BLANK: LenderProfile = { rmName: '', contactName: '', contactRole: '', contactPhone: '', contactEmail: '', cats: [], minAmt: 0, maxAmt: 0, rateFrom: 0, rateTo: 0, maxTenure: 0, tat: 0,
  minScore: 0, minIncome: 0, minAge: 21, maxAge: 65, minVintage: 0, empTypes: ['Salaried', 'Self-employed', 'Business owner'], elig: '', procFee: 0, prepay: 0, loginFee: 0, otherFees: '',
  commRate: 0, commBasis: 'Disbursed amount', payoutDays: 30, clawbackMonths: 0, agrRef: '', agrStart: '', agrExpiry: '', agrFile: '', commNotes: '' }
// Sample demo terms. Confirm current terms with each lender.
export const LENDER_DEFAULTS: Record<string, Partial<LenderProfile>> = {
  'Bank A': { rmName: 'Amit Deshpande', contactName: 'Rahul Menon', contactRole: 'Branch Business Head', contactPhone: '9800000101', contactEmail: 'rahul.menon@banka.example', cats: ['Home Loan', 'Loan Against Property', 'Personal Loan'], minAmt: 500000, maxAmt: 50000000, rateFrom: 8.5, rateTo: 11.5, maxTenure: 360, tat: 7, minScore: 725, minIncome: 30000, minAge: 21, maxAge: 65, minVintage: 2, procFee: 0.5, prepay: 0, loginFee: 5000, commRate: 1, payoutDays: 45, clawbackMonths: 6, agrRef: 'LA/BA/2025/01', agrStart: '2025-04-01', agrExpiry: '2027-03-31' },
  'NBFC B': { rmName: 'Kavita Naik', contactName: 'Sunita Rao', contactRole: 'Regional Sales Manager', contactPhone: '9800000102', contactEmail: 'sunita.rao@nbfcb.example', cats: ['Business Loan', 'Working Capital', 'Machinery Loan', 'Personal Loan'], minAmt: 200000, maxAmt: 10000000, rateFrom: 12, rateTo: 24, maxTenure: 60, tat: 4, minScore: 680, minIncome: 25000, minAge: 23, maxAge: 62, minVintage: 3, empTypes: ['Self-employed', 'Business owner', 'Salaried'], procFee: 1.5, prepay: 3, loginFee: 2500, commRate: 2, payoutDays: 30, clawbackMonths: 3, agrRef: 'LA/NB/2025/04', agrStart: '2025-06-01', agrExpiry: '2026-12-31' },
  'Bank C': { rmName: 'Amit Deshpande', contactName: 'Vivek Iyer', contactRole: 'Cluster Head', contactPhone: '9800000103', contactEmail: 'vivek.iyer@bankc.example', cats: ['Business Loan', 'Loan Against Property', 'Project Finance', 'Machinery Loan'], minAmt: 1000000, maxAmt: 100000000, rateFrom: 9.75, rateTo: 13, maxTenure: 180, tat: 10, minScore: 700, minIncome: 50000, minAge: 25, maxAge: 65, minVintage: 3, procFee: 1, prepay: 2, loginFee: 10000, commRate: 1.25, payoutDays: 60, clawbackMonths: 6, agrRef: 'LA/BC/2024/09', agrStart: '2024-10-01', agrExpiry: '2027-09-30' },
  'NBFC D': { rmName: 'Kavita Naik', contactName: 'Pranav Shah', contactRole: 'Channel Partner Manager', contactPhone: '9800000104', contactEmail: 'pranav.shah@nbfcd.example', cats: ['Business Loan', 'Machinery Loan', 'Vehicle Loan', 'Education Loan'], minAmt: 100000, maxAmt: 20000000, rateFrom: 13.5, rateTo: 26, maxTenure: 84, tat: 3, minScore: 650, minIncome: 20000, minAge: 21, maxAge: 60, minVintage: 2, procFee: 2, prepay: 4, loginFee: 1500, commRate: 2.25, payoutDays: 30, clawbackMonths: 3, agrRef: 'LA/ND/2025/02', agrStart: '2025-02-01', agrExpiry: '2027-01-31' },
  'Bank E': { rmName: 'Amit Deshpande', contactName: 'Neeta Kulkarni', contactRole: 'Relationship Officer', contactPhone: '9800000105', contactEmail: 'neeta.kulkarni@banke.example', cats: ['Home Loan', 'Education Loan', 'Vehicle Loan', 'Personal Loan'], minAmt: 100000, maxAmt: 30000000, rateFrom: 8.9, rateTo: 12, maxTenure: 300, tat: 8, minScore: 720, minIncome: 25000, minAge: 21, maxAge: 65, minVintage: 1, procFee: 0.75, prepay: 0, loginFee: 3000, commRate: 1, payoutDays: 45, clawbackMonths: 6, agrRef: 'LA/BE/2025/07', agrStart: '2025-07-01', agrExpiry: '2027-06-30' },
}
export const LEND_SEED: AnyRow[] = [
  { id: 'LD-101', name: 'Bank A', type: 'Bank', products: 'Home, Loan Against Property, Personal', rate: 'From 8.5%', tat: '7 days', status: 'Active' },
  { id: 'LD-102', name: 'NBFC B', type: 'NBFC', products: 'Business, Working Capital, Machinery, Personal', rate: 'From 12%', tat: '4 days', status: 'Active' },
  { id: 'LD-103', name: 'NBFC D', type: 'NBFC', products: 'Business, Machinery, Vehicle, Education', rate: 'From 13.5%', tat: '3 days', status: 'Active' },
  { id: 'LD-104', name: 'Bank C', type: 'Bank', products: 'Business, Loan Against Property, Project Finance, Machinery', rate: 'From 9.75%', tat: '10 days', status: 'Active' },
  { id: 'LD-105', name: 'Bank E', type: 'Bank', products: 'Home, Education, Vehicle, Personal', rate: 'From 8.9%', tat: '8 days', status: 'Active' },
]
export const LEND_KEY = 'dvp-m-lend'
// Older browsers may hold the 3-lender list; add the missing sample lenders once.
export const lenderRows = (): AnyRow[] => {
  const rows = readJson<AnyRow[]>(LEND_KEY, LEND_SEED)
  if (readJson<boolean>('dvp-lend-mig1', false)) return rows
  writeJson('dvp-lend-mig1', true)
  const missing = LEND_SEED.filter(s => !rows.some(r => r.name === s.name)); if (!missing.length) return rows
  const n = [...rows, ...missing]; writeJson(LEND_KEY, n); return n
}
export const lenderProfileKey = (id: string) => 'dvp-prof-lend-' + id
export const getLenderProfile = (name: string): LenderProfile => {
  const row = lenderRows().find(r => r.name === name)
  return { ...LENDER_BLANK, ...LENDER_DEFAULTS[name], ...(row ? readJson<Partial<LenderProfile>>(lenderProfileKey(row.id), {}) : {}) }
}
export const lenderFit = (name: string, category: string, amount: number): string => {
  const p = getLenderProfile(name)
  if (p.cats.length && !p.cats.includes(category)) return 'Does not offer this loan category'
  if (p.minAmt && amount < p.minAmt) return `Minimum loan is ${inr(p.minAmt)}`
  if (p.maxAmt && amount > p.maxAmt) return `Maximum loan is ${inr(p.maxAmt)}`
  return ''
}
