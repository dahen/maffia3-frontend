import { useState } from 'react';
import type { GameView } from '../api.ts';
import type { Command } from './GmTable.tsx';
import { Icon } from './Icons.tsx';

export function DayDeathsDrawer({view,command,onClose}:{view:GameView;command:Command;onClose:()=>void}) {
  const [selected,setSelected]=useState<string[]>([]);const [cause,setCause]=useState<'lynch'|'day'>('lynch');const [reason,setReason]=useState('Utröstning');const [busy,setBusy]=useState(false);
  const deaths=view.morning.filter(d=>d.cause!=='night');
  const disabled=view.viewedRound!==view.game.round||view.game.phase!==0||busy;
  return <aside className="drawer" aria-label="Dagens dödsfall"><div className="drawer-heading"><div><small>MÖTE · DYGN {view.viewedRound}</small><h2>Dagens dödsfall</h2></div><button className="icon-button" aria-label="Stäng dagens dödsfall" onClick={onClose}><Icon name="close"/></button></div><div className="drawer-content">
    <p className="help">Registrera vilka som dött före natten och varför. Det följer med till loggen och morgonens läsunderlag.</p>
    {deaths.length>0&&<section className="registered-deaths"><h3>Registrerat idag</h3>{deaths.map(d=><div key={d.roleId}><span><strong>{d.player}</strong> · {d.reason}</span><button disabled={disabled} onClick={()=>void command(`/roles/${d.roleId}`,{alive:true},'PATCH').catch(()=>{})}>Ångra</button></div>)}</section>}
    {view.dayOutcome==='none'&&<p className="day-outcome-none" role="status">Registrerat: ingen dog under dagen.</p>}
    <form className="day-deaths-form" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await command('/day-outcome',{outcome:'deaths',roleIds:selected,reason,cause});setSelected([]);}catch{/* reported */}finally{setBusy(false);}}}>
      <h3>Välj en eller flera spelare</h3><fieldset className="day-player-list" disabled={disabled}>{view.roles.filter(r=>r.alive).map(r=><label key={r.id}><input type="checkbox" checked={selected.includes(r.id)} onChange={e=>setSelected(values=>e.target.checked?[...values,r.id]:values.filter(id=>id!==r.id))}/><span>{r.player}<small>{r.name}</small></span></label>)}</fieldset>
      <label>Hur dog de?<select value={cause} disabled={disabled} onChange={e=>{const value=e.target.value as 'lynch'|'day';setCause(value);setReason(value==='lynch'?'Utröstning':'');}}><option value="lynch">Utröstning / hängning</option><option value="day">Annan dödsorsak</option></select></label>
      <label>Dödsorsak<input value={reason} disabled={disabled} required placeholder="Beskriv dödsorsaken…" onChange={e=>setReason(e.target.value)}/></label>
      <button className="primary" disabled={disabled||!selected.length||!reason.trim()}>Registrera {selected.length?`${selected.length} dödsfall`:'dödsfall'}</button>
    </form>
    <div className="day-none-action"><button disabled={disabled||deaths.length>0} onClick={async()=>{setBusy(true);try{await command('/day-outcome',{outcome:'none'});}catch{/* reported */}finally{setBusy(false);}}}>Ingen dog under dagen</button><p className="help">Ett uttryckligt besked som sparas i partihistoriken.</p></div>
  </div></aside>;
}
