const GCAL_COLORS = {
  '1':  { name: 'Tomato',     hex: '#D50000' },
  '2':  { name: 'Flamingo',   hex: '#E67C73' },
  '3':  { name: 'Tangerine',  hex: '#F4511E' },
  '4':  { name: 'Banana',     hex: '#F6BF26' },
  '5':  { name: 'Sage',       hex: '#33B679' },
  '6':  { name: 'Basil',      hex: '#0F9D58' },
  '7':  { name: 'Peacock',    hex: '#039BE5' },
  '8':  { name: 'Blueberry',  hex: '#3F51B5' },
  '9':  { name: 'Lavender',   hex: '#7986CB' },
  '10': { name: 'Grape',      hex: '#8E24AA' },
  '11': { name: 'Graphite',   hex: '#616161' },
};
const DEFAULT_EVENT_COLOR = '#31748f';

function CreateEventModal({ onClose, onCreated }) {
  const { useState } = React;
  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [colorId, setColorId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError('');
    const result = await window.api.createCalendarEvent({
      title: title.trim(),
      date,
      startTime: startTime || null,
      endTime: endTime || null,
      colorId: colorId || null,
    });
    setSubmitting(false);
    if (result && result.error) {
      setError(result.error);
    } else {
      onCreated();
    }
  }

  const inputCls = "w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-text placeholder-muted focus:border-teal transition-colors";
  const labelCls = "block text-[10px] text-muted mb-1 uppercase tracking-wider";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-lg shadow-xl w-72 p-4 fade-in">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-text">New Event</div>
          <button onClick={onClose} className="text-muted hover:text-text text-sm leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelCls}>Title *</label>
            <input
              className={inputCls}
              placeholder="Event title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>Start time</label>
              <input
                type="time"
                className={inputCls}
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="flex-1">
              <label className={labelCls}>End time</label>
              <input
                type="time"
                className={inputCls}
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Color</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.entries(GCAL_COLORS).map(([id, { name, hex }]) => (
                <button
                  key={id}
                  type="button"
                  title={name}
                  onClick={() => setColorId(colorId === id ? '' : id)}
                  className="rounded-full transition-transform hover:scale-110"
                  style={{
                    width: 18,
                    height: 18,
                    background: hex,
                    outline: colorId === id ? `2px solid white` : '2px solid transparent',
                    outlineOffset: 1,
                  }}
                />
              ))}
            </div>
          </div>

          {error && <div className="text-[10px] text-red-400">{error}</div>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-1.5 text-xs text-muted border border-border rounded hover:bg-cardHover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="flex-1 py-1.5 text-xs font-medium rounded transition-colors"
              style={{
                background: submitting || !title.trim() ? '#26233a' : '#31748f',
                color: submitting || !title.trim() ? '#6e6a86' : '#e0def4',
              }}
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CalendarTab() {
  const { useState, useEffect } = React;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

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

  async function handleRetry() {
    if (error && error.toLowerCase().includes('not authenticated')) {
      setLoading(true);
      setError('');
      const result = await window.api.startGoogleAuth();
      if (result && result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
    }
    await loadEvents();
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

  function eventColor(event) {
    if (event.colorId && GCAL_COLORS[event.colorId]) {
      return GCAL_COLORS[event.colorId].hex;
    }
    return DEFAULT_EVENT_COLOR;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold text-muted tracking-widest">TODAY</div>
          <div className="text-sm font-semibold text-text mt-0.5">{formatDateHeader()}</div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-6 h-6 rounded flex items-center justify-center text-muted hover:text-text hover:bg-cardHover transition-colors text-base leading-none"
          title="New event"
        >
          +
        </button>
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
            <button onClick={handleRetry} className="text-teal hover:underline">Retry</button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="text-xs text-muted">Nothing scheduled today</div>
          </div>
        )}

        {!loading && !error && events.map((event) => {
          const color = eventColor(event);
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
                <div className="text-xs font-medium text-text leading-snug">{event.summary || 'Untitled'}</div>
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

      {showModal && (
        <CreateEventModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadEvents(); }}
        />
      )}
    </div>
  );
}
