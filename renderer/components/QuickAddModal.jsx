function QuickAddModal({ onClose }) {
  const { useState, useEffect, useRef } = React;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e && e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await window.api.quickAddNotion(title.trim(), body.trim());
      if (result && result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(onClose, 1000);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  }

  return (
    <div
      className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#2a2a2a] rounded-lg w-72 p-4 shadow-xl" onKeyDown={handleKeyDown}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-white">Add to Notion</div>
          <button onClick={onClose} className="text-muted hover:text-white text-sm">×</button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-1">✓</div>
            <div className="text-xs text-teal">Added to Notion!</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              ref={titleRef}
              className="w-full bg-[#1e1e1e] border border-border rounded px-2 py-1.5 text-xs text-white placeholder-muted"
              placeholder="Title *"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <textarea
              className="w-full bg-[#1e1e1e] border border-border rounded px-2 py-1.5 text-xs text-white placeholder-muted resize-none"
              placeholder="Notes (optional)"
              rows={3}
              value={body}
              onChange={e => setBody(e.target.value)}
            />
            {error && <div className="text-xs text-red-400">{error}</div>}
            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#e8562a] hover:bg-[#d14e26] text-white text-xs py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add to Notion'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-muted hover:text-white px-2"
              >
                Cancel
              </button>
            </div>
            <div className="text-[10px] text-muted">⌘+Enter to submit</div>
          </form>
        )}
      </div>
    </div>
  );
}
