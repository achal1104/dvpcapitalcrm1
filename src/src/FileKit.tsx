import { useEffect, useState } from 'react'

/** Demo storage: files live in the browser (localStorage) as data URLs. Production should use private encrypted storage with expiring links. */
export const MAX_BYTES = 1.5 * 1024 * 1024
export const ACCEPT = '.pdf,.jpg,.jpeg,.png'
export const mimeOf = (name: string) => { const e = name.toLowerCase().split('.').pop(); return e === 'pdf' ? 'application/pdf' : e === 'png' ? 'image/png' : e === 'jpg' || e === 'jpeg' ? 'image/jpeg' : 'application/octet-stream' }
export const fmtSize = (n: number) => (!n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
export const checkFile = (f: File): string | null => {
  if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) return 'Only PDF, JPG or PNG files are accepted.'
  if (f.size > MAX_BYTES) return `File is ${fmtSize(f.size)}. The demo accepts up to ${fmtSize(MAX_BYTES)}; production storage has no such limit.`
  return null
}
export const readDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('Could not read the file.')); r.readAsDataURL(f) })
const K = (k: string) => 'dvp-blob-' + k
export const putBlob = (key: string, dataUrl: string): string | null => { try { localStorage.setItem(K(key), dataUrl); return null } catch { return 'Browser storage is full. Delete some old files and try again.' } }
export const getBlob = (key: string): string | null => { try { return localStorage.getItem(K(key)) } catch { return null } }
export const delBlob = (key: string) => { try { localStorage.removeItem(K(key)) } catch { /* storage unavailable */ } }

/** Preview for PDFs and images, plus open-in-new-tab and download. */
export function FilePreview({ blobKey, name, mime }: { blobKey?: string; name: string; mime: string }) {
  const data = blobKey ? getBlob(blobKey) : null
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!data) { setUrl(null); return }
    let u = ''; let live = true
    fetch(data).then(r => r.blob()).then(b => { if (live) { u = URL.createObjectURL(b); setUrl(u) } }).catch(() => setUrl(null))
    return () => { live = false; if (u) URL.revokeObjectURL(u) }
  }, [data])
  if (!data) return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No stored file for this record. It is a demo record (only the file name was saved). Upload a file to preview it here.</p>
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-3 text-sm"><a className="text-royal underline" href={data} download={name}>Download</a>{url && <a className="text-royal underline" href={url} target="_blank" rel="noreferrer">Open in new tab</a>}</div>
    {mime.startsWith('image/') ? <img src={data} alt={name} className="max-h-[70vh] w-full rounded-lg border border-slate-200 object-contain" />
      : url ? <iframe title={name} src={url} className="h-[70vh] w-full rounded-lg border border-slate-200" /> : <p className="text-sm text-slate-500">Loading preview…</p>}
  </div>
}
