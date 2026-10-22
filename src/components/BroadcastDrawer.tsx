import { useEffect, useState } from 'react';
import type { GameView } from '../api.ts';
import type { Command } from './GmTable.tsx';
import { Icon } from './Icons.tsx';
export function CountdownLabel({ view }: { view: GameView }) {
  const [now,setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()),1000); return () => clearInterval(timer); },[]);
  if (!view.countdown) return <>Nedräkning</>;
  const seconds = Math.max(0,Math.ceil((Date.parse(view.countdown.deadline)-now)/1000));
  if (view.countdown.paused) return <>Utskick pausade</>;
  return <>{seconds ? `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} kvar` : 'Tiden är slut'}</>;
}
export function BroadcastDrawer({ view, command, onClose }: { view: GameView; command: Command; onClose:()=>void }) {
  const [body,setBody] = useState(''); const [audience,setAudience] = useState<'alive'|'waiting'>('alive'); const [minutes,setMinutes] = useState(5); const [busy,setBusy] = useState(false); const [sent,setSent] = useState(false);
  const past = view.viewedRound !== view.game.round;
  return <aside className="drawer" aria-label="Broadcasts och nedräkning"><div className="drawer-heading"><div><small>UTSKICK FRÅN SPELLEDNINGEN</small><h2>Broadcasts och påminnelser</h2></div><button className="icon-button" aria-label="Stäng utskick" onClick={onClose}><Icon name="close"/></button></div><div className="drawer-content">
    <h3>Manuellt utskick</h3><p className="help">Skickas till varje mottagares personliga GM-chatt.</p><form className="broadcast-form" onSubmit={async e => { e.preventDefault(); setBusy(true); setSent(false); try { await command('/broadcast',{body,audience}); setBody(''); setSent(true); } catch { /* global alert retains draft */ } finally { setBusy(false); } }}><label>Mottagare<select value={audience} onChange={e => setAudience(e.target.value as 'alive'|'waiting')}><option value="alive">Alla levande spelare</option><option value="waiting" disabled={view.game.phase !== 1}>Bara de som saknar nattval</option></select></label><label>Meddelande<textarea rows={4} value={body} required onChange={e => setBody(e.target.value)} placeholder="Meddelande från spelledningen…"/></label><button className="primary" disabled={busy || past || !body.trim()}>Skicka broadcast</button>{sent && <p className="help" role="status">Utskicket har skickats.</p>}</form>
    <h3>Nattens nedräkning</h3><p className="help">Automatiska påminnelser vid 3 minuter, 1 minut och när tiden är slut. Bara levande spelare som saknar val får påminnelsen. GM byter alltid fas manuellt.</p>
    {view.countdown && <p className="timer-state"><CountdownLabel view={view}/></p>}
    <form className="timer-form" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await command('/countdown',{minutes}); } catch { /* reported */ } finally { setBusy(false); } }}><label>Minuter<input type="number" min={1} max={60} value={minutes} onChange={e => setMinutes(Number(e.target.value))}/></label><button disabled={busy || past || view.game.phase !== 1}>{view.countdown ? 'Starta om' : 'Starta nedräkning'}</button>{view.countdown && <button type="button" disabled={busy || past} onClick={() => void command('/countdown',undefined,'DELETE').catch(() => {})}>Stoppa</button>}</form>
    <p className="help">Nedräkningen sparas på servern. Vid tidsresor i testpartiet pausas utskicken tills du startar en ny nedräkning.</p>
  </div></aside>;
}
