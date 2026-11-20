import { useEffect, useState } from 'react'
import { Download, Film, Image as ImageIcon, MessageCircle, Pause, Play, Trash2, Copy } from 'lucide-react'
import { FRANCHISES, LOAN_CATS, MY_FRANCHISE, readJson, slug } from './data'

const box = 'rounded-xl border border-slate-200 bg-white shadow-sm'
const inp = 'w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-royal focus:outline-none focus:ring-2 focus:ring-blue-100'
const btn = 'rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40'
const POWERED = 'Powered by DVP Capitals'
const KEY = 'dvp-content'
const MAX_BYTES = 1_500_000

type Kind = 'Graphic' | 'Video'
type Item = { id: string; title: string; kind: Kind; category: string; desc: string; tpl?: string; src?: string; builtin?: boolean }

/* ---------- built-in templates (always branded with the viewing franchise) ---------- */
type Tpl = { k: string; w: number; h: number; head: string; sub: string; c1: string; c2: string }
const TPLS: Record<string, Tpl> = {
  home: { k: 'home', w: 1080, h: 1080, head: 'Your dream home starts here', sub: 'Home loans from the right bank or NBFC', c1: '#0b1f44', c2: '#1d4ed8' },
  biz: { k: 'biz', w: 1080, h: 1080, head: 'Fund your next big step', sub: 'Business and working capital loans', c1: '#0b1f44', c2: '#334155' },
  pl: { k: 'pl', w: 1080, h: 1080, head: 'Money when you need it', sub: 'Personal loans with simple paperwork', c1: '#1e3a8a', c2: '#0b1f44' },
  lap: { k: 'lap', w: 1080, h: 1080, head: 'Unlock the value of your property', sub: 'Loan against property, residential and commercial', c1: '#0b1f44', c2: '#1d4ed8' },
  edu: { k: 'edu', w: 1080, h: 1080, head: 'Study without limits', sub: 'Education loans for students and parents', c1: '#1d4ed8', c2: '#0b1f44' },
  story: { k: 'story', w: 1080, h: 1920, head: 'Loans made simple', sub: 'One team. Many lenders. Track every step.', c1: '#0b1f44', c2: '#1d4ed8' },
  cover: { k: 'cover', w: 1640, h: 624, head: 'Loans for every goal', sub: 'Home, business, property and personal finance', c1: '#0b1f44', c2: '#1d4ed8' },
}
const BUILTIN: Item[] = [
  { id: 'G-home', title: 'Home loan poster', kind: 'Graphic', category: 'Home Loan', desc: 'Square post for Instagram, Facebook and WhatsApp.', tpl: 'home', builtin: true },
  { id: 'G-biz', title: 'Business loan poster', kind: 'Graphic', category: 'Business Loan', desc: 'Square post aimed at MSME owners.', tpl: 'biz', builtin: true },
  { id: 'G-pl', title: 'Personal loan poster', kind: 'Graphic', category: 'Personal Loan', desc: 'Square post for salaried customers.', tpl: 'pl', builtin: true },
  { id: 'G-lap', title: 'Loan against property poster', kind: 'Graphic', category: 'Loan Against Property', desc: 'Square post for property owners.', tpl: 'lap', builtin: true },
  { id: 'G-edu', title: 'Education loan poster', kind: 'Graphic', category: 'Education Loan', desc: 'Square post for students and parents.', tpl: 'edu', builtin: true },
  { id: 'G-story', title: 'WhatsApp status / story', kind: 'Graphic', category: 'General', desc: 'Tall 9:16 creative for WhatsApp status and Instagram stories.', tpl: 'story', builtin: true },
  { id: 'G-cover', title: 'Facebook cover banner', kind: 'Graphic', category: 'General', desc: 'Wide banner for your Facebook page or website header.', tpl: 'cover', builtin: true },
  { id: 'V-journey', title: 'How your loan journey works', kind: 'Video', category: 'General', desc: 'Short animated explainer: apply, documents, lender, track. Preview plays here.', tpl: 'journey', builtin: true },
  { id: 'V-docs', title: 'Documents you need for a loan', kind: 'Video', category: 'General', desc: 'Short animated checklist you can show to walk-in customers.', tpl: 'docs', builtin: true },
]
const SLIDES: Record<string, (fr: string) => string[]> = {
  journey: fr => ['Need a loan?', `Apply with ${fr}`, 'Share your documents once', 'We approach the right lenders', 'Track every step online'],
  docs: () => ['Keep these ready', 'PAN and ID proof', 'Bank statements', 'Income proof: salary slips or ITR', 'Business and property papers, if any'],
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const wrap = (s: string, n: number) => { const out: string[] = []; let cur = ''; for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > n) { out.push(cur); cur = w } else cur = (cur + ' ' + w).trim() } if (cur) out.push(cur); return out }
const linkFor = (fr: string) => `${window.location.origin}/apply/${slug(fr)}`

