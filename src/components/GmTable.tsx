import { useRef, useState } from 'react';
import type { GameView, RoleView, PowerView } from '../api.ts';
import { SavedField } from './SavedField.tsx';
import { Icon } from './Icons.tsx';
import { teamColors } from '../teams.ts';
import { targetsPlayer } from '../../../maffia3-backend/src/contracts.ts';
import { RoleNotes } from './RoleNotes.tsx';
export type Command = (path: string, body?: unknown, method?: string) => Promise<void>;
export function ActionInput({ role, power, view, command, disabled = false }: { role: RoleView; power: PowerView; view: GameView; command: Command; disabled?: boolean }) {
  const [text, setText] = useState(power.action?.value ?? '');
  const path = `/roles/${role.id}/powers/${power.id}/action`;
  if (power.type === 'None') return <span className="muted">Inget val behövs</span>;
  if (!power.enabled) return <span className="muted">Inte aktiverad</span>;
  if (targetsPlayer(power.type)) return <select aria-label={`Simulera ${power.name} för ${role.player}`} disabled={disabled} value={power.action?.targetId ?? (power.action?.value === 'Ingen' ? 'none' : '')} onChange={e => { if (e.target.value) void command(path, { value: e.target.value === 'none' ? 'Ingen' : '', targetId: e.target.value === 'none' ? null : e.target.value }); }}><option value="">Välj spelare…</option><option value="none">Ingen</option>{view.targets.filter(t => t.alive || t.id === power.action?.targetId).map(t => <option key={t.id} value={t.id} disabled={!t.alive}>{t.name}{t.alive ? '' : ' (död)'}</option>)}</select>;
  if (power.type === 'Yes/No') return <select aria-label={`Simulera ${power.name} för ${role.player}`} disabled={disabled} value={power.action?.value ?? ''} onChange={e => { if (e.target.value) void command(path, { value: e.target.value }); }}><option value="">Välj…</option><option>Ja</option><option>Nej</option></select>;
  return <form className="text-action" onSubmit={e => { e.preventDefault(); void command(path, { value: text }); }}><input aria-label={`Simulera ${power.name} för ${role.player}`} value={text} onChange={e => setText(e.target.value)} placeholder="Skriv ett val…" disabled={disabled}/><button disabled={disabled || !text.trim()} title="Lämna in">↵</button></form>;
}
export function GmTable({ view, visibleRoles, command, simulate, busy, onRole, onChat }: { view: GameView; visibleRoles: RoleView[]; command: Command; simulate: boolean; busy: boolean; onRole: (role: RoleView) => void; onChat: (room: string) => void }) {
  const past = view.viewedRound !== view.game.round; const phase = view.viewedPhase;
  const showResponse = phase === 2 || phase === 3;
  const colors = teamColors(view.roles.map(r => r.team));
  const table = useRef<HTMLTableElement>(null);
  const responseOrder = new Map(view.roles.flatMap(r=>r.powers.map(p=>p.id)).map((id,index)=>[id,index]));
  function nextResponse(source:HTMLElement) {
    const order=Number(source.dataset.gmOrder);
    requestAnimationFrame(()=>{
      const fields=Array.from(table.current?.querySelectorAll<HTMLInputElement>('input[data-gm-order]:not(:disabled)')??[]);
      // Stable order across all roles also works when a completed role disappears from a filter.
      const next=fields.find(field=>Number(field.dataset.gmOrder)>order);
      if(next){next.focus();next.select();next.scrollIntoView({block:'nearest'});}else if(source.isConnected)source.focus();
    });
  }
  return <div className="table-wrap"><table ref={table} className="gm-table"><colgroup><col style={{width:'5%'}}/><col style={{width:'15%'}}/><col style={{width:'13%'}}/><col style={{width:'13%'}}/><col style={{width:'15%'}}/><col style={{width:'17%'}}/><col style={{width:'16%'}}/><col style={{width:'6%'}}/></colgroup>
    <thead><tr><th>Status</th><th>Spelare / roll</th><th>Inkommande</th><th>Förmåga</th><th>{simulate && !past && phase === 1 ? 'Simulera spelarens val' : 'Spelarens val'}</th><th>GM-besked</th><th>Anteckningar</th><th>GM-status</th></tr></thead>
    <tbody>{visibleRoles.flatMap((role, roleIndex) => {
      const room = view.rooms.find(r => r.kind === 'gm' && r.roleIds.includes(role.id));
      const incoming = view.roles.flatMap(actor => actor.powers.filter(p => p.action?.targetId === role.id && (!p.groupId || p.action.executorId === actor.id)).map(p => ({ actor, power: p })));
      const finished = showResponse ? role.gmFinished : role.finished;
      const death = view.morning.find(d => d.roleId === role.id);
      const powers = role.powers.length ? role.powers : [null];
      return powers.map((p, powerIndex) => <tr key={`${role.id}-${p?.id ?? 'none'}`} className={`role-row ${roleIndex % 2 ? 'role-even' : ''} ${powerIndex === 0 ? 'role-start' : ''} ${powerIndex === powers.length - 1 ? 'role-end' : ''} ${!role.alive ? 'dead-row' : ''} ${role.blocked ? 'blocked-row' : ''}`}>
        {powerIndex === 0 && <>
          <td rowSpan={powers.length} className="role-cell"><span className={`completion ${!role.alive ? 'out' : phase === 0 ? 'ready' : finished ? 'done' : 'waiting'}`}>{!role.alive ? 'Ute' : phase === 0 ? 'Med' : finished ? 'Klar' : 'Väntar'}</span></td>
          <td rowSpan={powers.length} className="role-cell"><div className="identity"><span className="team-dot" style={{backgroundColor:colors.get(role.team)}} title={role.team}/><button className="name-button" onClick={() => onRole(role)}>{role.player}</button>{room && <button className={`chat-button ${room.unread ? 'has-unread' : ''}`} aria-label={`Chatt med ${role.player}${room.unread ? `, ${room.unread} olästa` : ''}`} onClick={() => onChat(room.id)}><Icon name="chat" size={13}/>{room.unread > 0 && <b>{room.unread}</b>}</button>}</div><div className="role-name">{role.name} <span className="team-name">· {role.team}</span></div>{role.notes && <div className="row-note" title={`Bestående: ${role.notes}`}>Fast: {role.notes}</div>}{role.roundNotes && <div className="row-note round-note" title={`Dygn ${view.viewedRound}: ${role.roundNotes}`}>D{view.viewedRound}: {role.roundNotes}</div>}{role.morningNotes && <div className="row-note morning-note-summary" title={`Morgon: ${role.morningNotes}`}>Morgon: {role.morningNotes}</div>}</td>
          <td rowSpan={powers.length} className="role-cell">{incoming.length ? incoming.map(({ actor, power }) => <div key={`${actor.id}-${power.id}`} className={`incoming ${actor.blocked ? 'ineffective' : ''}`} title={actor.blocked ? 'Aktören är blockerad. GM avgör effekten.' : power.name}><strong>{actor.player}</strong><span>{power.name}{actor.blocked ? ' · blockerad' : ''}</span>{power.type === 'player-kill' && (death?.source?.actorRoleId === actor.id && death.source.powerId === power.id ? <small className="confirmed-kill">Dödsorsak bekräftad</small> : role.alive && <button className="confirm-kill" disabled={past || busy || phase === 0} aria-label={`Bekräfta att ${role.player} dött av ${actor.player}s ${power.name}`} onClick={() => void command('/deaths/confirm-kill', {targetRoleId:role.id,actorRoleId:actor.id,powerId:power.id})}>Bekräfta död</button>)}</div>) : <span className="muted">—</span>}{death && <p className="death-cause">Död: {death.reason}{death.source ? ` · ${death.source.actorPlayer}` : ''}</p>}</td>
        </>}
        <td className="ability-cell"><div className="power-line">{p ? <><span title={p.description}>{p.name}</span>{p.type === 'player-kill' && <span className="tiny-label kill-tag" title="Dödande förmåga: player-kill">dödande</span>}{p.groupId && <span className="tiny-label" title="Gemensamt val">grupp</span>}{p.conditional && <button className={`conditional ${p.enabled ? 'enabled' : ''}`} disabled={past || busy} aria-label={`${p.enabled ? 'Inaktivera' : 'Aktivera'} ${p.name} för ${role.player}`} title={p.enabled ? 'Aktiverad – klicka för att stänga av' : 'Klicka för att aktivera'} onClick={() => void command(`/roles/${role.id}/powers/${p.id}/enabled`, { enabled: !p.enabled }, 'PUT')}>{p.enabled ? 'På' : 'Av'}</button>}</> : <span className="muted">Inga förmågor</span>}</div></td>
        <td className="ability-cell"><div className="power-line action-line">{p ? <>{simulate && !past && phase === 1 && role.alive ? <ActionInput role={role} power={p} view={view} command={command} disabled={busy}/> : <span className={!p.enabled || p.type === 'None' ? 'muted' : !p.action?.value ? 'missing-value' : ''}>{!p.enabled ? 'Inte aktiverad' : p.type === 'None' ? 'Inget val behövs' : p.action?.value || 'Ej inskickat'}</span>}{p.groupId && p.action?.value && <small className="executor">av {view.roles.find(r => r.id === p.action?.executorId)?.player ?? 'gruppen'}</small>}</> : <span className="muted">—</span>}</div></td>
        <td className="ability-cell"><div className="power-line response-line">{p ? p.gmResponse && p.enabled && (p.type === 'None' || p.action?.value) ? showResponse ? <SavedField highlightEmpty={phase === 2 && !past && role.alive} navigationOrder={responseOrder.get(p.id)} onEnterSaved={nextResponse} label={`GM-besked till ${role.player}: ${p.name}`} placeholder="Skriv besked…" value={p.action?.response ?? ''} disabled={past} save={response => command(`/roles/${role.id}/powers/${p.id}/response`, { response, expectedValue: p.action?.value ?? null }, 'PUT')}/> : <span className="muted">Skrivs i gryningen</span> : <span className="muted">{p.gmResponse && p.enabled ? 'Väntar på val' : 'Inget besked behövs'}</span> : <span className="muted">—</span>}</div></td>
        {powerIndex === 0 && <><td rowSpan={powers.length} className="role-cell notes-cell"><RoleNotes role={role} round={view.viewedRound} disabled={past} command={command}/></td><td rowSpan={powers.length} className="role-cell"><div className="flag-buttons"><button className={role.blocked ? 'flag active-blocked' : 'flag'} disabled={past || busy || !role.alive} aria-label={`${role.blocked ? 'Avblockera' : 'Blockera'} ${role.player}`} title="Blockerad – endast synligt för GM" onClick={() => void command(`/roles/${role.id}`, { blocked: !role.blocked }, 'PATCH')}>B</button><button className={role.summoned ? 'flag active-summoned' : 'flag'} disabled={past || busy || !role.alive} aria-label={`${role.summoned ? 'Avsluta inkallning av' : 'Kalla in'} ${role.player}`} title="Inkallad – spelaren ser detta på morgonen" onClick={() => void command(`/roles/${role.id}`, { summoned: !role.summoned }, 'PATCH')}>I</button></div></td></>}
      </tr>);
    })}</tbody>
  </table>{visibleRoles.length === 0 && <p className="empty">Inga spelare matchar sökningen.</p>}</div>;
}
