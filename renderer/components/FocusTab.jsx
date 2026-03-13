function FocusTab() {
  const { useState, useEffect, useRef } = React;

  const MODES = {
    work:       { label: 'Focus',       duration: 25 * 60, color: '#31748f' },
    shortBreak: { label: 'Short Break', duration:  5 * 60, color: '#ebbcba' },
    longBreak:  { label: 'Long Break',  duration: 15 * 60, color: '#9ccfd8' },
  };

  const [mode, setMode] = useState('work');
  const [secondsLeft, setSecondsLeft] = useState(MODES.work.duration);
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState(1); // 1-4 pomodoros before long break
  const [completedToday, setCompletedToday] = useState(0);

  const intervalRef = useRef(null);
  const currentMode = MODES[mode];

  // Tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            handleTimerEnd();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  function handleTimerEnd() {
    setRunning(false);
    // Native notification via title flash — Electron will handle focus
    if (mode === 'work') {
      const newCompleted = completedToday + 1;
      const newSession = session % 4 === 0 ? 4 : session; // track before reset
      setCompletedToday(newCompleted);
      if (session >= 4) {
        setSession(1);
        switchMode('longBreak');
      } else {
        setSession(s => s + 1);
        switchMode('shortBreak');
      }
    } else {
      switchMode('work');
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setSecondsLeft(MODES[newMode].duration);
    setRunning(false);
  }

  function handleModeClick(newMode) {
    if (newMode === mode) return;
    clearInterval(intervalRef.current);
    switchMode(newMode);
  }

  function toggleRunning() {
    setRunning(r => !r);
  }

  function reset() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setSecondsLeft(currentMode.duration);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  const progress = 1 - secondsLeft / currentMode.duration;
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Mode selector */}
      <div className="flex border-b border-border flex-shrink-0">
        {Object.entries(MODES).map(([key, m]) => (
          <button
            key={key}
            onClick={() => handleModeClick(key)}
            className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
              mode === key ? 'text-text bg-cardHover' : 'text-muted hover:text-text'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Timer */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        {/* Circular progress */}
        <div className="relative">
          <svg width="176" height="176" className="-rotate-90">
            {/* Track */}
            <circle
              cx="88" cy="88" r={radius}
              fill="none"
              stroke="#1f1d2e"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="88" cy="88" r={radius}
              fill="none"
              stroke={currentMode.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
            />
          </svg>

          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="text-4xl font-bold tabular-nums tracking-tight"
              style={{ color: currentMode.color }}
            >
              {formatTime(secondsLeft)}
            </div>
            <div className="text-[10px] text-muted mt-1 tracking-widest uppercase">
              {currentMode.label}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-white transition-colors"
            title="Reset"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
          </button>

          <button
            onClick={toggleRunning}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: currentMode.color,
            }}
          >
            {running ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Skip to next */}
          <button
            onClick={handleTimerEnd}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-white transition-colors"
            title="Skip"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>

        {/* Session dots */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  background: i < session
                    ? currentMode.color
                    : i === session && mode === 'work'
                      ? currentMode.color + '88'
                      : '#403d52'
                }}
              />
            ))}
          </div>
          <div className="text-[10px] text-muted">
            {completedToday} {completedToday === 1 ? 'pomodoro' : 'pomodoros'} today
          </div>
        </div>
      </div>
    </div>
  );
}
