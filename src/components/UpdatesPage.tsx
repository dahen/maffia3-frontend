import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../api.ts';
import { messageId } from '../id.ts';
import type { UpdateStatus, UpdateJob } from '../../../maffia3-backend/src/updates/protocol.ts';

const activeJob = (job: UpdateJob | null) => Boolean(job && ['pulling', 'backup', 'starting', 'checking'].includes(job.phase));

export function useUpdates(enabled: boolean) {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [error, setError] = useState('');
  const inFlight = useRef(false); const enabledRef = useRef(enabled); enabledRef.current = enabled;
  const refresh = useCallback(async () => {
    if (!enabled || inFlight.current) return;
    inFlight.current = true;
    try { const data = await request<UpdateStatus>('/admin/updates'); if (enabledRef.current) { setStatus(data); setError(''); } }
    catch { if (enabledRef.current) setError('Kan inte nå uppdateringstjänsten just nu. Försöker igen automatiskt.'); }
    finally { inFlight.current = false; }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) { setStatus(null); setError(''); return; }
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, activeJob(status?.job ?? null) ? 3000 : 60_000);
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [enabled, refresh, status?.job?.phase]);
  const trackJob = (job: UpdateJob) => setStatus(current => current ? { ...current, job } : current);
  return { status, error, refresh, trackJob };
}

export function UpdatesPage({ status, error, refresh, trackJob }: ReturnType<typeof useUpdates>) {
  const [confirm, setConfirm] = useState(false); const [sending, setSending] = useState(false); const [sendError, setSendError] = useState('');
  const pending = useRef<{ version: string; requestId: string } | null>(null);
  const running = activeJob(status?.job ?? null);
  const available = Boolean(status?.latest && status.current.version !== status.latest.version);
  async function update() {
    if (!status?.latest || sending) return;
    setSending(true); setSendError('');
    if (pending.current?.version !== status.latest.version) pending.current = { version: status.latest.version, requestId: messageId() };
    try {
      trackJob(await request<UpdateJob>('/admin/updates', 'POST', pending.current));
      setConfirm(false); await refresh();
    } catch (e) { setSendError(e instanceof Error ? e.message : 'Kunde inte starta uppdateringen.'); await refresh(); }
    finally { setSending(false); }
  }
  return <main className="updates-page">
    <p className="eyebrow">SPELLEDNING</p><h1>Uppdateringar</h1>
    <p className="help">Du väljer själv när appen uppdateras. Gör det helst mellan partier.</p>
    <dl className="update-versions"><div><dt>Installerad version</dt><dd>{status?.current.version ?? 'Hämtar…'}</dd></div>{status?.latest && <div><dt>Senaste version</dt><dd>{status.latest.version}</dd></div>}</dl>
    {status?.current.backend && <p className="help">Backend {status.current.backend.slice(0, 7)} · Frontend {status.current.frontend.slice(0, 7)}</p>}
    {!status?.configured && status && <p className="player-notice">Uppdateringstjänsten på mini är inte inkopplad ännu.</p>}
    {(error || status?.releaseError || sendError) && <p className="login-error" role="alert">{sendError || error || status?.releaseError}</p>}
    {status?.configured && !error && !status.releaseError && !status.latest && <p>Ingen publicerad appversion finns ännu.</p>}
    {status?.configured && !error && !status.releaseError && status.latest && !available && <p>Du har den senaste versionen.</p>}
    {status?.job && <section className="update-job" aria-live="polite"><h2>{running ? `Uppdaterar till ${status.job.version}` : `Senaste uppdateringsjobb · ${status.job.version}`}</h2><p>{status.job.message}</p><time>{new Date(status.job.updatedAt).toLocaleString('sv-SE')}</time>{status.job.phase === 'complete' && <button onClick={() => window.location.reload()}>Ladda om appen</button>}</section>}
    {available && status?.configured && !running && status.job?.phase !== 'recovery-required' && !error && !status.releaseError && <>
      {!confirm ? <button className="primary" onClick={() => setConfirm(true)}>Uppdatera till {status.latest!.version}</button> : <section className="update-confirm"><h2>Uppdatera appen?</h2><p>Databas och foton säkerhetskopieras före bytet. Alla får ett kort avbrott när appen startar om.</p><div><button className="primary" disabled={sending} onClick={() => void update()}>{sending ? 'Startar…' : `Starta uppdatering till ${status.latest!.version}`}</button><button disabled={sending} onClick={() => setConfirm(false)}>Avbryt</button></div></section>}
    </>}
    <button className="quiet" disabled={sending} onClick={() => void refresh()}>Kontrollera status</button>
  </main>;
}
