import { useEffect, useRef, useState } from 'react';
export function SavedField({ value: serverValue, save, label, placeholder = '', multiline = false, rows = 3, disabled = false, highlightEmpty = false, navigationOrder, onEnterSaved }: { value: string; save: (value: string) => Promise<void>; label: string; placeholder?: string; multiline?: boolean; rows?: number; disabled?: boolean; highlightEmpty?: boolean; navigationOrder?: number; onEnterSaved?: (source: HTMLElement) => void }) {
  const [value, setValue] = useState(serverValue); const [status, setStatus] = useState<'clean'|'dirty'|'saving'|'error'>('clean'); const [error, setError] = useState(''); const dirty = useRef(false); const saving = useRef(false);
  useEffect(() => { if (!dirty.current && !saving.current) setValue(serverValue); }, [serverValue]);
  async function commit() {
    if (disabled || saving.current) return false;
    if (!dirty.current) return true;
    saving.current = true; setStatus('saving');
    try { await save(value); dirty.current = false; setStatus('clean'); setError(''); return true; }
    catch (e) { setStatus('error'); setError(e instanceof Error ? e.message : 'Kunde inte spara.'); return false; }
    finally { saving.current = false; }
  }
  const missing = highlightEmpty && !serverValue.trim();
  const props = { value, disabled: disabled || status === 'saving', 'aria-label': label, 'aria-required': highlightEmpty || undefined, 'data-gm-order': navigationOrder, placeholder: missing ? 'Saknas – skriv besked…' : placeholder, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setValue(e.target.value); dirty.current = true; setStatus('dirty'); }, onBlur: () => void commit(), onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && (!multiline || e.ctrlKey || e.metaKey)) { e.preventDefault(); const source=e.currentTarget; void commit().then(saved=>{ if(saved)onEnterSaved?.(source);else requestAnimationFrame(()=>source.focus()); }); } } };
  return <div className={`saved-field ${status} ${missing ? 'needs-input' : ''}`}>
    {multiline ? <textarea {...props} rows={rows}/> : <input {...props}/>}
    {status !== 'clean' && <small role="status">{status === 'saving' ? 'Sparar…' : status === 'dirty' ? `Osparat · ${multiline ? 'Ctrl+Enter' : 'Enter'} sparar` : <button type="button" onClick={() => void commit()} title={error}>Försök spara igen</button>}</small>}
    {status === 'error' && <span className="field-error" role="alert">{error}</span>}
  </div>;
}
