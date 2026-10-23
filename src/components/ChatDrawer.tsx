import { useEffect, useRef, useState } from 'react';
import { api, request } from '../api.ts';
import type { GameView, Message } from '../api.ts';
import { Icon } from './Icons.tsx';
import { messageId } from '../id.ts';
export function ChatDrawer({ view, roomId, onClose, onRoom, onRefresh, onError }: { view: GameView; roomId: string; onClose: () => void; onRoom: (id: string) => void; onRefresh: () => Promise<void>; onError: (message: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]); const [draft, setDraft] = useState(''); const [sending, setSending] = useState(false); const pending = useRef<{ id: string; body: string } | null>(null); const bottom = useRef<HTMLDivElement>(null);
  const room = view.rooms.find(r => r.id === roomId);
  const [senderRole, setSenderRole] = useState('');
  useEffect(() => {
    let cancelled = false;
    async function load() { try { const data = await api.messages(view.game.id, roomId); if (cancelled) return; setMessages(data); const last = data.at(-1); if (last && room?.unread) { await request(`/games/${view.game.id}/rooms/${roomId}/read`, 'PUT', { messageId: last.id }); if (!cancelled) await onRefresh(); } } catch (e) { if (!cancelled) onError(e instanceof Error ? e.message : 'Kunde inte läsa chatten.'); } }
    void load(); return () => { cancelled = true; };
  }, [view.game.id, roomId, view.revision, room?.unread]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages.length, roomId]);
  async function send() {
    if (!draft.trim() || sending) return; setSending(true);
    if (!pending.current || pending.current.body !== draft.trim()) pending.current = { id: messageId(), body: draft.trim() };
    try { await request(`/games/${view.game.id}/rooms/${roomId}/${senderRole ? 'simulate' : 'messages'}`, 'POST', { body: pending.current.body, clientId: pending.current.id, ...(senderRole ? {roleId:senderRole} : {}) }); setDraft(''); pending.current = null; await onRefresh(); }
    catch (e) { onError(e instanceof Error ? e.message : 'Kunde inte skicka.'); } finally { setSending(false); }
  }
  return <aside className="drawer chat-drawer" aria-label="Chatt"><div className="drawer-heading"><div><small>MEDDELANDEN</small><h2>{room?.kind === 'gm' ? `GM ↔ ${room.name}` : room?.name}</h2></div><button className="icon-button" aria-label="Stäng chatt" onClick={onClose}><Icon name="close"/></button></div>
    <select className="room-select" aria-label="Välj chatt" value={roomId} onChange={e => onRoom(e.target.value)}>{view.rooms.map(r => <option key={r.id} value={r.id}>{r.kind === 'gm' ? 'GM ↔ ' : ''}{r.name}{r.unread ? ` (${r.unread} olästa)` : ''}</option>)}</select>
    <div className="chat-messages">{messages.length === 0 && <p className="empty">Inga meddelanden ännu.</p>}{messages.map(m => <article key={m.id} className={`message ${m.admin ? 'from-gm' : ''}`}><header><strong>{m.senderName}</strong><time>{new Date(m.time).toLocaleTimeString('sv-SE', {hour:'2-digit',minute:'2-digit'})} · D{m.round}</time></header><p>{m.body}</p></article>)}<div ref={bottom}/></div>
    <div className="chat-simulation">{view.game.mode === 'test' && <label>Skicka som<select aria-label="Simulera chattavsändare" value={senderRole} onChange={e => { setSenderRole(e.target.value); pending.current = null; }}><option value="">GM</option>{view.roles.filter(r => room?.roleIds.includes(r.id)).map(r => <option key={r.id} value={r.id}>{r.player} (simulerad spelare)</option>)}</select></label>}</div><form className="chat-compose" onSubmit={e => { e.preventDefault(); void send(); }}><textarea aria-label="Chattmeddelande" placeholder="Skriv ett meddelande…" value={draft} rows={3} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}/><button className="primary" disabled={sending || !draft.trim()}>{sending ? 'Skickar…' : 'Skicka'}</button></form>
  </aside>;
}
