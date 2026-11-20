import { EMP_SEED, readJson, type Loan, type LogEntry } from './data'

export const DAY = 864e5
/** Allowed days a file can stay in each stage before it is treated as delayed. Calendar days. */
export const SLA_DAYS: Record<string, number> = {
  'New Inquiry': 1, 'Documents Pending': 5, 'File Submitted': 1, 'Under Verification': 2, 'Query Raised': 3,
  'Ready for Lender Submission': 1, 'Submitted to Bank / NBFC': 2, 'Under Bank Processing': 7,
  'Approved / Sanctioned': 2, 'Disbursement Pending': 3,
}
/** A file is "critical" (auto-escalated) once it has spent this many times its SLA in one stage. */
export const CRITICAL_FACTOR = 2

export const ASSIGN_ROLES = ['Super Admin', 'Operations Manager', 'Loan Processing Executive']
export const SANCTION_ROLES = [...ASSIGN_ROLES, 'Relationship Manager']
export const ESC_TARGETS = ['Operations Manager', 'Super Admin']

type Row = Record<string, unknown>
export const employees = () => readJson<Row[]>('dvp-m-emp', EMP_SEED)
export const processors = (): string[] => employees().filter(e => e.status === 'Active' && (e.dept === 'Loan Processing' || /Processing/.test(String(e.role)))).map(e => String(e.name))
/** The employee record that matches the signed-in role (demo logins have no personal name). */
export const meName = (role: string): string => String(employees().find(e => e.status === 'Active' && e.role === role)?.name ?? '')

const parseHist = (x: string): string | null => { const m = x.match(/\((\d{1,2})\/(\d{1,2})\/(\d{4})\)\s*$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]).toISOString() : null }
/** Stage log with timestamps. Falls back to the older text history for files created before v9. */
export const logOf = (l: Loan): LogEntry[] => {
  if (l.log?.length) return l.log
  return (l.h ?? []).flatMap(x => { const at = parseHist(x); return at ? [{ s: x.replace(/\s*\(.*\)\s*$/, ''), at }] : [] })
}
export const isActive = (l: Loan) => l.stage !== 'Disbursed' && !l.stage.startsWith('Closed')
export const startedAt = (l: Loan): string | undefined => logOf(l)[0]?.at
export const stageSince = (l: Loan): string | undefined => { const g = logOf(l); return g[g.length - 1]?.at }
const ms = (iso?: string) => (iso ? new Date(iso).getTime() : NaN)

/** Total processing time: running for active files, fixed once Disbursed or Closed. */
export const totalMs = (l: Loan): number | null => {
  const a = ms(startedAt(l)); if (isNaN(a)) return null
  const b = isActive(l) ? Date.now() : ms(stageSince(l)); return Math.max(0, b - a)
}
export const inStageMs = (l: Loan): number | null => { const a = ms(stageSince(l)); return isNaN(a) ? null : Math.max(0, Date.now() - a) }
export const slaDays = (l: Loan): number | undefined => (isActive(l) ? SLA_DAYS[l.stage] : undefined)
export const overdueMs = (l: Loan): number => { const s = slaDays(l), t = inStageMs(l); return s && t != null ? Math.max(0, t - s * DAY) : 0 }
export type Delay = 'ok' | 'delayed' | 'critical' | 'done'
export const delayState = (l: Loan): Delay => {
  if (!isActive(l)) return 'done'
  const s = slaDays(l), t = inStageMs(l); if (!s || t == null) return 'ok'
  return t >= s * DAY * CRITICAL_FACTOR ? 'critical' : t > s * DAY ? 'delayed' : 'ok'
}
export const openEscalation = (l: Loan) => (l.escalations ?? []).find(e => !e.resolvedAt)

export const fmtDur = (v: number | null): string => {
  if (v == null) return '—'
  const h = Math.floor(v / 36e5); if (h < 1) return '< 1h'; if (h < 48) return `${h}h`
  const d = Math.floor(h / 24); const r = h % 24; return r ? `${d}d ${r}h` : `${d}d`
}
export const fmtWhen = (iso?: string) => (iso && !isNaN(ms(iso)) ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')
export const fmtDay = (iso?: string) => (iso && !isNaN(ms(iso)) ? new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—')

/** One row per stage visit, with the time spent there (open visit runs until now, finished files stop at the last entry). */
export const stageDurations = (l: Loan): { s: string; from: string; ms: number; open: boolean; over: boolean }[] => {
  const g = logOf(l)
  return g.map((e, i) => {
    const last = i === g.length - 1; const open = last && isActive(l)
    const end = last ? (open ? Date.now() : ms(e.at)) : ms(g[i + 1].at)
    const d = Math.max(0, end - ms(e.at)); const s = SLA_DAYS[e.s]
    return { s: e.s, from: e.at, ms: d, open, over: !!s && d > s * DAY }
  })
}
export const avgDisburseMs = (loans: Loan[]): number | null => {
  const t = loans.filter(l => l.stage === 'Disbursed').map(totalMs).filter((x): x is number => x != null)
  return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null
}