function svgFor(t: Tpl, fr: string): string {
  const { w, h } = t; const tall = h > w; const wide = w > h * 2
  const hs = Math.round(Math.min(w, h * (wide ? 1.6 : 1)) * (wide ? 0.06 : 0.075)); const ss = Math.round(hs * 0.42); const band = Math.round(h * (wide ? 0.2 : 0.09))
  const lines = wrap(t.head, wide ? 30 : tall ? 16 : 18); const y0 = h * (wide ? 0.38 : 0.34)
  const head = lines.map((l, i) => `<text x="${w * 0.08}" y="${y0 + i * hs * 1.15}" fill="#fff" font-family="Arial,sans-serif" font-weight="700" font-size="${hs}">${esc(l)}</text>`).join('')
  const sy = y0 + lines.length * hs * 1.15 + ss
  const nameSize = Math.round(band * 0.36)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.9}" cy="${h * 0.18}" r="${Math.min(w, h) * 0.22}" fill="#fff" opacity="0.06"/><circle cx="${w * 0.78}" cy="${h * 0.72}" r="${Math.min(w, h) * 0.3}" fill="#c9a227" opacity="0.1"/>` +
    `<text x="${w * 0.08}" y="${h * 0.12}" fill="#c9a227" font-family="Arial,sans-serif" font-weight="700" font-size="${ss}">${esc(fr.toUpperCase())}</text>` +
    head + `<text x="${w * 0.08}" y="${sy}" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="${ss}">${esc(t.sub)}</text>` +
    `<text x="${w * 0.08}" y="${h - band - ss * 0.9}" fill="#94a3b8" font-family="Arial,sans-serif" font-size="${Math.round(ss * 0.62)}">Approval, amount and rate are decided by the lender.</text>` +
    `<rect x="0" y="${h - band}" width="${w}" height="${band}" fill="#0b1f44"/><rect x="0" y="${h - band}" width="${w}" height="5" fill="#c9a227"/>` +
    `<text x="${w * 0.08}" y="${h - band / 2 + nameSize * 0.1}" fill="#fff" font-family="Arial,sans-serif" font-weight="700" font-size="${nameSize}">${esc(fr)}</text>` +
    `<text x="${w * 0.08}" y="${h - band / 2 + nameSize * 1.1}" fill="#c9a227" font-family="Arial,sans-serif" font-size="${Math.round(nameSize * 0.7)}">${POWERED}</text></svg>`
}

const dl = (name: string, blob: Blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }
function svgToPng(svg: string, w: number, h: number, name: string, onFail: () => void) {
  const img = new Image(); const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  img.onload = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d')!.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(u); c.toBlob(b => (b ? dl(name, b) : onFail()), 'image/png') }
  img.onerror = () => { URL.revokeObjectURL(u); onFail() }; img.src = u
}
function brandUploaded(src: string, fr: string, name: string, onFail: () => void) {
  const img = new Image()
  img.onload = () => {
    const W = 1080, H = Math.round(W * img.naturalHeight / img.naturalWidth), B = 120; const c = document.createElement('canvas'); c.width = W; c.height = H + B; const g = c.getContext('2d')!
    g.drawImage(img, 0, 0, W, H); g.fillStyle = '#0b1f44'; g.fillRect(0, H, W, B); g.fillStyle = '#c9a227'; g.fillRect(0, H, W, 5)
    g.fillStyle = '#fff'; g.font = 'bold 40px Arial'; g.fillText(fr, 40, H + 55); g.fillStyle = '#c9a227'; g.font = '28px Arial'; g.fillText(POWERED, 40, H + 95)
    try { c.toBlob(b => (b ? dl(name, b) : onFail()), 'image/png') } catch { onFail() }
  }
  img.onerror = onFail; img.crossOrigin = 'anonymous'; img.src = src
}

