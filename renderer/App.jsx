const { useState, useEffect } = React;

function App() {
  const [setupComplete, setSetupComplete] = useState(null); // null = loading
  const [activeTab, setActiveTab] = useState('cal');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    window.api.checkSetup().then(({ complete }) => {
      setSetupComplete(complete);
    });
  }, []);

  if (setupComplete === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-muted text-sm">Loading...</div>
      </div>
    );
  }

  if (!setupComplete) {
    return <SetupScreen onComplete={() => setSetupComplete(true)} />;
  }

  const tabs = [
    { id: 'cal', label: 'Cal' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'focus', label: 'Focus' },
    { id: 'music', label: 'Music' },
  ];

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Drag region for hidden title bar (traffic lights sit here) */}
      <div className="drag-region" />

      {/* Tab Bar */}
      <div className="flex border-b border-border flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-cardHover text-text'
                : 'text-muted hover:text-text hover:bg-card'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'cal' && <CalendarTab />}
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'focus' && <FocusTab />}
        {activeTab === 'music' && <MusicTab />}
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border p-2 flex-shrink-0">
        <button
          onClick={() => setShowQuickAdd(true)}
          className="w-full py-1.5 text-xs text-muted hover:text-text border border-border hover:border-teal rounded transition-colors"
        >
          + Add to Notion
        </button>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
