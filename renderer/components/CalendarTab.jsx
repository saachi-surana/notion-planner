function CalendarTab() {
  const { useState, useEffect } = React;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const COLORS = ['#7F77DD', '#1D9E75', '#BA7517'];

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    setError('');
    try {
      const result = await window.api.getCalendarEvents();
      if (result.error) {
        setError(result.error);
      } else {
        setEvents(result || []);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function formatTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    const d = new Date(dateTimeStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function formatDateHeader() {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  }

  function openEvent(event) {
    const url = event.htmlLink || `https://calendar.google.com/calendar/r/day`;
    window.api.openExternal(url);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="text-[10px] font-semibold text-muted tracking-widest">TODAY</div>
        <div className="text-sm font-semibold text-white mt-0.5">{formatDateHeader()}</div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-xs text-muted">Loading events...</div>
          </div>
        )}

        {!loading && error && (
          <div className="p-3 text-xs text-muted">
            <div className="text-red-400 mb-2">{error}</div>
            <button onClick={loadEvents} className="text-purple hover:underline">Retry</button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="text-xs text-muted">Nothing scheduled today</div>
          </div>
        )}

        {!loading && !error && events.map((event, i) => {
          const color = COLORS[i % COLORS.length];
          const isAllDay = !event.start?.dateTime;
          const startTime = event.start?.dateTime ? formatTime(event.start.dateTime) : 'All day';
          const endTime = event.end?.dateTime ? formatTime(event.end.dateTime) : '';
          const timeStr = endTime ? `${startTime} – ${endTime}` : startTime;

          return (
            <div
              key={event.id}
              onClick={() => openEvent(event)}
              className="mb-2 bg-card hover:bg-cardHover rounded cursor-pointer transition-colors fade-in"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <div className="px-3 py-2">
                <div className="text-xs font-medium text-white leading-snug">{event.summary || 'Untitled'}</div>
                <div className="text-[10px] text-muted mt-0.5">{timeStr}</div>
                {event.location && (
                  <div className="text-[10px] text-muted mt-0.5 truncate">📍 {event.location}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Refresh */}
      <div className="px-4 py-1.5 border-t border-border flex-shrink-0">
        <button onClick={loadEvents} className="text-[10px] text-muted hover:text-white transition-colors">
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
