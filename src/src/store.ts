import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEMO_PASSWORD, Escalation, Lead, Loan, Role, SEED_LEADS, SEED_LOANS, Sanction, USERS, audit, ensureCommission, getLenderProfile, isMyLoan, notifyCustomer, notifyHO } from './data'
import { delayState, fmtDur, inStageMs, isActive, logOf, openEscalation, stageSince } from './ops'
type S = { role: Role|null; email: string; pw: Record<string,string>; leads: Lead[]; loans: Loan[]
 login:(e:string,p:string)=>string|null; logout:()=>void; changePw:(o:string,n:string)=>string|null
 addLead:(l:Omit<Lead,'id'>)=>void; setStatus:(id:string,s:string)=>void; removeLead:(id:string)=>void
 addLoan:(l:Omit<Loan,'id'>)=>string; submitFile:(id:string)=>string|null; setStage:(id:string,s:string)=>string|null; setLender:(id:string,i:number,status:string)=>void; setLenderAppId:(id:string,i:number,appId:string)=>void; addLender:(id:string,name:string)=>void
 assignLoan:(id:string,to:string,by:string)=>void; addSanction:(id:string,x:Sanction)=>void; removeSanction:(id:string,sid:string)=>void
 escalate:(id:string,reason:string,to:string,by:string)=>string|null; resolveEscalation:(id:string,eid:string,note:string,by:string)=>void; runEscalations:()=>void }
