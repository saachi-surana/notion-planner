function SetupScreen({ onComplete }) {
  const { useState } = React;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [spotifyCode, setSpotifyCode] = useState('');
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [notionToken, setNotionToken] = useState('');
  const [notionTasksDb, setNotionTasksDb] = useState('');
  const [notionNotesDb, setNotionNotesDb] = useState('');

  const steps = ['Google', 'Spotify', 'Canvas', 'Notion', 'Done'];

  async function handleGoogleAuth() {
    setLoading(true);
    setError('');
    try {
      // Opens browser + loopback server; resolves when auth is complete or fails
      const result = await window.api.startGoogleAuth();
      if (result.error) { setError(result.error); setLoading(false); return; }
      await window.api.saveConfig({ googleAuthComplete: true });
      setStep(1);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleSpotifyAuth() {
    setLoading(true);
    setError('');
    try {
      const result = await window.api.startSpotifyAuth();
      if (result.error) { setError(result.error); setLoading(false); return; }
      if (result.authUrl) {
        await window.api.openExternal(result.authUrl);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleSpotifyCodeSubmit() {
    if (!spotifyCode.trim()) { setError('Please paste the authorization code'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await window.api.completeSpotifyAuth(spotifyCode.trim());
      if (result.error) { setError(result.error); setLoading(false); return; }
      await window.api.saveConfig({ spotifyAuthComplete: true });
      setStep(2);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleCanvasSave() {
    if (!canvasUrl.trim() || !canvasToken.trim()) {
      setError('Please fill in both fields');
      return;
    }
    setLoading(true);
    try {
      await window.api.saveConfig({
        canvasBaseUrl: canvasUrl.trim(),
        canvasToken: canvasToken.trim(),
        canvasSetupComplete: true
      });
      setStep(3);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleNotionSave() {
    if (!notionToken.trim() || !notionTasksDb.trim() || !notionNotesDb.trim()) {
      setError('Please fill in all three fields');
      return;
    }
    setLoading(true);
    try {
      await window.api.saveConfig({
        notionToken: notionToken.trim(),
        notionTasksDbId: notionTasksDb.trim(),
        notionNotesDbId: notionNotesDb.trim(),
        notionSetupComplete: true
      });
      setStep(4);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleFinish() {
    await window.api.saveConfig({ setupComplete: true });
    onComplete();
  }

  function skipStep() {
    setError('');
    setStep(s => s + 1);
  }

  return (
    <div className="flex flex-col h-screen bg-surface p-4 overflow-y-auto">
      {/* Step indicator */}
      <div className="flex gap-1 mb-4">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-purple' : 'bg-border'}`}
          />
        ))}
      </div>

      <div className="text-xs text-muted mb-1">STEP {step + 1} OF {steps.length}</div>

      {/* ── Step 0: Google ── */}
      {step === 0 && (
        <div className="fade-in flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white">Connect Google Calendar</h2>
          <p className="text-xs text-muted leading-relaxed">
            Make sure <code className="text-purple">GOOGLE_CLIENT_ID</code> and <code className="text-purple">GOOGLE_CLIENT_SECRET</code> are in your <code>.env</code> file. Click below — your browser will open, you sign in, and the app completes auth automatically.
          </p>
          {loading && (
            <div className="text-xs text-muted">Waiting for browser authorization...</div>
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleGoogleAuth} disabled={loading}
              className="flex-1 bg-purple hover:bg-[#6e66c8] text-white text-xs py-2 rounded transition-colors disabled:opacity-50">
              {loading ? 'Waiting for browser...' : 'Sign in with Google'}
            </button>
            <button onClick={skipStep} disabled={loading} className="text-xs text-muted hover:text-white px-3">Skip</button>
          </div>
        </div>
      )}

      {/* ── Step 1: Spotify ── */}
      {step === 1 && (
        <div className="fade-in flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white">Connect Spotify</h2>
          <p className="text-xs text-muted leading-relaxed">
            Make sure <code className="text-purple">SPOTIFY_CLIENT_ID</code> and <code className="text-purple">SPOTIFY_CLIENT_SECRET</code> are in your <code>.env</code> file. Add <code>http://127.0.0.1:8888/callback</code> as a Redirect URI in your Spotify app dashboard.
          </p>
          <button
            onClick={handleSpotifyAuth}
            disabled={loading}
            className="bg-[#3a3a3a] hover:bg-[#444] text-white text-xs py-2 px-3 rounded transition-colors"
          >
            {loading ? 'Opening browser...' : 'Open Spotify Auth URL'}
          </button>
          <div>
            <label className="text-xs text-muted block mb-1">Paste the <strong>full redirect URL</strong> from browser:</label>
            <input
              className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-white placeholder-muted"
              placeholder="http://127.0.0.1:8888/callback?code=..."
              value={spotifyCode}
              onChange={e => setSpotifyCode(e.target.value)}
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSpotifyCodeSubmit} disabled={loading}
              className="flex-1 bg-[#1DB954] hover:bg-[#1aa34a] text-white text-xs py-2 rounded transition-colors">
              Authorize
            </button>
            <button onClick={skipStep} className="text-xs text-muted hover:text-white px-3">Skip</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Canvas ── */}
      {step === 2 && (
        <div className="fade-in flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white">Connect Canvas LMS</h2>
          <p className="text-xs text-muted leading-relaxed">
            Go to your Canvas account → Settings → Approved Integrations → New Access Token. Copy the token.
          </p>
          <div>
            <label className="text-xs text-muted block mb-1">Canvas Base URL:</label>
            <input
              className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-white placeholder-muted"
              placeholder="https://yourschool.instructure.com"
              value={canvasUrl}
              onChange={e => setCanvasUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Canvas API Token:</label>
            <input
              className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-white placeholder-muted"
              placeholder="1234~abcdefghijklmnop..."
              value={canvasToken}
              onChange={e => setCanvasToken(e.target.value)}
              type="password"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleCanvasSave} disabled={loading}
              className="flex-1 bg-amber hover:bg-[#a56614] text-white text-xs py-2 rounded transition-colors">
              Save
            </button>
            <button onClick={skipStep} className="text-xs text-muted hover:text-white px-3">Skip</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Notion ── */}
      {step === 3 && (
        <div className="fade-in flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white">Connect Notion</h2>
          <p className="text-xs text-muted leading-relaxed">
            Go to notion.so/my-integrations → New Integration. Create two databases: "Daily Tasks" (Name, Done, Date) and "Quick Notes" (Name, Body). Share both with your integration.
          </p>
          <div>
            <label className="text-xs text-muted block mb-1">Notion Integration Token:</label>
            <input
              className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-white placeholder-muted"
              placeholder="secret_..."
              value={notionToken}
              onChange={e => setNotionToken(e.target.value)}
              type="password"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Daily Tasks DB ID:</label>
            <input
              className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-white placeholder-muted"
              placeholder="32-char hex from database URL"
              value={notionTasksDb}
              onChange={e => setNotionTasksDb(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Quick Notes DB ID:</label>
            <input
              className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-white placeholder-muted"
              placeholder="32-char hex from database URL"
              value={notionNotesDb}
              onChange={e => setNotionNotesDb(e.target.value)}
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleNotionSave} disabled={loading}
              className="flex-1 bg-[#e8562a] hover:bg-[#d14e26] text-white text-xs py-2 rounded transition-colors">
              Save
            </button>
            <button onClick={skipStep} className="text-xs text-muted hover:text-white px-3">Skip</button>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === 4 && (
        <div className="fade-in flex flex-col gap-3 items-center text-center">
          <div className="text-4xl mt-4">✓</div>
          <h2 className="text-sm font-semibold text-white">You're all set!</h2>
          <p className="text-xs text-muted">
            Notion Planner is ready to use. You can update credentials anytime by editing <code className="text-purple">~/.notion-planner/config.json</code>.
          </p>
          <button onClick={handleFinish}
            className="mt-2 bg-purple hover:bg-[#6e66c8] text-white text-xs py-2 px-6 rounded transition-colors">
            Open App
          </button>
        </div>
      )}
    </div>
  );
}
