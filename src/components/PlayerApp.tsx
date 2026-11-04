import { useEffect, useRef, useState } from 'react';
import { api, PHASES, request } from '../api.ts';
import type { GameView, Message, PowerView, RoleView, User } from '../api.ts';
import type { Command } from './GmTable.tsx';
import { messageId } from '../id.ts';
import { PlayerCountdown } from './PlayerCountdown.tsx';
import { PlayerPhoto } from './PlayerPhoto.tsx';
import { CameraPanel } from './CameraPage.tsx';

export function PlayerApp({user,waiting,view,connection,error,busy,command,onRefresh,onError,onLogout}:{user:User;waiting:boolean;view:GameView|null;connection:string;error:string;busy:boolean;command:Command;onRefresh:()=>Promise<void>;onError:(text:string)=>void;onLogout:()=>Promise<void>}) {
  const [tab,setTab]=useState<'role'|'chat'|'players'>('role');
  const [roomId,setRoomId]=useState('');
  const role=view?.roles[0];
  const unread=view?.rooms.reduce((sum,room)=>sum+room.unread,0)??0;
  return <div className={`player-app ${view?.countdown?'has-countdown':''}`} data-theme={view?.game.theme??'jungle'}>
    {view?.countdown&&<PlayerCountdown countdown={view.countdown} finished={role?.finished??false}/>}
    <header className="player-header"><strong>MAFFIA <span>· {user.name}</span></strong><span className="connection" role="status">{connection}</span><button onClick={()=>void onLogout().catch(e=>onError(e.message))}>Logga ut</button></header>
    {error&&<div className="error-banner" role="alert">{error}</div>}
    {view&&role?<>
      <div className="player-phase"><strong>Dygn {view.game.round} · {PHASES[view.game.phase]}</strong><span>{!role.alive?'Du är död':view.game.phase===1?(role.finished?'Alla nattval inskickade':'Nattval återstår'):'Fasen styrs av GM'}</span></div>
      <nav className="player-tabs" aria-label="Spelarmeny"><button aria-pressed={tab==='role'} onClick={()=>setTab('role')}>Min roll & val</button><button className={unread?'has-unread':''} aria-pressed={tab==='chat'} onClick={()=>setTab('chat')}>Chatt {unread>0&&<b className="player-unread-badge">{unread} {unread===1?'nytt':'nya'}</b>}</button><button aria-pressed={tab==='players'} onClick={()=>setTab('players')}>Spelare</button><span className="sr-only" role="status">{unread>0?`${unread} olästa meddelanden. ${view.rooms.filter(room=>room.unread>0).map(room=>`${room.kind==='gm'?'Spelledningen':room.name}: ${room.unread}`).join('. ')}`:''}</span></nav>
      <main className="player-content" hidden={tab!=='role'}>
        <section className="player-card"><p className="eyebrow">{role.team}</p><h1>{role.name}</h1><p>{role.summary}</p><details><summary>Så vinner du</summary><p>{role.win}</p></details></section>
        {role.summoned&&<p className="player-notice">Du är inkallad till spelledningen. Kontakta GM för ditt besked.</p>}
        <p className="player-help">{['Här ser du din roll och dina förmågor. Nattval öppnas när GM startar natten.','Lämna dina nattval nedan. Du kan ändra dem under natten.','GM går igenom nattens handlingar. Dina besked visas på morgonen.','Läs dina besked nedan. Du kan alltid kontakta GM via chatten.'][view.game.phase]}</p>
        {role.powers.map(power=><PlayerPower key={`${view.game.round}-${role.id}-${power.id}`} power={power} role={role} view={view} command={command} busy={busy}/>)}
      </main>
      <section className="player-content" hidden={tab!=='chat'} aria-label="Chattar">
        <div className="player-rooms">{view.rooms.map(room=><button key={room.id} className={room.unread?'has-unread':''} aria-pressed={(roomId||view.rooms[0]?.id)===room.id} onClick={()=>setRoomId(room.id)}><span>{room.kind==='gm'?'Spelledningen':room.name}</span>{room.unread>0&&<b className="player-unread-badge">{room.unread} {room.unread===1?'nytt':'nya'}</b>}</button>)}</div>
        {view.rooms.map(room=><PlayerChat key={room.id} user={user} view={view} room={room} active={tab==='chat'&&(roomId||view.rooms[0]?.id)===room.id} onRefresh={onRefresh} onError={onError}/>)}
      </section>
      <section className="player-content" hidden={tab!=='players'}><div className="player-directory-heading"><h2>Levande spelare · {view.targets.filter(player=>player.alive).length}</h2><a href="/camera">Mitt foto / incheckning</a></div><div className="player-directory">{view.targets.filter(player=>player.alive).map(player=><figure key={player.id}><PlayerPhoto photoId={player.photoId} name={player.name}/><figcaption>{player.name}</figcaption></figure>)}</div></section>
    </>:<main className="player-content">{waiting?<p>Hämtar ditt parti…</p>:<CameraPanel user={user}/>}</main>}
  </div>;
}

