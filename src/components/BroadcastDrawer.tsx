import { useEffect, useState } from 'react';
import type { GameView } from '../api.ts';
import type { Command } from './GmTable.tsx';
import { Icon } from './Icons.tsx';
export function CountdownLabel({ view }: { view: GameView }) {
  const [now,setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()),1000); return () => clearInterval(timer); },[]);
  if (!view.countdown) return <>Nedräkning</>;
  const seconds = Math.max(0,Math.ceil((Date.parse(view.countdown.deadline)-now)/1000));
  if (view.countdown.paused) return <>Nedräkning pausad</>;
  return <>{seconds ? `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} kvar` : 'Tiden är slut'}</>;
}
export function BroadcastDrawer({ view, command, onClose }: { view: GameView; command: Command; onClose:()=>void }) {
  const [body,setBody] = useState(''); const [audience,setAudience] = useState<'alive'|'waiting'>('alive'); const [busy,setBusy] = useState(false); const [sent,setSent] = useState(false);
  const past = view.viewedRound !== view.game.round;
  return <aside className="drawer" aria-label="Broadcast"><div className="drawer-heading"><div><small>UTSKICK FRÅN SPELLEDNINGEN</small><h2>Broadcast</h2></div><button className="icon-button" aria-label="Stäng utskick" onClick={onClose}><Icon name="close"/></button></div><div className="drawer-content">
    <h3>Manuellt utskick</h3><p className="help">Skickas till varje mottagares personliga GM-chatt.</p><form className="broadcast-form" onSubmit={async e => { e.preventDefault(); setBusy(true); setSent(false); try { await command('/broadcast',{body,audience}); setBody(''); setSent(true); } catch { /* global alert retains draft */ } finally { setBusy(false); } }}><label>Mottagare<select value={audience} onChange={e => setAudience(e.target.value as 'alive'|'waiting')}><option value="alive">Alla levande spelare</option><option value="waiting" disabled={view.game.phase !== 1}>Bara de som saknar nattval</option></select></label><label>Meddelande<textarea rows={4} value={body} required onChange={e => setBody(e.target.value)} placeholder="Meddelande från spelledningen…"/></label><button className="primary" disabled={busy || past || !body.trim()}>Skicka broadcast</button>{sent && <p className="help" role="status">Utskicket har skickats.</p>}</form>
  </div></aside>;
}

export function GmCountdown({view,command,busy}:{view:GameView;command:Command;busy:boolean}){
  const [minutes,setMinutes]=useState(5);const disabled=busy||view.viewedRound!==view.game.round||view.game.phase!==1;
  return <form className="gm-countdown" aria-label="Nattens nedräkning" onSubmit={e=>{e.preventDefault();void command('/countdown',{minutes}).catch(()=>{});}}><label>Minuter<input aria-label="Nedräkning i minuter" type="number" min={1} max={60} required value={minutes} disabled={disabled} onChange={e=>setMinutes(Number(e.target.value))}/></label><button disabled={disabled}>{view.countdown?'Starta om':'Starta nedräkning'}</button>{view.countdown&&<><strong><CountdownLabel view={view}/></strong><button type="button" disabled={disabled} onClick={()=>void command('/countdown',undefined,'DELETE').catch(()=>{})}>Stoppa</button></>}</form>;
}
