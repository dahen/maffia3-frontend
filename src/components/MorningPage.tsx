import { useState } from 'react';
import type { GameView, RoleView } from '../api.ts';
type MorningDeath=GameView['morning'][number];

function MorningCard({role,death,read,onRead}:{role:RoleView;death?:MorningDeath;read:boolean;onRead:(checked:boolean)=>void}) {
  return <article className={`morning-card ${read?'read':''}`}>
    <header><h2>{role.player}</h2><label><input type="checkbox" checked={read} onChange={e=>onRead(e.target.checked)}/>Genomgånget</label></header>
    <p className="morning-role">{role.name} · {role.team}</p>
    {death&&<p className="morning-cause"><strong>Dödsorsak:</strong> {death.reason}{death.source&&<><br/>Utförare: {death.source.actorPlayer} ({death.source.actorRole}) · {death.source.powerName}</>}</p>}
    {role.morningNotes.trim()&&<div className="morning-note"><span>MORGONANTECKNING</span><p className="readout">{role.morningNotes}</p></div>}
    {death?.clue&&<blockquote className="readout">{death.clue}</blockquote>}
    {death&&!death.clue&&!role.morningNotes.trim()&&<p className="help">Ingen färdig ledtråd skriven. Använd rollinformationen som stöd.</p>}
    <details className="morning-role-details" open><summary>Fullständig rollinfo för GM</summary><p>{role.summary}</p><h3>Vinstvillkor</h3><p>{role.win}</p>{role.powers.map(p=><div key={p.id}><h3>{p.name}</h3><p>{p.description}</p></div>)}{role.gmHint&&<><h3>GM-hjälp</h3><p>{role.gmHint}</p></>}</details>
  </article>;
}
export function MorningPage({view}:{view:GameView}) {
  const [read,setRead]=useState<Set<string>>(new Set());
  const deaths=view.morning;
  const otherNotes=view.roles.filter(r=>r.morningNotes.trim()&&!deaths.some(d=>d.roleId===r.id));
  const people=[...deaths.map(d=>d.roleId),...otherNotes.map(r=>r.id)];
  function mark(roleId:string,checked:boolean){setRead(previous=>{const next=new Set(previous);if(checked)next.add(roleId);else next.delete(roleId);return next;});}
  return <main className="morning-page">
    <header className="morning-heading"><p className="eyebrow">ENDAST FÖR SPELLEDNINGEN</p><h1>Morgon · dygn {view.viewedRound}</h1><p>Dödsfall, morgonanteckningar och rollinformation som stöd för vad du vill berätta.</p>{view.viewedPhase!==3&&<span className="morning-preview">Förberedelse · GM har ännu inte bytt till morgon.</span>}</header>
    <div className="morning-progress">{people.filter(id=>read.has(id)).length} av {people.length} personer genomgångna</div>
    {(['night','day'] as const).map(cause=><section className="morning-section" key={cause}><h2>{cause==='night'?'Nattens dödsfall':'Dagens dödsfall före natten'}</h2>
      {deaths.filter(d=>cause==='night'?d.cause==='night':d.cause!=='night').map(death=>{const role=view.roles.find(r=>r.id===death.roleId);return role?<MorningCard key={role.id} role={role} death={death} read={read.has(role.id)} onRead={checked=>mark(role.id,checked)}/>:null;})}
      {!deaths.some(d=>cause==='night'?d.cause==='night':d.cause!=='night')&&<p className="help">Inga {cause==='night'?'nattliga dödsfall':'dödsfall under dagen'} registrerade för det här dygnet.</p>}
    </section>)}
    {otherNotes.length>0&&<section className="morning-section"><h2>Övriga morgonanteckningar</h2>{otherNotes.map(role=><MorningCard key={role.id} role={role} read={read.has(role.id)} onRead={checked=>mark(role.id,checked)}/>)}</section>}
    {view.dayOutcome==='none'&&<p className="day-outcome-none">GM har bekräftat att ingen dog under dagen.</p>}
    {!people.length&&<div className="morning-empty"><p>Skriv i anteckningstypen Morgon i tabellen eller registrera ett dödsfall för att förbereda morgonens läsunderlag.</p></div>}
  </main>;
}
