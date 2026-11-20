import { useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { EMP_SEED, IFSC_RE, LOAN_CATS, agreementOf, agrStatus, audit, daysUntil, getFranProfile, getLenderProfile, inr, lenderProfileKey, readJson, saveFranProfile, upsertAgreement, writeJson } from './data'
import type { FranProfile, LenderProfile } from './data'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
type Errs = Record<string, string>

const box = 'rounded-xl border border-slate-200 bg-white shadow-sm'
const inp = 'w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-royal focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50'
const btn = 'rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40'
const btn2 = 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50'
const MOB = /^[6-9]\d{9}$/, PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/, GST = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, MAIL = /^\S+@\S+\.\S+$/

export const employeeNames = (relationshipFirst = true): string[] => {
  const e = readJson<Row[]>('dvp-m-emp', EMP_SEED).filter(x => x.status === 'Active')
  const rm = e.filter(x => /relationship/i.test(String(x.role))).map(x => String(x.name)), rest = e.filter(x => !/relationship/i.test(String(x.role))).map(x => String(x.name))
  return relationshipFirst ? [...rm, ...rest] : [...rest, ...rm]
}
const mask = (s: string) => s.length > 4 ? '•'.repeat(s.length - 4) + s.slice(-4) : s

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return <section className={box + ' p-4'}><h3 className="text-sm font-bold text-navy">{title}</h3>{hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}<div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div></section>
}
function Fld({ label, error, children, wide }: { label: string; error?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`block text-xs font-medium text-slate-600 ${wide ? 'sm:col-span-2' : ''}`}>{label}{children}{error && <span role="alert" className="mt-1 block text-xs font-normal text-red-600">{error}</span>}</label>
}
function Val({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return <div className={`border-b border-slate-100 pb-2 text-sm ${wide ? 'sm:col-span-2' : ''}`}><div className="text-xs text-slate-500">{label}</div><div className="break-words">{value === '' || value == null ? <span className="text-slate-400">Not added</span> : value}</div></div>
}
function Bar({ pct, label }: { pct: number; label: string }) {
  return <div className="text-xs text-slate-500"><div className="mb-1 flex justify-between"><span>{label}</span><b className="text-navy">{pct}%</b></div><div className="h-2 rounded bg-slate-200"><div className="h-2 rounded bg-gold" style={{ width: pct + '%' }} /></div></div>
}
const chip = (t: string) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${/verified|signed|active/i.test(t) ? 'bg-green-100 text-green-700' : /expir|received|draft|unverified|pending/i.test(t) ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{t}</span>

/* ------------------------------------------------------------------ Franchise profile */
type FD = FranProfile & { accNo2: string; signed: boolean; agrRef: string; agrStart: string; agrExpiry: string; agrRenewal: string }
const franDraft = (id: string, name: string): FD => {
  const p = getFranProfile(id, name); const a = agreementOf(name)
  return { ...p, accNo2: p.accNo, signed: !!a && a.status !== 'Draft', agrRef: a?.ref ?? '', agrStart: a?.start ?? '', agrExpiry: a?.expiry ?? '', agrRenewal: a?.renewal ?? 'Manual' }
}
export const franCompleteness = (id: string, name: string) => {
  const d = franDraft(id, name)
  const checks = [d.mobile, d.email, d.address, d.pin, d.pan, d.kyc === 'Verified', d.accHolder, d.bankName, d.accNo, d.ifsc, d.bankVerified, d.rm, d.agrStart && d.agrExpiry && d.signed]
  return Math.round(checks.filter(Boolean).length / checks.length * 100)
}

export function FranchiseProfile({ row, role }: { row: Row; role: string }) {
  const id = String(row.id), name = String(row.name)
  const owner = role === 'Franchise Owner', ho = !owner && role !== 'Customer' && role !== 'Auditor'
  const [d, setD] = useState<FD>(() => franDraft(id, name)); const [edit, setEdit] = useState(false); const [err, setErr] = useState<Errs>({}); const [msg, setMsg] = useState('')
  const set = <K extends keyof FD>(k: K, v: FD[K]) => setD(p => ({ ...p, [k]: v }))
  const canEdit = ho || owner; const canVerify = ['Super Admin', 'Head Office Admin', 'Operations Manager', 'Accounts Manager'].includes(role)
  const lock = (selfField: boolean) => !edit || !(ho || (owner && selfField))   // owner may edit only contact and bank fields
  const validate = (): Errs => {
    const e: Errs = {}
    if (!MOB.test(d.mobile)) e.mobile = 'Enter a valid 10-digit mobile number.'
    if (d.email && !MAIL.test(d.email)) e.email = 'Enter a valid email.'
    if (d.pin && !/^\d{6}$/.test(d.pin)) e.pin = 'PIN code must be 6 digits.'
    if (d.pan && !PAN.test(d.pan.toUpperCase())) e.pan = 'PAN format: ABCDE1234F.'
    if (d.gst && !GST.test(d.gst.toUpperCase())) e.gst = 'GST number format is not valid.'
    const anyBank = d.accHolder || d.bankName || d.accNo || d.ifsc
    if (anyBank) {
      if (d.accHolder.trim().length < 2) e.accHolder = 'Enter the account holder name.'
      if (d.bankName.trim().length < 2) e.bankName = 'Enter the bank name.'
      if (!/^\d{9,18}$/.test(d.accNo)) e.accNo = 'Account number must be 9 to 18 digits.'
      else if (d.accNo !== d.accNo2) e.accNo2 = 'Account numbers do not match.'
      if (!IFSC_RE.test(d.ifsc.toUpperCase())) e.ifsc = 'IFSC format: 4 letters, 0, then 6 letters or digits (HDFC0001234).'
    }
    if (d.agrStart && d.agrExpiry && d.agrExpiry <= d.agrStart) e.agrExpiry = 'Expiry must be after the start date.'
    if (d.signed && !(d.agrStart && d.agrExpiry)) e.agrStart = 'Enter start and expiry dates for a signed agreement.'
    return e
  }
  const save = () => {
    const e = validate(); setErr(e); if (Object.keys(e).length) return
    const before = getFranProfile(id, name)
    const bankChanged = before.accNo !== d.accNo || before.ifsc !== d.ifsc.toUpperCase() || before.accHolder !== d.accHolder
    const p: Partial<FranProfile> = { mobile: d.mobile, email: d.email.trim(), address: d.address.trim(), pin: d.pin, pan: d.pan.toUpperCase(), gst: d.gst.toUpperCase(), kyc: d.kyc,
      accHolder: d.accHolder.trim(), bankName: d.bankName.trim(), branch: d.branch.trim(), accType: d.accType, accNo: d.accNo, ifsc: d.ifsc.toUpperCase(), rm: d.rm,
      bankVerified: bankChanged ? false : d.bankVerified }
    if (owner) { const keep = getFranProfile(id, name); Object.assign(p, { pan: keep.pan, gst: keep.gst, kyc: keep.kyc, rm: keep.rm }) }   // owners cannot change compliance or RM
    saveFranProfile(id, p)
    if (ho && (d.agrStart || d.agrExpiry)) upsertAgreement(name, { start: d.agrStart, expiry: d.agrExpiry, ref: d.agrRef.trim(), renewal: d.agrRenewal, signed: d.signed })
    audit(role, `Updated profile of ${name} (${id})${bankChanged ? ', bank details changed' : ''}`)
    setD(franDraft(id, name)); setEdit(false)
    setMsg(bankChanged ? 'Profile saved. Bank details changed, so head office must verify them before the next payout.' : 'Profile saved.')
  }
  const verify = () => { saveFranProfile(id, { bankVerified: true }); audit(role, `Verified bank account of ${name} (${id})`); setD(franDraft(id, name)); setMsg('Bank account marked as verified.') }
  const t = (k: keyof FD, self: boolean, extra: InputHTMLAttributes<HTMLInputElement> = {}) => <input className={inp} disabled={lock(self)} value={String(d[k] ?? '')} onChange={e => set(k, e.target.value as never)} {...extra} />
  const days = d.agrExpiry ? daysUntil(d.agrExpiry) : null
  const astat = agrStatus(d.signed, d.agrExpiry)
  const view = !edit
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3"><div className="min-w-48 flex-1"><Bar pct={franCompleteness(id, name)} label="Profile completeness" /></div>
      {canEdit && !edit && <button className={btn} onClick={() => { setEdit(true); setMsg('') }}>Edit profile</button>}
      {edit && <><button className={btn} onClick={save}>Save profile</button><button className={btn2} onClick={() => { setD(franDraft(id, name)); setErr({}); setEdit(false) }}>Cancel</button></>}</div>
    {msg && <p role="status" className="rounded bg-green-50 p-2 text-sm text-green-700">{msg}</p>}
    {owner && <p className="text-xs text-slate-500">You can update your contact and bank details. Compliance, relationship manager and agreement details are managed by head office.</p>}
    <Section title="Business and contact" hint={`${row.name} · ${row.owner} · ${row.city} · ${row.territory} territory`}>
      {view ? <><Val label="Mobile" value={d.mobile && '+91 ' + d.mobile} /><Val label="Email" value={d.email} /><Val label="Address" value={d.address} /><Val label="PIN code" value={d.pin} /></>
        : <><Fld label="Mobile number" error={err.mobile}>{t('mobile', true, { inputMode: 'numeric', maxLength: 10 })}</Fld><Fld label="Email" error={err.email}>{t('email', true)}</Fld><Fld label="Business address">{t('address', true)}</Fld><Fld label="PIN code" error={err.pin}>{t('pin', true, { inputMode: 'numeric', maxLength: 6 })}</Fld></>}
      <Val label="Franchise fee" value={inr(Number(row.fee) || 0)} /><Val label="Status" value={chip(String(row.status))} />
    </Section>
    <Section title="Compliance" hint="Collected during onboarding. Head office can correct these.">
      {view ? <><Val label="PAN" value={d.pan} /><Val label="GST number" value={d.gst} /><Val label="KYC status" value={chip(d.kyc)} /></>
        : <><Fld label="PAN" error={err.pan}><input className={inp + ' uppercase'} disabled={lock(false)} maxLength={10} value={d.pan} onChange={e => set('pan', e.target.value.toUpperCase())} /></Fld>
          <Fld label="GST number (if registered)" error={err.gst}><input className={inp + ' uppercase'} disabled={lock(false)} maxLength={15} value={d.gst} onChange={e => set('gst', e.target.value.toUpperCase())} /></Fld>
          <Fld label="KYC status"><select className={inp} disabled={lock(false)} value={d.kyc} onChange={e => set('kyc', e.target.value)}>{['Pending', 'Received', 'Verified'].map(x => <option key={x}>{x}</option>)}</select></Fld></>}
    </Section>
    <Section title="Bank account for commission payouts" hint="Payouts go only to a verified account in the franchise's name. Changing these details needs head office verification again.">
      {view ? <><Val label="Account holder" value={d.accHolder} /><Val label="Bank and branch" value={[d.bankName, d.branch].filter(Boolean).join(', ')} /><Val label="Account number" value={d.accNo && mask(d.accNo)} /><Val label="IFSC" value={d.ifsc} /><Val label="Account type" value={d.accNo ? d.accType : ''} />
        <Val label="Verification" value={<span className="flex items-center gap-2">{d.accNo ? chip(d.bankVerified ? 'Verified' : 'Unverified') : '—'}{canVerify && d.accNo && !d.bankVerified && <button className="text-xs text-royal underline" onClick={verify}>Mark verified</button>}</span>} /></>
        : <><Fld label="Account holder name" error={err.accHolder}>{t('accHolder', true)}</Fld><Fld label="Bank name" error={err.bankName}>{t('bankName', true)}</Fld><Fld label="Branch">{t('branch', true)}</Fld>
          <Fld label="Account type"><select className={inp} value={d.accType} onChange={e => set('accType', e.target.value)}>{['Current', 'Savings'].map(x => <option key={x}>{x}</option>)}</select></Fld>
          <Fld label="Account number" error={err.accNo}>{t('accNo', true, { inputMode: 'numeric', maxLength: 18 })}</Fld><Fld label="Confirm account number" error={err.accNo2}>{t('accNo2', true, { inputMode: 'numeric', maxLength: 18 })}</Fld>
          <Fld label="IFSC code" error={err.ifsc}><input className={inp + ' uppercase'} maxLength={11} value={d.ifsc} onChange={e => set('ifsc', e.target.value.toUpperCase())} /></Fld></>}
    </Section>
    <Section title="Relationship manager" hint="DVP Capitals employee who looks after this franchise.">
      {view ? <Val label="Assigned relationship manager" value={d.rm} /> : <Fld label="Assigned relationship manager"><select className={inp} disabled={lock(false)} value={d.rm} onChange={e => set('rm', e.target.value)}><option value="">Not assigned</option>{employeeNames().map(x => <option key={x}>{x}</option>)}</select></Fld>}
    </Section>
    <Section title="Agreement" hint="Saved in the Agreements register, so expiry alerts and the dashboard stay in step.">
      {view ? <><Val label="Agreement reference" value={d.agrRef} /><Val label="Status" value={d.agrStart ? chip(astat) : ''} /><Val label="Start date" value={d.agrStart} /><Val label="Expiry date" value={d.agrExpiry && `${d.agrExpiry}${days !== null ? (days < 0 ? ` (expired ${-days} days ago)` : ` (${days} days left)`) : ''}`} /><Val label="Renewal" value={d.agrStart ? d.agrRenewal : ''} /></>
        : <><Fld label="Agreement reference">{t('agrRef', false)}</Fld><Fld label="Renewal"><select className={inp} disabled={lock(false)} value={d.agrRenewal} onChange={e => set('agrRenewal', e.target.value)}>{['Manual', 'Auto-renew'].map(x => <option key={x}>{x}</option>)}</select></Fld>
          <Fld label="Start date" error={err.agrStart}>{t('agrStart', false, { type: 'date' })}</Fld><Fld label="Expiry date" error={err.agrExpiry}>{t('agrExpiry', false, { type: 'date' })}</Fld>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" disabled={lock(false)} checked={d.signed} onChange={e => set('signed', e.target.checked)} />Agreement signed by both parties <span className="text-xs text-slate-500">(status: {astat})</span></label></>}
    </Section>
  </div>
}

export function MyProfile({ row, role }: { row?: Row; role: string }) {
  if (!row) return <p className="p-8 text-slate-500">Your franchise record was not found. Contact head office.</p>
  return <div className="max-w-3xl space-y-4"><div><h1 className="text-2xl font-bold text-navy">My franchise profile</h1><p className="text-sm text-slate-500">{row.name} · Powered by DVP Capitals</p></div><FranchiseProfile row={row} role={role} /></div>
}

/* ------------------------------------------------------------------ Lender profile */
export type Sub = { loan: string; customer: string; appId: string; status: string; amount: number; on: string }
const num = (v: string) => v === '' ? 0 : Number(v)

export const lenderCompleteness = (p: LenderProfile) => {
  const c = [p.rmName, p.contactName, p.contactPhone || p.contactEmail, p.cats.length, p.minAmt, p.maxAmt, p.rateFrom, p.minScore, p.procFee, p.commRate, p.agrStart && p.agrExpiry]
  return Math.round(c.filter(Boolean).length / c.length * 100)
}

export function LenderProfileView({ row, role, subs, onRow }: { row: Row; role: string; subs: Sub[]; onRow?: (p: Row) => void }) {
  const name = String(row.name); const ho = !['Franchise Owner', 'Customer', 'Auditor'].includes(role)
  const [d, setD] = useState<LenderProfile>(() => getLenderProfile(name)); const [edit, setEdit] = useState(false); const [err, setErr] = useState<Errs>({}); const [msg, setMsg] = useState('')
  const set = <K extends keyof LenderProfile>(k: K, v: LenderProfile[K]) => setD(p => ({ ...p, [k]: v }))
  const lock = !edit || !ho
  const n = (k: keyof LenderProfile, extra: InputHTMLAttributes<HTMLInputElement> = {}) => <input className={inp} type="number" min={0} step="any" disabled={lock} value={Number(d[k]) || ''} onChange={e => set(k, num(e.target.value) as never)} {...extra} />
  const s = (k: keyof LenderProfile, extra: InputHTMLAttributes<HTMLInputElement> = {}) => <input className={inp} disabled={lock} value={String(d[k] ?? '')} onChange={e => set(k, e.target.value as never)} {...extra} />
  const toggle = (k: 'cats' | 'empTypes', v: string) => set(k, (d[k].includes(v) ? d[k].filter(x => x !== v) : [...d[k], v]) as never)
  const validate = (): Errs => {
    const e: Errs = {}
    if (d.contactPhone && !MOB.test(d.contactPhone)) e.contactPhone = 'Enter a valid 10-digit mobile number.'
    if (d.contactEmail && !MAIL.test(d.contactEmail)) e.contactEmail = 'Enter a valid email.'
    if (d.minAmt && d.maxAmt && d.minAmt > d.maxAmt) e.maxAmt = 'Maximum must be at least the minimum.'
    if (d.rateFrom && d.rateTo && d.rateFrom > d.rateTo) e.rateTo = 'Rate "to" must be at least rate "from".'
    if (d.minScore && (d.minScore < 300 || d.minScore > 900)) e.minScore = 'Credit score must be between 300 and 900.'
    if (d.minAge && d.maxAge && d.minAge > d.maxAge) e.maxAge = 'Maximum age must be at least the minimum age.'
    for (const k of ['rateFrom', 'rateTo', 'procFee', 'prepay', 'commRate'] as const) if (d[k] < 0 || d[k] > 100) e[k] = 'Enter a percentage between 0 and 100.'
    if (d.agrStart && d.agrExpiry && d.agrExpiry <= d.agrStart) e.agrExpiry = 'Expiry must be after the start date.'
    if (d.commRate > 0 && !d.agrStart) e.agrStart = 'Enter the commission agreement start date.'
    return e
  }
  const save = () => {
    const e = validate(); setErr(e); if (Object.keys(e).length) return
    writeJson(lenderProfileKey(String(row.id)), d)
    audit(role, `Updated lender profile of ${name} (${row.id})`)
    onRow?.({ rate: d.rateFrom ? `From ${d.rateFrom}%` : row.rate, tat: d.tat ? `${d.tat} days` : row.tat, products: d.cats.length ? d.cats.map(c => c.replace(' Loan', '')).join(', ') : row.products })
    setEdit(false); setMsg('Lender profile saved. Loan checks, lender comparison and new commission estimates now use these terms.')
  }
  const astat = d.agrStart ? agrStatus(true, d.agrExpiry) : ''
  const view = !edit
  const pct = (v: number) => v ? v + '%' : ''
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3"><div className="min-w-48 flex-1"><Bar pct={lenderCompleteness(d)} label="Profile completeness" /></div>
      {ho && !edit && <button className={btn} onClick={() => { setEdit(true); setMsg('') }}>Edit profile</button>}
      {edit && <><button className={btn} onClick={save}>Save profile</button><button className={btn2} onClick={() => { setD(getLenderProfile(name)); setErr({}); setEdit(false) }}>Cancel</button></>}</div>
    {msg && <p role="status" className="rounded bg-green-50 p-2 text-sm text-green-700">{msg}</p>}
    <Section title="Relationship and contacts" hint="Sample terms are pre-filled for demo lenders. Confirm current terms with each lender.">
      {view ? <><Val label="DVP relationship manager" value={d.rmName} /><Val label="Lender contact person" value={[d.contactName, d.contactRole].filter(Boolean).join(', ')} /><Val label="Contact phone" value={d.contactPhone && '+91 ' + d.contactPhone} /><Val label="Contact email" value={d.contactEmail} /></>
        : <><Fld label="DVP relationship manager"><select className={inp} value={d.rmName} onChange={e => set('rmName', e.target.value)}><option value="">Not assigned</option>{employeeNames().map(x => <option key={x}>{x}</option>)}</select></Fld>
          <Fld label="Lender contact person">{s('contactName')}</Fld><Fld label="Designation">{s('contactRole')}</Fld><Fld label="Contact phone" error={err.contactPhone}>{s('contactPhone', { inputMode: 'numeric', maxLength: 10 })}</Fld><Fld label="Contact email" error={err.contactEmail}>{s('contactEmail')}</Fld></>}
    </Section>
    <Section title="Loan terms">
      {view ? <><Val wide label="Loan categories offered" value={d.cats.join(', ')} /><Val label="Minimum loan" value={d.minAmt ? inr(d.minAmt) : ''} /><Val label="Maximum loan" value={d.maxAmt ? inr(d.maxAmt) : ''} /><Val label="Interest rate" value={d.rateFrom ? `${d.rateFrom}%${d.rateTo ? ' to ' + d.rateTo + '%' : ' onwards'}` : ''} /><Val label="Maximum tenure" value={d.maxTenure ? d.maxTenure + ' months' : ''} /><Val label="Typical turnaround" value={d.tat ? d.tat + ' days' : ''} /></>
        : <><div className="sm:col-span-2"><div className="mb-1 text-xs font-medium text-slate-600">Loan categories offered</div><div className="grid gap-1 text-sm sm:grid-cols-2">{LOAN_CATS.map(c => <label key={c} className="flex items-center gap-2"><input type="checkbox" checked={d.cats.includes(c)} onChange={() => toggle('cats', c)} />{c}</label>)}</div></div>
          <Fld label="Minimum loan (₹)">{n('minAmt')}</Fld><Fld label="Maximum loan (₹)" error={err.maxAmt}>{n('maxAmt')}</Fld><Fld label="Interest rate from (%)" error={err.rateFrom}>{n('rateFrom')}</Fld><Fld label="Interest rate to (%)" error={err.rateTo}>{n('rateTo')}</Fld>
          <Fld label="Maximum tenure (months)">{n('maxTenure')}</Fld><Fld label="Typical turnaround (days)">{n('tat')}</Fld></>}
    </Section>
    <Section title="Eligibility criteria">
      {view ? <><Val label="Minimum credit score" value={d.minScore || ''} /><Val label="Minimum monthly income" value={d.minIncome ? inr(d.minIncome) : ''} /><Val label="Applicant age" value={d.minAge || d.maxAge ? `${d.minAge} to ${d.maxAge} years` : ''} /><Val label="Minimum business vintage" value={d.minVintage ? d.minVintage + ' years' : ''} /><Val wide label="Accepted applicant types" value={d.empTypes.join(', ')} /><Val wide label="Other eligibility notes" value={d.elig} /></>
        : <><Fld label="Minimum credit score" error={err.minScore}>{n('minScore')}</Fld><Fld label="Minimum monthly income (₹)">{n('minIncome')}</Fld><Fld label="Minimum age">{n('minAge')}</Fld><Fld label="Maximum age" error={err.maxAge}>{n('maxAge')}</Fld><Fld label="Minimum business vintage (years)">{n('minVintage')}</Fld>
          <div><div className="mb-1 text-xs font-medium text-slate-600">Accepted applicant types</div><div className="space-y-1 text-sm">{['Salaried', 'Self-employed', 'Business owner'].map(c => <label key={c} className="flex items-center gap-2"><input type="checkbox" checked={d.empTypes.includes(c)} onChange={() => toggle('empTypes', c)} />{c}</label>)}</div></div>
          <Fld wide label="Other eligibility notes"><textarea className={inp} rows={2} value={d.elig} onChange={e => set('elig', e.target.value)} /></Fld></>}
    </Section>
    <Section title="Fees charged by the lender">
      {view ? <><Val label="Processing fee" value={pct(d.procFee)} /><Val label="Prepayment or foreclosure charge" value={pct(d.prepay)} /><Val label="Login fee" value={d.loginFee ? inr(d.loginFee) : ''} /><Val label="Other charges" value={d.otherFees} /></>
        : <><Fld label="Processing fee (%)" error={err.procFee}>{n('procFee')}</Fld><Fld label="Prepayment or foreclosure charge (%)" error={err.prepay}>{n('prepay')}</Fld><Fld label="Login fee (₹)">{n('loginFee')}</Fld><Fld label="Other charges">{s('otherFees')}</Fld></>}
    </Section>
    <Section title="Commission agreement" hint="What the lender pays DVP Capitals. New disbursements use this rate for the expected commission.">
      {view ? <><Val label="Commission rate" value={pct(d.commRate)} /><Val label="Calculated on" value={d.commRate ? d.commBasis : ''} /><Val label="Payout timeline" value={d.commRate ? d.payoutDays + ' days after disbursal' : ''} /><Val label="Clawback period" value={d.clawbackMonths ? d.clawbackMonths + ' months' : 'None'} />
        <Val label="Agreement reference" value={d.agrRef} /><Val label="Agreement status" value={astat ? <span>{chip(astat)} {d.agrExpiry && <span className="text-xs text-slate-500">{daysUntil(d.agrExpiry) < 0 ? 'expired' : `${daysUntil(d.agrExpiry)} days left`}</span>}</span> : ''} /><Val label="Valid from" value={d.agrStart} /><Val label="Valid until" value={d.agrExpiry} /><Val label="Agreement document" value={d.agrFile} /><Val wide label="Notes" value={d.commNotes} /></>
        : <><Fld label="Commission rate (%)" error={err.commRate}>{n('commRate')}</Fld><Fld label="Calculated on"><select className={inp} value={d.commBasis} onChange={e => set('commBasis', e.target.value)}>{['Disbursed amount', 'Sanctioned amount'].map(x => <option key={x}>{x}</option>)}</select></Fld>
          <Fld label="Payout timeline (days after disbursal)">{n('payoutDays')}</Fld><Fld label="Clawback period (months)">{n('clawbackMonths')}</Fld><Fld label="Agreement reference">{s('agrRef')}</Fld>
          <Fld label="Agreement document"><input type="file" accept=".pdf,.jpg,.jpeg,.png" className={inp} onChange={e => set('agrFile', e.target.files?.[0]?.name ?? d.agrFile)} /><span className="mt-1 block text-xs font-normal text-slate-500">{d.agrFile ? 'Saved name: ' + d.agrFile : 'Demo only: the file name is saved, the file is not uploaded.'}</span></Fld>
          <Fld label="Valid from" error={err.agrStart}>{s('agrStart', { type: 'date' })}</Fld><Fld label="Valid until" error={err.agrExpiry}>{s('agrExpiry', { type: 'date' })}</Fld>
          <Fld wide label="Notes (slabs, clawback conditions, incentives)"><textarea className={inp} rows={2} value={d.commNotes} onChange={e => set('commNotes', e.target.value)} /></Fld></>}
    </Section>
    <section className={box + ' p-4'}><h3 className="text-sm font-bold text-navy">Submissions to {name}</h3><p className="mb-2 text-xs text-slate-500">Lender application ID is entered on each loan file under Lenders.</p>
      {subs.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-500"><tr>{['Loan', 'Customer', 'Lender application ID', 'Amount', 'Status', 'Submitted'].map(h => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{subs.map(x => <tr key={x.loan} className="border-t border-slate-100"><td className="py-1 pr-3">{x.loan}</td><td className="pr-3">{x.customer}</td><td className="pr-3">{x.appId || <span className="text-amber-600">ID missing</span>}</td><td className="pr-3">{x.amount ? inr(x.amount) : '—'}</td><td className="pr-3">{x.status}</td><td>{x.on || '—'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No files submitted to this lender yet.</p>}</section>
  </div>
}