const upd = (loans: Loan[], id: string, f: (l: Loan) => Loan) => loans.map(l => l.id === id ? f(l) : l)
export const useStore = create<S>()(persist((set,get)=>({
 role:null, email:'', pw:{}, leads:SEED_LEADS, loans:SEED_LOANS,
 addLoan:l=>{ const n=Math.max(2000,...get().loans.map(x=>parseInt(x.id.replace(/\D/g,''))||0))+1; const id=`LN-${n}`
  set({loans:[{...l,id,h:[`${l.stage} (${new Date().toLocaleDateString('en-IN')})`],log:[{s:l.stage,at:new Date().toISOString()}]},...get().loans]}); notifyHO(`${id}: new ${l.category} application for ${l.customer}`,'New Loan Application'); return id },
 login:(e,p)=>{ const email=e.trim().toLowerCase(); const u=USERS.find(x=>x.email===email)
  if(!u || (get().pw[email]??DEMO_PASSWORD)!==p) return 'Incorrect email or password.'
  set({role:u.role,email}); audit(u.role,'Signed in'); return null },
 logout:()=>set({role:null,email:''}),
 submitFile:id=>{ const l=get().loans.find(x=>x.id===id); if(!l||l.stage!=='Documents Pending') return 'Only files in Documents Pending can be submitted.'; return get().setStage(id,'File Submitted') },
 changePw:(o,n)=>{ const {email,pw}=get(); if((pw[email]??DEMO_PASSWORD)!==o) return 'Current password is incorrect.'
  if(n.length<8||!/\d/.test(n)||!/[A-Za-z]/.test(n)) return 'New password needs 8+ characters with a letter and a number.'
  set({pw:{...pw,[email]:n}}); return null },
 addLead:l=>set({leads:[{...l,id:`L-${Math.max(1000,...get().leads.map(x=>parseInt(x.id.replace(/\D/g,''))||0))+1}`},...get().leads]}),
 setStatus:(id,s)=>set({leads:get().leads.map(l=>l.id===id?{...l,status:s}:l)}),
 removeLead:id=>set({leads:get().leads.filter(l=>l.id!==id)}),
 setStage:(id,s)=>{ const loan=get().loans.find(l=>l.id===id)!; const ok=loan.lenders.filter(x=>x.status==='Approved')
  if((s==='Disbursed'||s==='Disbursement Pending'||s==='Approved / Sanctioned')&&!ok.length) return 'No lender has approved this file yet.'
  const now=new Date().toISOString()
  set({loans:upd(get().loans,id,l=>({...l,stage:s,h:[...(l.h||[]),`${s} (${new Date().toLocaleDateString('en-IN')})`],log:[...logOf(l),{s,at:now}],escalations:(l.escalations||[]).map(e=>e.resolvedAt?e:{...e,resolvedAt:now,resolvedBy:'System',note:`Stage moved to ${s}`}),disbursed:s==='Disbursed'?Math.max(...ok.map(x=>x.amount)):l.disbursed}))}); audit(get().role||'System',`${id} moved to ${s}`); if(s==='Disbursed'){ const best=ok.reduce((a,b)=>b.amount>a.amount?b:a); const rate=getLenderProfile(best.name).commRate; ensureCommission(id,loan.franchise,best.amount,rate>0?rate:2) }
  if(s==='Query Raised') notifyHO(`${id}: query raised for ${loan.customer}`,'Query Raised')
  if(isMyLoan(loan)) notifyCustomer(`Your application ${id} is now: ${s}.`)
  return null },
 setLender:(id,i,st)=>set({loans:upd(get().loans,id,l=>({...l,lenders:l.lenders.map((x,j)=>j===i?{...x,status:st,submittedOn:x.submittedOn||(st!=='Not Submitted'?new Date().toISOString().slice(0,10):undefined)}:x)}))}),
 setLenderAppId:(id,i,appId)=>set({loans:upd(get().loans,id,l=>({...l,lenders:l.lenders.map((x,j)=>j===i?{...x,appId:appId.trim()}:x)}))}),
 addLender:(id,name)=>set({loans:upd(get().loans,id,l=>({...l,lenders:[...l.lenders,{name,status:'Not Submitted',amount:l.amount}]}))}),
 assignLoan:(id,to,by)=>{ const now=new Date().toISOString(); const who=to||'Unassigned'
  set({loans:upd(get().loans,id,l=>({...l,assignee:to||undefined,assignLog:[...(l.assignLog||[]),{to:who,by,at:now}],h:[...(l.h||[]),`Assigned to ${who}`]}))}); audit(get().role||by,`${id} assigned to ${who}`)
  if(to) notifyHO(`${id} assigned to ${to}`,'File Assigned') },
 addSanction:(id,x)=>{ const l=get().loans.find(y=>y.id===id); if(!l) return
  set({loans:upd(get().loans,id,y=>({...y,sanctions:[...(y.sanctions||[]),x],h:[...(y.h||[]),`Sanction letter uploaded: ${x.lender} (${new Date().toLocaleDateString('en-IN')})`]}))}); audit(get().role||x.by,`${id} sanction letter uploaded (${x.lender})`)
  if(isMyLoan(l)) notifyCustomer(`The sanction letter for ${id} from ${x.lender} is now available.`) },
 removeSanction:(id,sid)=>{ set({loans:upd(get().loans,id,l=>({...l,sanctions:(l.sanctions||[]).filter(x=>x.id!==sid),h:[...(l.h||[]),`Sanction letter removed (${new Date().toLocaleDateString('en-IN')})`]}))}); audit(get().role||'System',`${id} sanction letter removed`) },
 escalate:(id,reason,to,by)=>{ const l=get().loans.find(x=>x.id===id); if(!l) return 'File not found.'; if(!isActive(l)) return 'Only files that are still in progress can be escalated.'
  if(openEscalation(l)) return 'This file already has an open escalation.'
  const e:Escalation={id:'ES-'+Date.now(),at:new Date().toISOString(),by,to,reason,stage:l.stage,stageAt:stageSince(l)||''}
  set({loans:upd(get().loans,id,x=>({...x,escalations:[...(x.escalations||[]),e],h:[...(x.h||[]),`Escalated to ${to} (${new Date().toLocaleDateString('en-IN')})`]}))}); audit(get().role||by,`${id} escalated to ${to}`)
  notifyHO(`${id} (${l.customer}) escalated to ${to}: ${reason}`,'File Escalated'); return null },
 resolveEscalation:(id,eid,note,by)=>{ const now=new Date().toISOString()
  set({loans:upd(get().loans,id,l=>({...l,escalations:(l.escalations||[]).map(e=>e.id===eid?{...e,resolvedAt:now,resolvedBy:by,note}:e),h:[...(l.h||[]),`Escalation resolved (${new Date().toLocaleDateString('en-IN')})`]}))}); audit(get().role||by,`${id} escalation resolved`) },
 runEscalations:()=>{ const hit=get().loans.filter(l=>delayState(l)==='critical'&&!openEscalation(l)&&!(l.escalations||[]).some(e=>e.auto&&e.stageAt===(stageSince(l)||'')))
  if(!hit.length) return
  const now=new Date().toISOString()
  set({loans:get().loans.map(l=>{ if(!hit.includes(l)) return l
   const e:Escalation={id:'ES-'+Date.now()+'-'+l.id,at:now,by:'System',to:'Operations Manager',auto:true,stage:l.stage,stageAt:stageSince(l)||'',reason:`Auto-escalated: ${l.stage} for ${fmtDur(inStageMs(l))}, past the allowed time`}
   return {...l,escalations:[...(l.escalations||[]),e],h:[...(l.h||[]),`Auto-escalated to Operations Manager (${new Date().toLocaleDateString('en-IN')})`]} })})
  hit.forEach(l=>{ audit('System',`${l.id} auto-escalated (${l.stage})`); notifyHO(`${l.id} (${l.customer}) is delayed in ${l.stage} and was auto-escalated`,'File Escalated') }) },
}),{name:'dvp-crm-v2',version:3,migrate:(p:unknown)=>{ const st=p as {loans?:Loan[]}
  if(st&&Array.isArray(st.loans)) st.loans=st.loans.map(l=>{ if(l.log?.length) return l; const seed=SEED_LOANS.find(x=>x.id===l.id); const g=logOf(l); return {...l,log:g.length?g:seed?.log,assignee:l.assignee??seed?.assignee} })
  return st as S } }))