function PlayerPower({power,role,view,command,busy}:{power:PowerView;role:RoleView;view:GameView;command:Command;busy:boolean}) {
  const [draft,setDraft]=useState(power.action?.targetId??power.action?.value??'');
  const [dirty,setDirty]=useState(false); const [saved,setSaved]=useState(false);
  const target=power.type==='player-kill'||power.type==='player-other';
  const current=power.action?.targetId??power.action?.value??'';
  useEffect(()=>{if(!dirty)setDraft(current);},[current,dirty]);
  const editable=role.alive&&view.game.phase===1&&power.enabled&&power.type!=='None';
  const chosen=target?view.targets.find(player=>player.id===(editable?draft:power.action?.targetId)):undefined;
  const targetPreview=chosen?<div className="target-photo"><PlayerPhoto photoId={chosen.photoId} name={chosen.name}/><span><small>Vald spelare</small><strong>{chosen.name}</strong></span></div>:null;
  async function save(){try{await command(`/roles/${role.id}/powers/${power.id}/action`,{value:target?(draft==='Ingen'?'Ingen':view.targets.find(t=>t.id===draft)?.name??''):draft,targetId:target&&draft!=='Ingen'?draft:null});setDirty(false);setSaved(true);}catch{/* root displays error, keep draft */}}
  return <section className="player-card player-power"><div className="player-power-title"><h2>{power.name}</h2>{power.groupId&&<span className="test-badge">GRUPPFÖRMÅGA</span>}</div><p>{power.description}</p>
    {!power.enabled?<p className="player-help">Inte tillgänglig just nu.</p>:<>
      {power.action?.value&&<p className="player-choice">Inskickat: <strong>{power.action.value}</strong>{power.groupId&&<span> · {power.action.executorId===role.id?'Du utför handlingen':'En annan i gruppen utför handlingen'}</span>}</p>}
      {editable&&<form onSubmit={e=>{e.preventDefault();void save();}}><label>Ditt val{power.type==='Text'?<textarea rows={3} maxLength={4000} disabled={busy} value={draft} onChange={e=>{setDraft(e.target.value);setDirty(true);setSaved(false);}}/>:<select disabled={busy} value={draft} onChange={e=>{setDraft(e.target.value);setDirty(true);setSaved(false);}}><option value="" disabled>Välj…</option>{target?<><option value="Ingen">Ingen</option>{view.targets.filter(t=>t.alive||t.id===power.action?.targetId).map(t=><option key={t.id} value={t.id} disabled={!t.alive}>{t.name}{!t.alive?' (död)':''}</option>)}</>:<><option>Ja</option><option>Nej</option></>}</select>}</label>{targetPreview}<button className="primary" disabled={busy||!draft.trim()}>{busy?'Sparar…':power.groupId&&power.action&&power.action.executorId!==role.id?'Spara – jag utför':'Spara nattval'}</button>{saved&&!dirty&&<span role="status">Sparat</span>}{dirty&&<span className="player-help">Osparat utkast</span>}</form>}
      {!editable&&targetPreview}
      {power.type==='None'&&<p className="player-help">Du behöver inte skicka in något val.</p>}
      {power.action?.response&&<div className="player-response"><strong>Besked från GM</strong><p>{power.action.response}</p></div>}
    </>}
  </section>;
}

function PlayerChat({user,view,room,active,onRefresh,onError}:{user:User;view:GameView;room:GameView['rooms'][number];active:boolean;onRefresh:()=>Promise<void>;onError:(text:string)=>void}) {
  const [messages,setMessages]=useState<Message[]>([]);const [draft,setDraft]=useState('');const [sending,setSending]=useState(false);
  const pending=useRef<{id:string;body:string}|null>(null);
  const closed=view.game.phase===3&&room.kind==='group';
  useEffect(()=>{
    if(!active)return;let cancelled=false;
    async function load(){try{const data=await api.messages(view.game.id,room.id);if(cancelled)return;setMessages(data);const last=data.at(-1);if(last&&room.unread&&document.visibilityState==='visible'){await request(`/games/${view.game.id}/rooms/${room.id}/read`,'PUT',{messageId:last.id});if(!cancelled)await onRefresh();}}catch(e){if(!cancelled)onError(e instanceof Error?e.message:'Kunde inte läsa chatten.');}}
    const visible=()=>{if(document.visibilityState==='visible')void load();};
    void load();document.addEventListener('visibilitychange',visible);return()=>{cancelled=true;document.removeEventListener('visibilitychange',visible);};
  },[active,view.game.id,room.id,view.revision,room.unread]);
  async function send(){if(sending||!draft.trim()||closed)return;setSending(true);try{if(!pending.current||pending.current.body!==draft.trim())pending.current={id:messageId(),body:draft.trim()};await request(`/games/${view.game.id}/rooms/${room.id}/messages`,'POST',{body:pending.current.body,clientId:pending.current.id});pending.current=null;setDraft('');await onRefresh();}catch(e){onError(e instanceof Error?e.message:'Kunde inte skicka.');}finally{setSending(false);}}
  return <div hidden={!active}>
    {closed&&<p className="player-notice">Gruppchatten är stängd under morgonen. Du kan skriva till spelledningen.</p>}
    <form className="player-compose" onSubmit={e=>{e.preventDefault();void send();}}><label>Meddelande<textarea rows={2} maxLength={4000} value={draft} disabled={closed} readOnly={sending} enterKeyHint="send" aria-describedby={`chat-help-${room.id}`} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!e.repeat)void send();}}} placeholder="Skriv till chatten…"/></label><button className="primary" disabled={closed||sending||!draft.trim()}>{sending?'Skickar…':'Skicka'}</button><p className="player-help" id={`chat-help-${room.id}`}>Enter skickar · Shift+Enter ger ny rad</p></form>
    <p className="player-help player-message-order">Senaste meddelandet först</p>
    <div className="player-messages" aria-live="polite">{!messages.length&&<p className="player-help">Inga meddelanden ännu.</p>}{[...messages].reverse().map(message=>{const own=message.senderId===user.id;return <article key={message.id} className={`message ${own?'from-self':message.admin?'from-gm':''}`}><header><strong>{own?`Du · ${message.senderName}`:message.senderName}</strong><time>Dygn {message.round} · {new Date(message.time).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})}</time></header><p>{message.body}</p></article>;})}</div>
  </div>;
}
