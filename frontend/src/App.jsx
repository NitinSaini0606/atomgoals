import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const emptyGoal = {
  thrustArea: '',
  title: '',
  description: '',
  uomType: 'NUMERIC',
  scoreDirection: 'MIN',
  targetValue: '',
  deadline: '',
  weight: 10
};

const demoUsers = [
  { role: 'Employee', email: 'employee@atomgoals.com' },
  { role: 'Manager', email: 'manager@atomgoals.com' },
  { role: 'Admin', email: 'admin@atomgoals.com' }
];

function App() {
  const [email, setEmail] = useState('employee@atomgoals.com');
  const [password, setPassword] = useState('password123');
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('atomgoals-session');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('atomgoals-session', JSON.stringify(data));
      setSession(data);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('atomgoals-session');
    setSession(null);
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Atomberg Internal</p>
            <h1 className="text-xl font-semibold">AtomGoals</h1>
          </div>
          {session && (
            <button
              onClick={handleLogout}
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      {!session ? (
        <LoginPage
          email={email}
          password={password}
          error={error}
          isLoading={isLoading}
          setEmail={setEmail}
          setPassword={setPassword}
          onSubmit={handleLogin}
        />
      ) : session.user.role === 'EMPLOYEE' ? (
        <EmployeeGoalSheet session={session} />
      ) : (
        <PlaceholderDashboard user={session.user} />
      )}
    </main>
  );
}

function LoginPage({ email, password, error, isLoading, setEmail, setPassword, onSubmit }) {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_420px] lg:py-14">
      <div className="flex flex-col justify-center">
        <span className="mb-4 w-fit rounded-md border border-line bg-white px-3 py-1 text-sm font-medium text-muted">
          Goal Setting & Tracking Portal
        </span>
        <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-ink md:text-5xl">
          AtomGoals - Goal Setting & Tracking Portal
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
          Sign in to manage Goal Sheets, L1 Manager Approval readiness, Quarterly Check-ins,
          Completion Dashboard visibility, and Audit Trail records.
        </p>
        <div className="mt-8 grid max-w-3xl gap-4 md:grid-cols-3">
          {demoUsers.map((user) => (
            <button
              key={user.email}
              onClick={() => {
                setEmail(user.email);
                setPassword('password123');
              }}
              className="rounded-lg border border-line bg-white p-4 text-left shadow-subtle hover:border-brand"
            >
              <span className="text-sm font-semibold text-brand">{user.role}</span>
              <span className="mt-2 block text-sm text-muted">{user.email}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="rounded-lg border border-line bg-white p-6 shadow-subtle">
        <div className="border-b border-line pb-4">
          <h3 className="text-xl font-semibold">Portal Login</h3>
          <p className="mt-1 text-sm text-muted">Use a demo account to open a role-based dashboard.</p>
        </div>

        <label className="mt-5 block text-sm font-semibold" htmlFor="email">Work email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-md border border-line px-3 py-3 text-sm outline-none focus:border-brand"
          required
        />

        <label className="mt-4 block text-sm font-semibold" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-md border border-line px-3 py-3 text-sm outline-none focus:border-brand"
          required
        />

        {error && <Message tone="error" messages={[error]} />}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-5 w-full rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white shadow-subtle hover:bg-brandDark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}

function EmployeeGoalSheet({ session }) {
  const [goalSheet, setGoalSheet] = useState(null);
  const [form, setForm] = useState(emptyGoal);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json'
  }), [session.token]);

  const goals = goalSheet?.goals || [];
  const isEditable = goalSheet && ['DRAFT', 'REVISION_REQUESTED'].includes(goalSheet.status);
  const totalWeight = goals.reduce((sum, goal) => sum + Number(goal.weight), 0);

  const loadGoalSheet = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      const response = await fetch(`${API_BASE_URL}/employee/goal-sheet`, {
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Could not load Goal Sheet.');
      setGoalSheet(data.goalSheet);
    } catch (loadError) {
      setErrors([loadError.message]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGoalSheet();
  }, []);

  const validateForm = () => {
    const nextErrors = [];

    if (!form.thrustArea.trim()) nextErrors.push('Thrust Area is required.');
    if (!form.title.trim()) nextErrors.push('Goal Title is required.');
    if (!form.description.trim()) nextErrors.push('Goal Description is required.');
    if (!String(form.targetValue).trim()) nextErrors.push('Target Value is required.');
    if (Number(form.weight) < 10) nextErrors.push('Minimum weightage per goal is 10%.');
    if (form.uomType === 'TIMELINE' && !form.deadline) nextErrors.push('Timeline goals must have a deadline.');
    if (!editingId && goals.length >= 8) nextErrors.push('A Goal Sheet can have a maximum of 8 goals.');

    return nextErrors;
  };

  const saveGoal = async (event) => {
    event.preventDefault();
    setNotice('');

    const formErrors = validateForm();
    if (formErrors.length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSaving(true);
    setErrors([]);

    try {
      const response = await fetch(
        editingId ? `${API_BASE_URL}/employee/goals/${editingId}` : `${API_BASE_URL}/employee/goals`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: authHeaders,
          body: JSON.stringify({ ...form, weight: Number(form.weight) })
        }
      );
      const data = response.status === 204 ? {} : await response.json();

      if (!response.ok) {
        throw new ErrorWithMessages(data.message || 'Could not save goal.', data.errors);
      }

      setForm(emptyGoal);
      setEditingId(null);
      setNotice(editingId ? 'Goal updated.' : 'Goal added to your draft Goal Sheet.');
      await loadGoalSheet();
    } catch (saveError) {
      setErrors(saveError.messages || [saveError.message]);
    } finally {
      setIsSaving(false);
    }
  };

  const editGoal = (goal) => {
    setEditingId(goal.id);
    setForm({
      thrustArea: goal.thrustArea,
      title: goal.title,
      description: goal.description || '',
      uomType: goal.uomType,
      scoreDirection: goal.scoreDirection,
      targetValue: goal.targetValue || '',
      deadline: goal.deadline || '',
      weight: goal.weight
    });
    setErrors([]);
    setNotice('');
  };

  const deleteGoal = async (goalId) => {
    setErrors([]);
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/employee/goals/${goalId}`, {
        method: 'DELETE',
        headers: authHeaders
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Could not delete goal.');
      }

      setNotice('Goal removed from your draft Goal Sheet.');
      await loadGoalSheet();
    } catch (deleteError) {
      setErrors([deleteError.message]);
    }
  };

  const submitGoalSheet = async () => {
    setErrors([]);
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/employee/goal-sheet/submit`, {
        method: 'POST',
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok) {
        throw new ErrorWithMessages(data.message || 'Goal Sheet is not ready for submission.', data.errors);
      }

      setGoalSheet(data.goalSheet);
      setNotice('Goal Sheet submitted to your L1 Manager.');
    } catch (submitError) {
      setErrors(submitError.messages || [submitError.message]);
    }
  };

  if (isLoading) {
    return <section className="mx-auto max-w-7xl px-6 py-10 text-sm text-muted">Loading Goal Sheet...</section>;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="rounded-md border border-line bg-white px-3 py-1 text-sm font-medium text-muted">
            Employee Workspace
          </span>
          <h2 className="mt-4 text-3xl font-semibold">Goal Sheet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Create up to 8 goals, keep each goal at 10% or above, and submit only when total weightage is exactly 100%.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-white px-4 py-3 text-sm shadow-subtle">
          <span className="font-semibold">Status:</span> {goalSheet?.status || 'DRAFT'}
        </div>
      </div>

      {notice && <Message tone="success" messages={[notice]} />}
      {errors.length > 0 && <Message tone="error" messages={errors} />}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={saveGoal} className="rounded-lg border border-line bg-white p-5 shadow-subtle">
          <div className="border-b border-line pb-4">
            <h3 className="text-lg font-semibold">{editingId ? 'Edit Goal' : 'Add Goal'}</h3>
            <p className="mt-1 text-sm text-muted">
              {isEditable ? 'Draft goals can be changed until submission.' : 'Submitted goals are locked.'}
            </p>
          </div>

          <Field label="Thrust Area" value={form.thrustArea} disabled={!isEditable} onChange={(value) => setForm({ ...form, thrustArea: value })} />
          <Field label="Goal Title" value={form.title} disabled={!isEditable} onChange={(value) => setForm({ ...form, title: value })} />
          <label className="mt-4 block text-sm font-semibold">Goal Description</label>
          <textarea
            value={form.description}
            disabled={!isEditable}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="mt-2 min-h-24 w-full rounded-md border border-line px-3 py-3 text-sm outline-none focus:border-brand disabled:bg-slate-50"
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SelectField label="UoM Type" value={form.uomType} disabled={!isEditable} options={['NUMERIC', 'PERCENTAGE', 'TIMELINE', 'ZERO_BASED']} onChange={(value) => setForm({ ...form, uomType: value, scoreDirection: ['TIMELINE', 'ZERO_BASED'].includes(value) ? 'NONE' : form.scoreDirection })} />
            <SelectField label="Score Direction" value={form.scoreDirection} disabled={!isEditable} options={['MIN', 'MAX', 'NONE']} onChange={(value) => setForm({ ...form, scoreDirection: value })} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Target Value" value={form.targetValue} disabled={!isEditable} onChange={(value) => setForm({ ...form, targetValue: value })} />
            <Field label="Weightage" type="number" value={form.weight} disabled={!isEditable} onChange={(value) => setForm({ ...form, weight: value })} />
          </div>

          <Field label="Deadline for Timeline Goals" type="date" value={form.deadline} disabled={!isEditable} onChange={(value) => setForm({ ...form, deadline: value })} />

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!isEditable || isSaving}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brandDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : editingId ? 'Update Goal' : 'Add Goal'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyGoal);
                }}
                className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="rounded-lg border border-line bg-white shadow-subtle">
          <div className="flex flex-col justify-between gap-3 border-b border-line px-5 py-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold">Current Goals</h3>
              <p className="mt-1 text-sm text-muted">{goals.length}/8 goals added. Total weightage: {totalWeight}%.</p>
            </div>
            <button
              onClick={submitGoalSheet}
              disabled={!isEditable}
              className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brandDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              Submit to L1 Manager
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Thrust Area</th>
                  <th className="px-4 py-3 font-semibold">Goal Title</th>
                  <th className="px-4 py-3 font-semibold">UoM</th>
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">Deadline</th>
                  <th className="px-4 py-3 font-semibold">Weightage</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {goals.length === 0 ? (
                  <tr><td className="px-4 py-6 text-muted" colSpan="7">No goals added yet.</td></tr>
                ) : goals.map((goal) => (
                  <tr key={goal.id}>
                    <td className="px-4 py-4 font-medium">{goal.thrustArea}</td>
                    <td className="px-4 py-4">{goal.title}</td>
                    <td className="px-4 py-4 text-muted">{goal.uomType}</td>
                    <td className="px-4 py-4 text-muted">{goal.targetValue}</td>
                    <td className="px-4 py-4 text-muted">{goal.deadline || '-'}</td>
                    <td className="px-4 py-4 text-muted">{goal.weight}%</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button disabled={!isEditable} onClick={() => editGoal(goal)} className="rounded-md border border-line px-3 py-1.5 font-semibold hover:border-brand hover:text-brand disabled:opacity-50">Edit</button>
                        <button disabled={!isEditable} onClick={() => deleteGoal(goal.id)} className="rounded-md border border-line px-3 py-1.5 font-semibold hover:border-red-500 hover:text-red-700 disabled:opacity-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlaceholderDashboard({ user }) {
  const title = user.role === 'MANAGER' ? 'Manager Dashboard' : 'Admin Dashboard';
  const summary = user.role === 'MANAGER'
    ? 'L1 Manager Approval will be implemented in the next phase.'
    : 'Completion Dashboard and Audit Trail administration will be implemented in a later phase.';

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <span className="rounded-md border border-line bg-white px-3 py-1 text-sm font-medium text-muted">{user.role}</span>
      <h2 className="mt-4 text-3xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{summary}</p>
    </section>
  );
}

function Field({ label, type = 'text', value, disabled, onChange }) {
  return (
    <label className="mt-4 block text-sm font-semibold">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-line px-3 py-3 text-sm font-normal outline-none focus:border-brand disabled:bg-slate-50"
      />
    </label>
  );
}

function SelectField({ label, value, disabled, options, onChange }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-line px-3 py-3 text-sm font-normal outline-none focus:border-brand disabled:bg-slate-50"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Message({ tone, messages }) {
  const classes = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div className={`mb-5 rounded-md border px-4 py-3 text-sm ${classes}`}>
      {messages.map((message) => <p key={message}>{message}</p>)}
    </div>
  );
}

class ErrorWithMessages extends Error {
  constructor(message, messages) {
    super(message);
    this.messages = messages?.length ? messages : [message];
  }
}

export default App;
