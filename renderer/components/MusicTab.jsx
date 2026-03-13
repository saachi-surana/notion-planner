function MusicTab() {
  const { useState, useEffect, useRef } = React;
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isActing, setIsActing] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    loadNowPlaying();
    // Poll every 5 seconds
    pollRef.current = setInterval(loadNowPlaying, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

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

  const progress = track?.progress_ms && track?.item?.duration_ms
    ? (track.progress_ms / track.item.duration_ms) * 100
    : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="text-xs font-semibold text-white">Now Playing</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        {loading && (
          <div className="text-xs text-muted">Loading...</div>
        )}

        {!loading && error && (
          <div className="text-center">
            <div className="text-xs text-red-400 mb-2">{error}</div>
            <button onClick={loadNowPlaying} className="text-xs text-purple hover:underline">Retry</button>
          </div>
        )}

        {!loading && !error && !track && (
          <div className="text-xs text-muted">Nothing playing</div>
        )}

        {!loading && !error && track && track.item && (
          <div className="w-full fade-in">
            {/* Album Art + Track Info */}
            <div className="flex items-center gap-3 mb-4">
              {track.item.album?.images?.[0]?.url ? (
                <img
                  src={track.item.album.images[0].url}
                  alt="Album art"
                  className="w-12 h-12 rounded-md flex-shrink-0 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-card flex-shrink-0 flex items-center justify-center">
                  <span className="text-lg">♪</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {track.item.name}
                </div>
                <div className="text-[10px] text-muted truncate mt-0.5">
                  {track.item.artists?.map(a => a.name).join(', ')}
                </div>
                <div className="text-[10px] text-muted truncate mt-0.5">
                  {track.item.album?.name}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1DB954] rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted">{msToMinSec(track.progress_ms || 0)}</span>
                <span className="text-[10px] text-muted">{msToMinSec(track.item.duration_ms || 0)}</span>
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
                className="w-9 h-9 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {track.is_playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#1e1e1e">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#1e1e1e">
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
