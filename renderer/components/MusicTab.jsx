function MusicTab() {
  const { useState, useEffect, useRef } = React;
  const [track, setTrack] = useState(null);
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
      if (result && result.error) {
        setError(result.error);
        setTrack(null);
      } else {
        setError('');
        setTrack(result || null);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handlePlayPause() {
    setIsActing(true);
    try {
      await window.api.spotifyPlayPause();
      setTimeout(loadNowPlaying, 300);
    } catch (e) {
      console.error(e);
    }
    setIsActing(false);
  }

  async function handleNext() {
    setIsActing(true);
    try {
      await window.api.spotifyNext();
      setTimeout(loadNowPlaying, 300);
    } catch (e) {
      console.error(e);
    }
    setIsActing(false);
  }

  async function handlePrev() {
    setIsActing(true);
    try {
      await window.api.spotifyPrev();
      setTimeout(loadNowPlaying, 300);
    } catch (e) {
      console.error(e);
    }
    setIsActing(false);
  }

  function msToMinSec(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const progress = localProgress && track?.item?.duration_ms
    ? (localProgress / track.item.duration_ms) * 100
    : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="text-xs font-semibold text-text">Now Playing</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        {loading && (
          <div className="text-xs text-muted">Loading...</div>
        )}

        {!loading && error && (
          <div className="text-center">
            <div className="text-xs text-red-400 mb-2">{error}</div>
            <button onClick={loadNowPlaying} className="text-xs text-teal hover:underline">Retry</button>
          </div>
        )}

        {!loading && !error && !track && (
          <div className="text-xs text-muted">Nothing playing</div>
        )}

        {!loading && !error && track && track.item && (
          <div className="w-full fade-in" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
            {/* Album Art with glow */}
            <style>{`
              @keyframes pulseGlow {
                0%, 100% { opacity: 0.5; transform: scale(1); }
                50% { opacity: 0.9; transform: scale(1.06); }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .album-glow {
                animation: pulseGlow 2.4s ease-in-out infinite; opacity: 0.85;
              }
              .album-spin {
                animation: spin 8s linear infinite;
              }
            `}</style>
            <div style={{position:'relative',width:220,height:220}}>
              {/* Glow layer */}
              {track.item.album?.images?.[0]?.url && (
                <img
                  src={track.item.album.images[0].url}
                  className="album-glow"
                  style={{
                    position:'absolute',
                    width:220,height:220,
                    borderRadius:'50%',
                    objectFit:'cover',
                    filter:'blur(20px) brightness(1.4) saturate(2)',
                    top:0,left:0,
                    zIndex:0
                  }}
                />
              )}
              {/* Main album art */}
              {track.item.album?.images?.[0]?.url ? (
                <img
                  src={track.item.album.images[0].url}
                  alt="Album art"
                  className={track.is_playing ? 'album-spin' : ''}
                  style={{
                    position:'relative',
                    width:220,height:220,
                    borderRadius:'50%',
                    objectFit:'cover',
                    boxShadow:'0 8px 40px rgba(0,0,0,0.7)',
                    zIndex:1,
                    border:'3px solid rgba(255,255,255,0.08)'
                  }}
                />
              ) : (
                <div style={{width:220,height:220,borderRadius:'50%',background:'#26233a',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1,position:'relative'}}>
                  <span style={{fontSize:48}}>♪</span>
                </div>
              )}
            </div>
            {/* Track Info */}
            <div style={{textAlign:'center',width:'100%',padding:'0 16px'}}>
              <div style={{fontSize:14,fontWeight:600,color:'#e0def4',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {track.item.name}
              </div>
              <div style={{fontSize:11,color:'#6e6a86',marginTop:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {track.item.artists?.map(a => a.name).join(', ')}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{width:'100%',padding:'0 16px'}}>
              <div style={{width:'100%',height:4,background:'#26233a',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',background:'#31748f',borderRadius:2,width:`${progress}%`,transition:'width 0.3s'}} />
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                <span style={{fontSize:10,color:'#6e6a86'}}>{msToMinSec(localProgress || 0)}</span>
                <span style={{fontSize:10,color:'#6e6a86'}}>{msToMinSec(track.item.duration_ms || 0)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePrev}
                disabled={isActing}
                className="text-muted hover:text-white transition-colors disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
                </svg>
              </button>

              <button
                onClick={handlePlayPause}
                disabled={isActing}
                className="w-9 h-9 rounded-full bg-teal hover:bg-pine flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {track.is_playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              <button
                onClick={handleNext}
                disabled={isActing}
                className="text-muted hover:text-white transition-colors disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zm2-8.14 5.51 3.86L8 17.14V9.86zM16 6h2v12h-2z"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-1.5 border-t border-border flex-shrink-0">
        <button onClick={loadNowPlaying} className="text-[10px] text-muted hover:text-white transition-colors">
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