/* ---------- viewers ---------- */
function Promo({ fr, slides }: { fr: string; slides: string[] }) {
  const [i, setI] = useState(0); const [on, setOn] = useState(false)
  useEffect(() => { if (!on) return; const t = setInterval(() => setI(x => (x + 1) % slides.length), 2200); return () => clearInterval(t) }, [on, slides.length])
  return <div className="relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-navy to-royal text-white">
    <div className="absolute left-3 top-3 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-gold">{fr}</div>
    <div key={i} className="grid h-full place-items-center px-8 pb-10 text-center text-xl font-bold sm:text-2xl" style={{ animation: 'dvpfade .6s ease' }}>{slides[i]}</div>
    <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-navy/90 px-3 py-2 text-xs"><button aria-label={on ? 'Pause' : 'Play'} onClick={() => setOn(!on)} className="grid h-7 w-7 place-items-center rounded-full bg-gold text-navy">{on ? <Pause size={14} /> : <Play size={14} />}</button>
      <span className="font-semibold">{fr}</span><span className="text-gold">{POWERED}</span><span className="ml-auto text-slate-400">{i + 1}/{slides.length}</span></div>
    <style>{'@keyframes dvpfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'}</style>
  </div>
}
function yt(u: string) { const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/); return m ? `https://www.youtube.com/embed/${m[1]}` : '' }
function VideoSrc({ src, fr }: { src: string; fr: string }) {
  const e = yt(src)
  return <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
    {e ? <iframe title="Video" src={e} className="h-full w-full" allowFullScreen /> : <video src={src} controls className="h-full w-full" />}
    <div className="pointer-events-none absolute left-2 top-2 rounded bg-navy/85 px-2 py-1 text-[11px] text-white"><b>{fr}</b> · <span className="text-gold">{POWERED}</span></div></div>
}

function Card({ it, fr, ho, remove }: { it: Item; fr: string; ho: boolean; remove: () => void }) {
  const [msg, setMsg] = useState('')
  const t = it.tpl ? TPLS[it.tpl] : undefined; const link = linkFor(fr)
  const text = `${it.title}\n${fr} - ${POWERED}\nApply here: ${link}`
  const fail = () => setMsg('Could not create the image. Right-click the preview to save it, or try another browser.')
  const preview = it.kind === 'Graphic'
    ? t ? <div className="overflow-hidden rounded-lg bg-slate-100" dangerouslySetInnerHTML={{ __html: svgFor(t, fr).replace(/width="\d+" height="\d+"/, 'width="100%" style="display:block;max-height:340px"') }} />
      : <div className="relative overflow-hidden rounded-lg bg-slate-100"><img src={it.src} alt={it.title} className="block max-h-80 w-full object-contain" />
        <div className="absolute inset-x-0 bottom-0 bg-navy/90 px-3 py-2 text-xs text-white"><b>{fr}</b> · <span className="text-gold">{POWERED}</span></div></div>
    : it.tpl ? <Promo fr={fr} slides={SLIDES[it.tpl](fr)} /> : <VideoSrc src={it.src!} fr={fr} />
  const download = () => { setMsg(''); const n = `${slug(fr)}-${slug(it.title)}.png`; if (t) svgToPng(svgFor(t, fr), t.w, t.h, n, fail); else if (it.src) brandUploaded(it.src, fr, n, fail) }
  return <div className={box + ' flex flex-col gap-3 p-3'}>{preview}
    <div><div className="flex items-center gap-2 text-sm font-semibold text-navy">{it.kind === 'Video' ? <Film size={15} /> : <ImageIcon size={15} />}{it.title}</div>
      <p className="mt-0.5 text-xs text-slate-500">{it.category} · {it.desc}</p></div>
    <div className="mt-auto flex flex-wrap items-center gap-3 text-sm">
      {it.kind === 'Graphic' && <button onClick={download} className="flex items-center gap-1 text-royal"><Download size={14} />Download PNG</button>}
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-royal"><MessageCircle size={14} />Share</a>
      <button onClick={() => { navigator.clipboard?.writeText(text); setMsg('Caption copied.') }} className="flex items-center gap-1 text-royal"><Copy size={14} />Copy caption</button>
      {ho && !it.builtin && <button onClick={() => confirm(`Remove "${it.title}"?`) && remove()} className="ml-auto text-slate-400 hover:text-red-600" title="Remove"><Trash2 size={15} /></button>}</div>
    {it.kind === 'Video' && it.tpl && <p className="text-xs text-slate-400">Animated preview shown in the CRM. Branding is applied on screen.</p>}
    {msg && <p role="status" className="text-xs text-slate-600">{msg}</p>}</div>
}

