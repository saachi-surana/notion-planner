function TasksTab() {
  const { useState, useEffect, useRef } = React;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const result = await window.api.getTasks();
      setTasks(Array.isArray(result) ? result : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function addTask() {
    const text = newTaskText.trim();
    if (!text) return;
    setNewTaskText('');
    try {
      const task = await window.api.addTask(text);
      if (task) setTasks(prev => [...prev, task]);
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleTask(id) {
    try {
      const updated = await window.api.toggleTask(id);
      if (updated) {
        setTasks(prev => prev.map(t => t.id === id ? updated : t));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteTask(id) {
    try {
      await window.api.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addTask();
  }

  const done = tasks.filter(t => t.done);
  const pending = tasks.filter(t => !t.done);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
        <div className="text-xs font-semibold text-white">Today's Tasks</div>
        <div className="text-[10px] text-muted">{done.length}/{tasks.length} done</div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="text-xs text-muted">Loading tasks...</div>
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="text-xs text-muted">No tasks for today. Add one below!</div>
          </div>
        )}

        {/* Pending tasks */}
        {!loading && pending.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => toggleTask(task.id)}
            onDelete={() => deleteTask(task.id)}
          />
        ))}

        {/* Completed tasks */}
        {!loading && done.length > 0 && (
          <>
            <div className="text-[10px] text-muted px-1 py-2 mt-1">COMPLETED</div>
            {done.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* Add Task Input */}
      <div className="border-t border-border px-3 py-2 flex-shrink-0 flex gap-2 items-center">
        <input
          ref={inputRef}
          className="flex-1 bg-card border border-border rounded px-2 py-1.5 text-xs text-white placeholder-muted focus:border-[#555]"
          placeholder="Add a task..."
          value={newTaskText}
          onChange={e => setNewTaskText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={addTask}
          className="w-7 h-7 bg-purple hover:bg-[#6e66c8] text-white rounded text-sm font-bold transition-colors flex items-center justify-center flex-shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete }) {
  return (
    <div className="task-item flex items-center gap-2 py-1.5 px-1 rounded hover:bg-[#252525] group fade-in">
      <button
        onClick={onToggle}
        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          task.done
            ? 'bg-teal border-teal'
            : 'border-[#555] hover:border-[#777]'
        }`}
      >
        {task.done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <span className={`flex-1 text-xs leading-snug ${
        task.done ? 'line-through text-muted' : 'text-white'
      }`}>
        {task.text}
      </span>

      <button
        onClick={onDelete}
        className="delete-btn text-muted hover:text-red-400 text-xs w-4 h-4 flex items-center justify-center flex-shrink-0"
      >
        ×
      </button>
    </div>
  );
}
