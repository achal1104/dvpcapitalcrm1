import { useState } from 'react'
import { Eye, EyeOff, Landmark, Lock, Mail } from 'lucide-react'
import { useStore } from './store'
import { DEMO_PASSWORD, USERS } from './data'
const inp = 'w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-royal focus:outline-none focus:ring-2 focus:ring-blue-100'
export function Login() {
  const login = useStore(s => s.login)
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [show, setShow] = useState(false)
  const [err, setErr] = useState(''); const [fails, setFails] = useState(0); const [locked, setLocked] = useState(false)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email address.')
    if (!pw) return setErr('Enter your password.')
    const r = login(email, pw)
    if (!r) return
    const n = fails + 1; setFails(n); setErr(r)
    if (n >= 5) { setLocked(true); setErr('Too many attempts. Try again in 30 seconds.'); setTimeout(() => { setLocked(false); setFails(0); setErr('') }, 30000) }
  }
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy p-10 text-white lg:flex">
        <div className="flex items-center gap-2"><Landmark className="text-gold" /><b className="text-xl">DVP CAPITALS</b></div>
        <div><h2 className="text-3xl font-bold leading-snug">Franchise and loan operations in one place.</h2><p className="mt-3 max-w-sm text-slate-300">Track leads, loan files, lender responses and commissions across your network.</p></div>
        <p className="text-xs text-slate-400">Demo build. Data stays in your browser.</p>
      </div>
      <div className="grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-navy">Sign in</h1><p className="mb-6 text-sm text-slate-500">Use your email and password.</p>
          <label className="text-sm font-medium">Email</label>
          <div className="relative mb-4 mt-1"><Mail size={16} className="absolute left-3 top-3 text-slate-400" /><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@dvpcapitals.in" className={inp} /></div>
          <label className="text-sm font-medium">Password</label>
          <div className="relative mb-2 mt-1"><Lock size={16} className="absolute left-3 top-3 text-slate-400" /><input type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} className={inp} />
            <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-3 top-3 text-slate-400">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
          {err && <p role="alert" className="mb-2 text-sm text-red-600">{err}</p>}
          <button disabled={locked} className="mt-2 w-full rounded-lg bg-royal py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Sign in</button>
          <details className="mt-6 rounded-lg border border-slate-200 bg-white p-3 text-sm"><summary className="cursor-pointer font-medium text-navy">Demo accounts (password {DEMO_PASSWORD})</summary>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">{USERS.map(u => <button type="button" key={u.email} onClick={() => { setEmail(u.email); setPw(DEMO_PASSWORD); setErr('') }} className="block w-full rounded px-2 py-1 text-left hover:bg-slate-100"><b>{u.role}</b><span className="block text-xs text-slate-500">{u.email}</span></button>)}</div></details>
        </form>
      </div>
    </div>
  )
}
export function ChangePassword() {
  const changePw = useStore(s => s.changePw); const [o, setO] = useState(''); const [n, setN] = useState(''); const [c, setC] = useState(''); const [msg, setMsg] = useState<[boolean, string] | null>(null)
  const go = (e: React.FormEvent) => { e.preventDefault(); if (n !== c) return setMsg([false, 'New passwords do not match.']); const r = changePw(o, n); setMsg(r ? [false, r] : [true, 'Password updated.']); if (!r) { setO(''); setN(''); setC('') } }
  const f = 'w-full rounded-lg border border-slate-300 p-2.5 text-sm'
  return <form onSubmit={go} className="max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-bold text-navy">Change password</h1>
    <input type="password" placeholder="Current password" value={o} onChange={e => setO(e.target.value)} className={f} /><input type="password" placeholder="New password" value={n} onChange={e => setN(e.target.value)} className={f} /><input type="password" placeholder="Confirm new password" value={c} onChange={e => setC(e.target.value)} className={f} />
    {msg && <p role="alert" className={`text-sm ${msg[0] ? 'text-green-600' : 'text-red-600'}`}>{msg[1]}</p>}<button className="rounded-lg bg-royal px-4 py-2 font-semibold text-white">Update password</button></form>
}