/* ---------- page ---------- */
export function Content({ role }: { role: string }) {
  const ho = role !== 'Franchise Owner'
  const names = [...new Set([...FRANCHISES, ...readJson<{ name: string }[]>('dvp-m-fran', []).map(x => x.name)])]
  const [fr, setFr] = useState(MY_FRANCHISE); const [kind, setKind] = useState<'All' | Kind>('All'); const [cat, setCat] = useState('All')
  const [custom, setCustom] = useState<Item[]>(() => readJson<Item[]>(KEY, [])); const [open, setOpen] = useState(false); const [err, setErr] = useState('')
  const [f, setF] = useState<{ title: string; kind: Kind; category: string; desc: string; url: string; src: string; fname: string }>({ title: '', kind: 'Graphic', category: 'General', desc: '', url: '', src: '', fname: '' })
  const all = [...custom, ...BUILTIN]; const cats = ['General', ...LOAN_CATS]
  const rows = all.filter(x => (kind === 'All' || x.kind === kind) && (cat === 'All' || x.category === cat || x.category === 'General'))
  const persist = (n: Item[]) => { try { localStorage.setItem(KEY, JSON.stringify(n)); setCustom(n); return true } catch { setErr('Browser storage is full. Remove an item or use a link instead of a file.'); return false } }
  const pick = (file?: File) => {
    if (!file) return
    if (file.size > MAX_BYTES) { setErr('This file is over 1.5 MB. In the demo, add large videos and images as a link instead.'); return }
    if (f.kind === 'Graphic' && !file.type.startsWith('image/')) { setErr('Graphics must be PNG or JPG images.'); return }
    if (f.kind === 'Video' && !file.type.startsWith('video/')) { setErr('Choose a video file such as MP4.'); return }
    const r = new FileReader(); r.onload = () => { setErr(''); setF(p => ({ ...p, src: String(r.result), fname: file.name, url: '' })) }; r.readAsDataURL(file)
  }
  const add = () => {
    const src = f.src || f.url.trim()
    if (f.title.trim().length < 2) return setErr('Enter a title.')
    if (!src) return setErr('Choose a file or paste a link.')
    if (f.url && !/^https?:\/\//.test(f.url.trim())) return setErr('The link must start with http:// or https://')
    if (!persist([{ id: 'C-' + Date.now(), title: f.title.trim(), kind: f.kind, category: f.category, desc: f.desc.trim() || 'Shared by head office.', src }, ...custom])) return
    setF({ title: '', kind: 'Graphic', category: 'General', desc: '', url: '', src: '', fname: '' }); setErr(''); setOpen(false)
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start gap-3"><div><h1 className="text-2xl font-bold text-navy">Content</h1>
      <p className="text-sm text-slate-500">Ready-made graphics and videos for {fr}. Every item carries your name and “{POWERED}”.</p></div>
      {ho && <button className={btn + ' ml-auto'} onClick={() => setOpen(!open)}>Add content</button>}</div>
    {ho && <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-slate-500">Preview as franchise:</span><select aria-label="Franchise" value={fr} onChange={e => setFr(e.target.value)} className={inp + ' max-w-xs'}>{names.map(x => <option key={x}>{x}</option>)}</select></div>}
    {ho && open && <div className={box + ' grid gap-3 p-4 sm:grid-cols-2'}>
      <label className="text-xs font-medium text-slate-600">Title<input className={inp} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></label>
      <label className="text-xs font-medium text-slate-600">Type<select className={inp} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as Kind, src: '', fname: '' })}><option>Graphic</option><option>Video</option></select></label>
      <label className="text-xs font-medium text-slate-600">Loan category<select className={inp} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{cats.map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Short description<input className={inp} value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} /></label>
      <label className="text-xs font-medium text-slate-600">Upload file (up to 1.5 MB){f.fname && <span className="ml-2 text-green-700">{f.fname}</span>}<input type="file" accept={f.kind === 'Graphic' ? 'image/png,image/jpeg' : 'video/mp4,video/webm'} className={inp} onChange={e => pick(e.target.files?.[0])} /></label>
      <label className="text-xs font-medium text-slate-600">Or paste a link {f.kind === 'Video' ? '(MP4 or YouTube)' : '(image URL)'}<input className={inp} value={f.url} placeholder="https://" onChange={e => setF({ ...f, url: e.target.value, src: '', fname: '' })} /></label>
      <p className="text-xs text-slate-500 sm:col-span-2">Graphics get the franchise name and “{POWERED}” added when downloaded. Videos show it as an on-screen label; the original video file is not edited.</p>
      {err && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{err}</p>}<div className="sm:col-span-2"><button className={btn} onClick={add}>Publish to all franchises</button></div></div>}
    <div className="flex flex-wrap items-center gap-2 text-sm">{(['All', 'Graphic', 'Video'] as const).map(k => <button key={k} onClick={() => setKind(k)} className={`rounded-full px-4 py-1.5 ${kind === k ? 'bg-royal text-white' : 'border border-slate-200 bg-white'}`}>{k === 'All' ? 'All' : k + 's'}</button>)}
      <select aria-label="Loan category" value={cat} onChange={e => setCat(e.target.value)} className={inp + ' ml-auto max-w-xs'}><option>All</option>{cats.map(x => <option key={x}>{x}</option>)}</select></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(it => <Card key={it.id + fr} it={it} fr={fr} ho={ho} remove={() => persist(custom.filter(x => x.id !== it.id))} />)}</div>
    {rows.length === 0 && <p className={box + ' p-8 text-center text-sm text-slate-500'}>Nothing matches these filters.</p>}
  </div>
}
