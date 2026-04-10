function MusicTab() {
  const { useState, useEffect, useRef } = React;
  const [track, setTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isActing, setIsActing] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const pollRef = useRef(null);
  const progressRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    loadNowPlaying();
    pollRef.current = setInterval(loadNowPlaying, 5000);
    return () => { clearInterval(pollRef.current); clearInterval(progressRef.current); };
  }, []);

  useEffect(() => {
    trackRef.current = track;
    if (track) setLocalProgress(track.progress_ms || 0);
    clearInterval(progressRef.current);
    if (track && track.is_playing) {
      progressRef.current = setInterval(() => {
        setLocalProgress(p => {
          const next = p + 1000;
          return next > (trackRef.current?.item?.duration_ms || 0) ? p : next;
        });
      }, 1000);
    }
    return () => clearInterval(progressRef.current);
  }, [track]);

  async function loadNowPlaying() {
    try {
      const result = await window.api.getSpotifyNowPlaying();
      if (result && result.error) { setError(result.error); setTrack(null); }
      else { setError(''); setTrack(result || null); }
      const q = await window.api.getSpotifyQueue();
      if (q && q.queue) setQueue(q.queue.slice(0, 3));
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function handlePlayPause() {
    setIsActing(true);
    try { await window.api.spotifyPlayPause(); setTimeout(loadNowPlaying, 300); } catch (e) { console.error(e); }
    setIsActing(false);
  }

  async function handleNext() {
    setIsActing(true);
    try { await window.api.spotifyNext(); setTimeout(loadNowPlaying, 500); } catch (e) { console.error(e); }
    setIsActing(false);
  }

  async function handlePrev() {
    setIsActing(true);
    try { await window.api.spotifyPrev(); setTimeout(loadNowPlaying, 500); } catch (e) { console.error(e); }
    setIsActing(false);
  }

  async function handleShuffle() {
    const newState = !track?.shuffle_state;
    try { await window.api.spotifyShuffle(newState); setTimeout(loadNowPlaying, 300); } catch (e) { console.error(e); }
  }

  async function handleRepeat() {
    const states = ['off', 'context', 'track'];
    const current = track?.repeat_state || 'off';
    const next = states[(states.indexOf(current) + 1) % states.length];
    try { await window.api.spotifyRepeat(next); setTimeout(loadNowPlaying, 300); } catch (e) { console.error(e); }
  }

  function msToMinSec(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const progress = localProgress && track?.item?.duration_ms
    ? (localProgress / track.item.duration_ms) * 100 : 0;

  const albumUrl = track?.item?.album?.images?.[0]?.url;
  const repeatIcon = track?.repeat_state === 'track' ? '🔂' : '🔁';
  const repeatActive = track?.repeat_state !== 'off';

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden',position:'relative'}}>
      <style>{`
        @keyframes pulseGlow { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:0.9;transform:scale(1.06)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes ringPulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
        @keyframes ringRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .album-glow { animation: pulseGlow 2.4s ease-in-out infinite; }
        .album-spin { animation: spin 8s linear infinite; }
        .ring-playing { animation: ringRotate 4s linear infinite; }
        .ring-pulse { animation: ringPulse 1.8s ease-in-out infinite; }
      `}</style>



      {/* Header */}
      <div style={{position:'relative',zIndex:1,padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0}}>
        <div style={{fontSize:11,fontWeight:600,color:'#e0def4'}}>Now Playing</div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'16px',position:'relative',zIndex:1,gap:12,overflowY:'auto'}}>
        {loading && <div style={{fontSize:11,color:'#6e6a86'}}>Loading...</div>}
        {!loading && error && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:11,color:'#eb6f92',marginBottom:8}}>{error}</div>
            <button onClick={loadNowPlaying} style={{fontSize:11,color:'#31748f',background:'none',border:'none',cursor:'pointer'}}>Retry</button>
          </div>
        )}
        {!loading && !error && !track && <div style={{fontSize:11,color:'#6e6a86'}}>Nothing playing</div>}

        {!loading && !error && track && track.item && (
          <>
            {/* Album art */}
            <div style={{position:'relative',width:240,height:240,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {/* Visualizer ring */}
              <svg
                className={track.is_playing ? 'ring-playing' : ''}
                style={{position:'absolute',top:0,left:0,width:240,height:240,zIndex:2,pointerEvents:'none'}}
                viewBox="0 0 240 240"
              >
                {Array.from({length:48}).map((_, i) => {
                  const angle = (i / 48) * Math.PI * 2;
                  const sizes = [2,3,4,2,5,3,2,4,3,5,2,3,4,2,3,5,2,4,3,2,5,3,4,2,3,4,2,5,3,2,4,3,5,2,3,4,2,3,5,2,4,3,2,5,3,4,2,3];
                  const baseR = sizes[i] || 2.5;
                  const r = 115;
                  const cx = 120 + r * Math.cos(angle);
                  const cy = 120 + r * Math.sin(angle);
                  const delay = (i / 48) * 2.4;
                  const duration = 0.8 + (i % 5) * 0.3;
                  return (
                    <circle
                      key={i}
                      cx={cx} cy={cy} r={baseR}
                      fill="#9ccfd8"
                      style={track.is_playing ? {
                        animation: `ringPulse ${duration}s ease-in-out ${delay}s infinite`,
                        opacity: 0.6
                      } : {opacity: 0.25}}
                    />
                  );
                })}
              </svg>
              <div style={{position:'absolute',width:200,height:200,top:20,left:20}}>
              {albumUrl && (
                <img src={albumUrl} className="album-glow"
                  style={{position:'absolute',width:200,height:200,borderRadius:'50%',objectFit:'cover',filter:'blur(20px) brightness(1.4) saturate(2)',top:0,left:0,zIndex:0}}
                />
              )}
              {albumUrl ? (
                <img src={albumUrl} alt="Album art"
                  className={track.is_playing ? 'album-spin' : ''}
                  style={{position:'relative',width:200,height:200,borderRadius:'50%',objectFit:'cover',boxShadow:'0 8px 40px rgba(0,0,0,0.7)',zIndex:1,border:'3px solid rgba(255,255,255,0.08)'}}
                />
              ) : (
                <div style={{width:200,height:200,borderRadius:'50%',background:'#26233a',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1,position:'relative'}}>
                  <span style={{fontSize:48}}>♪</span>
                </div>
              )}
              </div>
            </div>

            {/* Track info */}
            <div style={{textAlign:'center',width:'100%'}}>
              <div style={{fontSize:14,fontWeight:600,color:'#e0def4',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.item.name}</div>
              <div style={{fontSize:11,color:'rgba(224,222,244,0.6)',marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track.item.artists?.map(a => a.name).join(', ')}</div>
            </div>

            {/* Progress bar */}
            <div style={{width:'100%'}}>
              <div style={{width:'100%',height:3,background:'rgba(255,255,255,0.15)',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',background:'#e0def4',borderRadius:2,width:`${progress}%`,transition:'width 0.3s'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                <span style={{fontSize:10,color:'rgba(224,222,244,0.5)'}}>{msToMinSec(localProgress||0)}</span>
                <span style={{fontSize:10,color:'rgba(224,222,244,0.5)'}}>{msToMinSec(track.item.duration_ms||0)}</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{display:'flex',alignItems:'center',gap:20}}>
              <button onClick={handleShuffle} disabled={isActing}
                style={{background:'none',border:'none',cursor:'pointer',fontSize:14,opacity:track.shuffle_state?1:0.4,color:'#e0def4'}}>⇄</button>
              <button onClick={handlePrev} disabled={isActing}
                style={{background:'none',border:'none',cursor:'pointer',color:'rgba(224,222,244,0.7)'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
              </button>
              <button onClick={handlePlayPause} disabled={isActing}
                style={{width:44,height:44,borderRadius:'50%',background:'#e0def4',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {track.is_playing ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#191724"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#191724"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button onClick={handleNext} disabled={isActing}
                style={{background:'none',border:'none',cursor:'pointer',color:'rgba(224,222,244,0.7)'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-8.14 5.51 3.86L8 17.14V9.86zM16 6h2v12h-2z"/></svg>
              </button>
              <button onClick={handleRepeat} disabled={isActing}
                style={{background:'none',border:'none',cursor:'pointer',fontSize:14,opacity:repeatActive?1:0.4,color:'#e0def4'}}>{repeatIcon}</button>
            </div>

            {/* Queue */}
            {queue.length > 0 && (
              <div style={{width:'100%',borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:10}}>
                <div style={{fontSize:10,color:'rgba(224,222,244,0.4)',marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>Next up</div>
                {queue.map((item, i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    {item.album?.images?.[2]?.url && (
                      <img src={item.album.images[2].url} style={{width:28,height:28,borderRadius:4,objectFit:'cover'}}/>
                    )}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,color:'rgba(224,222,244,0.8)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</div>
                      <div style={{fontSize:10,color:'rgba(224,222,244,0.4)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.artists?.map(a=>a.name).join(', ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{position:'relative',zIndex:1,padding:'6px 16px',borderTop:'1px solid rgba(255,255,255,0.08)',flexShrink:0}}>
        <button onClick={loadNowPlaying} style={{fontSize:10,color:'rgba(224,222,244,0.4)',background:'none',border:'none',cursor:'pointer'}}>↻ Refresh</button>
      </div>
    </div>
  );
}
