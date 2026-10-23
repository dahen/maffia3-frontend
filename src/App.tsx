import { useCallback, useEffect, useRef, useState } from 'react';
import { api, request, PHASES, ApiError } from './api.ts';
import type { GameView, GameSummary, User } from './api.ts';
import { GmTable, type Command } from './components/GmTable.tsx';
import { ChatDrawer } from './components/ChatDrawer.tsx';
import { PlayerApp } from './components/PlayerApp.tsx';
import { RoleDrawer } from './components/RoleDrawer.tsx';
import { SavedField } from './components/SavedField.tsx';
import { Icon } from './components/Icons.tsx';
import { teamColors } from './teams.ts';
import { BroadcastDrawer, CountdownLabel } from './components/BroadcastDrawer.tsx';
import { LogPage } from './components/LogPage.tsx';
import { MorningPage } from './components/MorningPage.tsx';
import { DayDeathsDrawer } from './components/DayDeathsDrawer.tsx';
import { PhaseStatus, PhaseChangeDialog } from './components/PhaseStatus.tsx';
import type { PhaseGuard } from '../../maffia3-backend/src/readiness.ts';

export default function App() {
  const [user, setUser] = useState<User | null>(null); const [checking, setChecking] = useState(true); const [games, setGames] = useState<GameSummary[]>([]);
  const [gameId, setGameId] = useState(() => localStorage.getItem('maffia3.game') || ''); const [view, setView] = useState<GameView | null>(null);
  const [round, setRound] = useState(0); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [connection, setConnection] = useState('Ansluter');
  const [simulate, setSimulate] = useState(true); const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all');
  const [drawer, setDrawer] = useState<{ type: 'chat' | 'role' | 'history' | 'new' | 'broadcast' | 'day-deaths'; id?: string } | null>(null); const [notesOpen, setNotesOpen] = useState(false); const [toast, setToast] = useState('');
  const [phaseGuard,setPhaseGuard]=useState<PhaseGuard|null>(null);
  const [page,setPage] = useState<'gm'|'log'|'morning'>('gm');
  const [epoch,setEpoch] = useState(0);
  const sequence = useRef(0); const saving = useRef(false);
  const refreshGames = useCallback(async () => { const data = (await api.games()).sort((a,b) => a.players - b.players); setGames(data); setGameId(current => data.some(g => g.id === current) ? current : data[0]?.id ?? ''); }, []);
  useEffect(() => { api.session().then(s => setUser(s.user)).catch(e => setError(e.message)).finally(() => setChecking(false)); }, []);
  useEffect(() => { if (user) void refreshGames().catch(e => setError(e.message)); }, [user, refreshGames]);
  const reload = useCallback(async () => {
    if (!gameId) return; const ticket = ++sequence.current;
    let data: GameView;
    try { data = await api.view(gameId, round); }
    catch (e) { if (round) { setRound(0); return; } throw e; }
    if (ticket === sequence.current) { setView(data); setGames(current => current.map(g => g.id === data.game.id ? data.game : g)); }
  }, [gameId, round]);
  useEffect(() => { if (user && gameId) void reload().catch(e => setError(e.message)); }, [user, gameId, reload]);
  useEffect(() => { setView(null); setRound(0); setDrawer(null); setPhaseGuard(null); setSearch(''); setFilter('all'); localStorage.setItem('maffia3.game', gameId); }, [gameId]);
  useEffect(() => {
    if (!user || !gameId) return;
    const source = new EventSource(`/api/games/${gameId}/events`); let timeout: ReturnType<typeof setTimeout> | undefined;
    const update = () => { clearTimeout(timeout); timeout = setTimeout(() => void reload().catch(e => setError(e.message)), 80); };
    source.onopen = () => { setConnection('Live'); update(); }; source.onerror = () => setConnection('Återansluter'); source.addEventListener('change', update);
    source.addEventListener('expired', () => { source.close(); setUser(null); setView(null); setError('Sessionen gick ut. Logga in igen.'); });
    const visible = () => { if (document.visibilityState === 'visible') update(); }; document.addEventListener('visibilitychange', visible);
    return () => { source.close(); clearTimeout(timeout); document.removeEventListener('visibilitychange', visible); };
  }, [user, gameId, reload]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { const listener = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(null); }; document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener); }, []);
  const command: Command = useCallback(async (path, body, method = 'POST') => {
    if (saving.current) throw new Error('Ett annat val sparas. Försök igen.');
    saving.current = true; setBusy(true); setError('');
    try { await request(`/games/${gameId}${path}`, method, body); await reload(); if (path === '/navigate' || path === '/jump' || path === '/next-round') setEpoch(e => e+1); }
    catch (e) { const message = e instanceof Error ? e.message : 'Kunde inte spara.'; if(e instanceof ApiError && e.phaseGuard)setPhaseGuard(e.phaseGuard);else setError(message); throw e; }
    finally { saving.current = false; setBusy(false); }
  }, [gameId, reload]);
  // Event handlers report failures through the global alert. SavedField awaits and retains its own draft.
  const safeCommand: Command = useCallback(async (...args) => { try { await command(...args); } catch { /* alert already set */ } }, [command]);
  async function changePhase(phase:number,overrideToken?:string){ if(!view)return;try{await command('/phase',{phase,expectedPhase:overrideToken?phaseGuard?.fromPhase:view.game.phase,overrideToken});setPhaseGuard(null);}catch(e){if(!(e instanceof ApiError&&e.phaseGuard))setPhaseGuard(null);} }
  async function login(name: string, pin: string) { setError(''); try { setUser(await api.login(name, pin)); } catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte logga in.'); } }
  async function doLogout() { await api.logout(); setPhaseGuard(null); setUser(null); setView(null); setGames([]); }
  if (checking) return <main className="loading-screen">Laddar Maffia…</main>;
  if (!user) return <Login onLogin={login} error={error}/>;
  if (!user.admin) return <PlayerApp key={gameId} user={user} games={games} gameId={gameId} view={view} connection={connection} error={error} busy={busy} onGame={setGameId} command={command} onRefresh={reload} onError={setError} onLogout={doLogout}/>;
  const past = Boolean(view && view.viewedRound !== view.game.round);
  const alive = view?.roles.filter(r => r.alive) ?? []; const done = alive.filter(r => view && view.game.phase >= 2 ? r.gmFinished : r.finished).length;
  const unread = view?.rooms.reduce((sum,r) => sum + r.unread, 0) ?? 0;
  const filteredView = view ? { ...view, roles: view.roles.filter(r => (!search || `${r.player} ${r.name} ${r.team}`.toLocaleLowerCase('sv').includes(search.toLocaleLowerCase('sv'))) && (filter === 'all' || (filter === 'waiting' && r.alive && !(view.game.phase >= 2 ? r.gmFinished : r.finished)) || (filter === 'blocked' && r.blocked) || (filter === 'alive' && r.alive) || (filter === 'dead' && !r.alive))) } : null;
  const selectedRole = view?.roles.find(r => r.id === drawer?.id);
  const yesNo = view?.roles.flatMap(r => r.powers.filter(p => p.type === 'Yes/No' && p.enabled).map(p => p.action?.value)) ?? [];
  return <div className="app" data-theme={view?.game.theme ?? 'jungle'}>
    <header className="topbar"><div className="brand"><span className="brand-icon"><Icon name="leaf" size={20}/></span><strong>MAFFIA</strong><span className="brand-divider"/><nav className="page-nav" aria-label="Huvudmeny"><button className={page === 'gm' ? 'active' : ''} onClick={() => { setPage('gm'); setDrawer(null); }}>Spelöversikt</button><button className={page === 'morning' ? 'active' : ''} onClick={() => { setPage('morning'); setDrawer(null); }}>Morgon</button><button className={page === 'log' ? 'active' : ''} onClick={() => { setPage('log'); setDrawer(null); }}>Logg</button></nav></div><div className="topbar-right"><span className={`connection ${connection === 'Live' ? 'connected' : ''}`}><i/>{connection}</span><button className="quiet" onClick={() => void doLogout()}>{user.name} · Logga ut</button></div></header>
    <div className="gamebar"><div className="game-picker"><label htmlFor="game">Parti</label><select id="game" value={gameId} onChange={e => setGameId(e.target.value)}>{games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>{view && <span className="test-badge">{view.game.mode === 'test' ? 'TESTPARTI' : 'SKARPT PARTI'}</span>}</div><div className="gamebar-tools"><select aria-label="Tema" value={view?.game.theme ?? 'jungle'} disabled={busy || !view || past} onChange={e => void safeCommand('/theme', { theme: e.target.value }, 'PUT')}><option value="jungle">Djungel</option><option value="classic">Klassiskt</option></select><button className="quiet" onClick={() => setDrawer({type:'new'})}>+ Nytt testparti</button></div></div>
    {error && <div className="error-banner" role="alert"><span>{error}</span><button aria-label="Stäng felmeddelande" onClick={() => setError('')}><Icon name="close" size={14}/></button></div>}
    {!view ? <main className="loading-screen">{games.length ? 'Hämtar spelöversikt…' : 'Inga partier ännu. Skapa ett testparti.'}</main> : <>
      <div className={`phasebar ${page !== 'gm' ? 'secondary-page-phasebar' : ''}`}><div className="round-number"><small>AKTUELLT</small><strong>Dygn {view.game.round}</strong></div><div className="phases">{PHASES.map((p,i) => <button key={p} className={i === view.game.phase ? 'selected' : ''} aria-current={i === view.game.phase ? 'step' : undefined} disabled={busy || past} onClick={() => void changePhase(i)}><span>{i+1}</span>{p}</button>)}</div><button className="next-round" disabled={busy || past || view.game.phase !== 3} onClick={() => void safeCommand('/next-round')} title="Startar nytt dygn. All tidigare historik bevaras.">Nytt dygn <Icon name="forward" size={14}/></button><div className="timeline-controls">{view.game.mode === 'test' && <><button aria-label="Stega bakåt" title="Stega bakåt i testpartiet" disabled={busy || !view.canUndo || past} onClick={() => void safeCommand('/navigate', {direction:'back',revision:view.revision})}><Icon name="back"/></button><button aria-label="Stega framåt" title="Stega framåt längs sparad gren" disabled={busy || !view.canRedo || past} onClick={() => void safeCommand('/navigate', {direction:'forward',revision:view.revision})}><Icon name="forward"/></button></>}<button className={drawer?.type === 'history' ? 'selected' : ''} onClick={() => setDrawer(drawer?.type === 'history' ? null : {type:'history'})}><Icon name="history" size={14}/><span>Historik</span></button></div></div>
      {page === 'gm' && <><PhaseStatus view={view} busy={busy} onNext={phase=>void changePhase(phase)} onPending={()=>{setFilter('waiting');setSearch('');setDrawer(null);}}/><div className="workbar"><div className="workbar-title"><h1>Spelöversikt</h1><span>{alive.length} levande</span><span className="progress-text">{done}/{alive.length} {view.game.phase >= 2 ? 'besked klara' : 'klara'}</span></div><div className="workbar-tools"><input className="search" type="search" placeholder="Sök spelare eller roll…" aria-label="Sök spelare eller roll" value={search} onChange={e => setSearch(e.target.value)}/><select value={filter} aria-label="Filtrera spelare" onChange={e => setFilter(e.target.value)}><option value="all">Alla spelare</option><option value="waiting">Väntar</option><option value="blocked">Blockerade</option><option value="alive">Levande</option><option value="dead">Döda</option></select></div></div>
      <div className="simulation-bar"><div className="simulation-left">{view.game.phase === 0 && <button className="day-outcome-button" onClick={() => setDrawer({type:'day-deaths'})}>{view.dayOutcome === 'none' ? 'Ingen dog idag · Ändra' : view.dayOutcome === 'deaths' ? 'Dagens dödsfall · Ändra' : 'Registrera dagens utfall'}</button>}{view.game.mode === 'test' ? <><label className="simulation-toggle"><input type="checkbox" checked={simulate} onChange={e => setSimulate(e.target.checked)}/><Icon name="play" size={12}/>Simulera spelare</label><button className="small-button" disabled={busy || past || view.game.phase !== 1} onClick={async () => { try { await command('/simulate'); setToast('Saknade val har fyllts i med vanliga spelarregler.'); } catch { /* reported */ } }}>Fyll saknade val</button><span className="simulation-hint">{view.game.phase === 1 ? 'Val sparas direkt i tabellen.' : 'Starta natt för att lämna spelarval.'}</span></> : <span className="simulation-hint">Skarpt parti · spelarna lämnar sina egna val.</span>}</div><div className="simulation-right"><button className="quiet" onClick={() => setDrawer({type:'broadcast'})}>{view.countdown ? <CountdownLabel view={view}/> : 'Broadcast'}</button><button className="quiet" onClick={() => setNotesOpen(!notesOpen)}>{view.notes ? '● ' : ''}Dygnsanteckningar</button><button className={`inbox-button ${unread ? 'has-unread' : ''}`} onClick={() => { const room = view.rooms.find(r => r.unread) ?? view.rooms[0]; if (room) setDrawer({type:'chat',id:room.id}); }}><Icon name="chat" size={14}/>Chattar {unread > 0 && <b>{unread}</b>}</button></div></div>
      {notesOpen && <div className="global-notes"><SavedField key={`${view.game.id}-${view.viewedRound}`} value={view.notes} save={notes => command('/notes',{notes},'PUT')} multiline label="Hemliga dygnsanteckningar" placeholder="Hemliga GM-anteckningar för dygnet…" disabled={past}/></div>}
      {past && <div className="history-banner">Du läser dygn {view.viewedRound}. Ändringar är avstängda.<button onClick={() => setRound(0)}>Tillbaka till aktuellt dygn {view.game.round}</button></div>}
      {filteredView && <GmTable key={`${gameId}-${view.viewedRound}-${epoch}`} view={view} visibleRoles={filteredView.roles} command={safeCommandForTable} simulate={simulate && view.game.mode === 'test'} busy={busy} onRole={r => setDrawer({type:'role',id:r.id})} onChat={id => setDrawer({type:'chat',id})}/>}
      </>}{page === 'log' && <LogPage key={gameId} view={view} onError={setError}/>}{page === 'morning' && <MorningPage key={`${gameId}-${view.viewedRound}-${epoch}`} view={view}/>}
      <footer className="statusbar"><span className="team-legend">{[...teamColors(view.roles.map(r => r.team))].map(([team,color]) => <span key={team}><i className="legend-dot" style={{backgroundColor:color}}/>{team}</span>)}</span><span>{yesNo.length > 0 && `Rådets förslag: ${yesNo.filter(v => v === 'Ja').length} Ja · ${yesNo.filter(v => v === 'Nej').length} Nej`}</span><span>B blockerad · I inkallad · {busy ? 'Sparar…' : `Sparat · steg ${view.revision}`}</span></footer>
      {drawer?.type === 'day-deaths' && <DayDeathsDrawer view={view} command={command} onClose={() => setDrawer(null)}/>}
      {drawer?.type === 'broadcast' && <BroadcastDrawer view={view} command={command} onClose={() => setDrawer(null)}/>}
      {drawer?.type === 'chat' && drawer.id && <ChatDrawer key={`${gameId}-${drawer.id}`} view={view} roomId={drawer.id} onClose={() => setDrawer(null)} onRoom={id => setDrawer({type:'chat',id})} onRefresh={reload} onError={setError}/>}
      {drawer?.type === 'role' && selectedRole && <RoleDrawer key={selectedRole.id} role={selectedRole} view={view} command={command} onClose={() => setDrawer(null)}/>}
      {drawer?.type === 'history' && <aside className="drawer history-drawer" aria-label="Partihistorik"><div className="drawer-heading"><div><small>ALLA DYGN OCH SPARADE STEG</small><h2>Partihistorik</h2></div><button className="icon-button" aria-label="Stäng historik" onClick={() => setDrawer(null)}><Icon name="close"/></button></div><div className="drawer-content"><h3>Läs tidigare dygn</h3><div className="round-chips">{view.roundNumbers.map(n => <button className={view.viewedRound === n ? 'selected' : ''} key={n} onClick={() => { setRound(n === view.game.round ? 0 : n); setDrawer(null); }}>Dygn {n}</button>)}</div><p className="help">Att läsa ett tidigare dygn ändrar inte det pågående partiet.</p><a className="export-link" href={`/api/games/${gameId}/export`} download><Icon name="download" size={14}/>Exportera hela partiet</a><h3>Sparade steg</h3><p className="help">{view.game.mode === 'test' ? 'Välj ett steg för att återställa testpartiet. Nya val efter ett bakåtsteg bildar en ny gren. Alla tidigare grenar finns kvar här.' : 'Varje ändring finns kvar i partiets historik.'}</p><ol className="history-list">{[...view.timeline].reverse().map(t => <li className={t.current ? 'current' : ''} key={t.id}><button disabled={busy || view.game.mode !== 'test'} onClick={() => { setRound(0); void safeCommand('/jump', {revision:t.id}); }}><span className="history-step">#{t.id} {t.current ? '· aktivt' : ''}</span><strong>{t.label}</strong><span>Dygn {t.round} · {PHASES[t.phase]} · från #{t.parentId ?? 'start'}</span></button></li>)}</ol></div></aside>}
    </>}
    {drawer?.type === 'new' && <NewGame onClose={() => setDrawer(null)} onCreated={async id => { await refreshGames(); setGameId(id); setDrawer(null); }} onError={setError}/>}
    {phaseGuard && view && <PhaseChangeDialog key={phaseGuard.token} guard={phaseGuard} busy={busy} onCancel={()=>setPhaseGuard(null)} onContinue={()=>void changePhase(phaseGuard.toPhase,phaseGuard.token)}/>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
  // Responses must reject on save errors so SavedField keeps its draft and retry affordance.
  async function safeCommandForTable(path: string, body?: unknown, method?: string) { if (path.endsWith('/response') || (body !== null && typeof body === 'object' && ('notes' in body || 'roundNotes' in body || 'morningNotes' in body))) return command(path, body, method); return safeCommand(path, body, method); }
}

function Login({ onLogin, error }: { onLogin: (name:string,pin:string) => Promise<void>; error:string }) {
  const [name,setName] = useState(''); const [pin,setPin] = useState(''); const [busy,setBusy] = useState(false);
  return <main className="login-page" data-theme="jungle"><section className="login-card"><div className="login-mark"><Icon name="leaf" size={28}/></div><p className="eyebrow">MAFFIA · VERSION 3</p><h1>Välkommen till djungeln.</h1><p>Spelledning, spelarval och hela partiets historia på ett ställe.</p><form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await onLogin(name,pin); } finally { setBusy(false); } }}><label>Namn<input name="username" autoComplete="username" value={name} onChange={e => setName(e.target.value)} required/></label><label>PIN-kod<input name="password" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={e => setPin(e.target.value)} required/></label>{error && <p className="login-error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Loggar in…' : 'Logga in'} <Icon name="forward" size={16}/></button></form><div className="demo-hint"><strong>Lokal prototyp</strong><span>Demo: GM / 2468 · Spelare: Alex / 1101</span></div></section></main>;
}
function NewGame({ onClose, onCreated, onError }: { onClose:()=>void; onCreated:(id:string)=>Promise<void>; onError:(s:string)=>void }) {
  const [size,setSize] = useState(8); const [name,setName] = useState('Djungeln · Nytt testparti'); const [busy,setBusy] = useState(false);
  return <div className="modal-backdrop"><section className="new-game" role="dialog" aria-modal="true" aria-labelledby="new-title"><div className="drawer-heading"><h2 id="new-title">Nytt testparti</h2><button aria-label="Stäng" onClick={onClose}><Icon name="close"/></button></div><form onSubmit={async e => { e.preventDefault(); setBusy(true); try { const data = await request<{id:string}>('/games','POST',{name,size,mode:'test',theme:'jungle'}); await onCreated(data.id); } catch(e) { onError(e instanceof Error ? e.message : 'Kunde inte skapa parti.'); } finally { setBusy(false); } }}><label>Namn<input required value={name} onChange={e => setName(e.target.value)}/></label><label>Antal spelare<input type="number" min={4} max={25} required value={size} onChange={e => setSize(Number(e.target.value))}/></label><p className="help">Fiktiva spelare och djurroller. Befintliga testpartier och deras historik sparas.</p><button className="primary" disabled={busy}>{busy ? 'Skapar…' : 'Skapa testparti'}</button></form></section></div>;
}
