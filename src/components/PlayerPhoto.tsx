export function PlayerPhoto({photoId,name,className=''}:{photoId?:string|null;name:string;className?:string}){
  if(photoId)return <img className={`player-photo ${className}`} src={`/api/photos/${encodeURIComponent(photoId)}`} alt={`Foto av ${name}`} loading="lazy" decoding="async"/>;
  const initials=name.trim().split(/\s+/).slice(0,2).map(part=>Array.from(part)[0]??'').join('').toLocaleUpperCase('sv');
  return <span className={`player-photo photo-placeholder ${className}`} role="img" aria-label={`${name} · inget foto`}>{initials||'?'}</span>;
}
