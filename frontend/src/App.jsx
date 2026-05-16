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

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

const formatScore = (value, suffix = '') => {
  const numericValue = Number(value || 0);
  const rounded = Math.round(numericValue * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}${suffix}`;
};

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
      ) : session.user.role === 'MANAGER' ? (
        <ManagerApprovalDashboard session={session} />
      ) : (
        <AdminDashboard session={session} />
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
  const isApprovedLocked = goalSheet?.status === 'APPROVED_LOCKED';
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
      {isApprovedLocked && (
        <Message tone="success" messages={['Goal Sheet approved and locked by your L1 Manager.']} />
      )}
      {goalSheet?.status === 'REVISION_REQUESTED' && goalSheet.managerFeedback && (
        <Message tone="warning" messages={[`L1 Manager feedback: ${goalSheet.managerFeedback}`]} />
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
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

        <div className="min-w-0 rounded-lg border border-line bg-white shadow-subtle">
          <div className="flex flex-col justify-between gap-3 border-b border-line px-5 py-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold">Current Goals</h3>
              <p className="mt-1 text-sm text-muted">{goals.length}/8 goals added. Total weightage: {totalWeight}%.</p>
            </div>
            {!isApprovedLocked && (
              <button
                onClick={submitGoalSheet}
                disabled={!isEditable}
                className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brandDark disabled:cursor-not-allowed disabled:opacity-60"
              >
                Submit to L1 Manager
              </button>
            )}
          </div>

          <div className="w-full max-w-full overflow-x-auto">
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

      {isApprovedLocked && <EmployeeAchievementTracking session={session} />}
    </section>
  );
}

function EmployeeAchievementTracking({ session }) {
  const [quarter, setQuarter] = useState('Q1');
  const [goals, setGoals] = useState([]);
  const [forms, setForms] = useState({});
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json'
  }), [session.token]);

  const loadAchievements = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      const response = await fetch(`${API_BASE_URL}/employee/achievements?quarter=${quarter}`, {
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Could not load Quarterly Updates.');

      setGoals(data.goals || []);
      const nextForms = {};
      for (const goal of data.goals || []) {
        nextForms[goal.id] = {
          id: goal.achievement?.id,
          actualValue: goal.achievement?.actualValue || '',
          status: goal.achievement?.status || 'NOT_STARTED',
          completionDate: goal.achievement?.completionDate || '',
          employeeNote: goal.achievement?.employeeNote || ''
        };
      }
      setForms(nextForms);
    } catch (loadError) {
      setErrors([loadError.message]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAchievements();
  }, [quarter]);

  const updateForm = (goalId, patch) => {
    setForms({ ...forms, [goalId]: { ...forms[goalId], ...patch } });
  };

  const saveAchievement = async (goal) => {
    setErrors([]);
    setNotice('');

    const form = forms[goal.id] || {};
    const payload = { ...form, goalId: goal.id, quarter };
    const url = form.id
      ? `${API_BASE_URL}/employee/achievements/${form.id}`
      : `${API_BASE_URL}/employee/achievements`;

    try {
      const response = await fetch(url, {
        method: form.id ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new ErrorWithMessages(data.message || 'Could not save Quarterly Update.', data.errors);
      }

      setNotice('Quarterly Update saved.');
      await loadAchievements();
    } catch (saveError) {
      setErrors(saveError.messages || [saveError.message]);
    }
  };

  return (
    <div className="mt-8 max-w-full overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
      <div className="flex flex-col justify-between gap-3 border-b border-line px-5 py-4 md:flex-row md:items-center">
        <div>
          <h3 className="text-lg font-semibold">Achievement Tracking</h3>
          <p className="mt-1 text-sm text-muted">Update Actual Achievement and review Planned vs Actual progress for approved locked goals.</p>
        </div>
        <label className="text-sm font-semibold">
          Quarter
          <select
            value={quarter}
            onChange={(event) => setQuarter(event.target.value)}
            className="ml-3 rounded-md border border-line px-3 py-2 text-sm font-normal outline-none focus:border-brand"
          >
            {quarters.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="p-5">
        {notice && <Message tone="success" messages={[notice]} />}
        {errors.length > 0 && <Message tone="error" messages={errors} />}
        {isLoading ? (
          <p className="text-sm text-muted">Loading Quarterly Updates...</p>
        ) : (
          <div className="w-full max-w-full overflow-x-auto">
            <table className="min-w-[960px] table-fixed text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-muted">
                <tr>
                  <th className="w-44 px-3 py-3 font-semibold">Goal Title</th>
                  <th className="w-32 px-3 py-3 font-semibold">Planned Target</th>
                  <th className="w-36 px-3 py-3 font-semibold">Actual Achievement</th>
                  <th className="w-36 px-3 py-3 font-semibold">Status</th>
                  <th className="w-36 px-3 py-3 font-semibold">Completion Date</th>
                  <th className="w-52 px-3 py-3 font-semibold">Employee Note</th>
                  <th className="w-32 px-3 py-3 font-semibold">Progress Score</th>
                  <th className="w-32 px-3 py-3 font-semibold">Weighted Score</th>
                  <th className="w-24 px-3 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {goals.map((goal) => {
                  const form = forms[goal.id] || {};
                  return (
                    <tr key={goal.id}>
                      <td className="whitespace-normal break-words px-3 py-4 font-medium">{goal.title}</td>
                      <td className="whitespace-normal break-words px-3 py-4 text-muted">{goal.targetValue}</td>
                      <td className="px-3 py-4">
                        <InlineInput value={form.actualValue || ''} onChange={(value) => updateForm(goal.id, { actualValue: value })} />
                      </td>
                      <td className="px-3 py-4">
                        <select
                          value={form.status || 'NOT_STARTED'}
                          onChange={(event) => updateForm(goal.id, { status: event.target.value })}
                          className="rounded-md border border-line px-2 py-2 text-sm outline-none focus:border-brand"
                        >
                          {['NOT_STARTED', 'ON_TRACK', 'COMPLETED'].map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-4">
                        <InlineInput type="date" value={form.completionDate || ''} onChange={(value) => updateForm(goal.id, { completionDate: value })} />
                      </td>
                      <td className="px-3 py-4">
                        <input
                          value={form.employeeNote || ''}
                          onChange={(event) => updateForm(goal.id, { employeeNote: event.target.value })}
                          className="w-full rounded-md border border-line px-2 py-2 text-sm outline-none focus:border-brand"
                        />
                      </td>
                      <td className="px-3 py-4 text-muted">{formatScore(goal.achievement?.progressScore, '%')}</td>
                      <td className="px-3 py-4 text-muted">{formatScore(goal.achievement?.weightedScore)}</td>
                      <td className="px-3 py-4">
                        <button onClick={() => saveAchievement(goal)} className="rounded-md bg-brand px-3 py-1.5 font-semibold text-white">
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ManagerApprovalDashboard({ session }) {
  const [goalSheets, setGoalSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ targetValue: '', deadline: '', weight: 10 });
  const [returnComment, setReturnComment] = useState('');
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json'
  }), [session.token]);

  const loadSubmittedSheets = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      const response = await fetch(`${API_BASE_URL}/manager/goal-sheets`, {
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Could not load Submitted Goal Sheets.');

      setGoalSheets(data.goalSheets);
      if (selectedSheet) {
        const refreshed = data.goalSheets.find((sheet) => sheet.id === selectedSheet.id);
        setSelectedSheet(refreshed || null);
      }
    } catch (loadError) {
      setErrors([loadError.message]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmittedSheets();
  }, []);

  const openSheet = async (sheetId) => {
    setErrors([]);
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/manager/goal-sheets/${sheetId}`, {
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Could not open Goal Sheet.');

      setSelectedSheet(data.goalSheet);
      setEditingGoalId(null);
    } catch (openError) {
      setErrors([openError.message]);
    }
  };

  const startGoalEdit = (goal) => {
    setEditingGoalId(goal.id);
    setReviewForm({
      targetValue: goal.targetValue || '',
      deadline: goal.deadline || '',
      weight: goal.weight
    });
    setErrors([]);
    setNotice('');
  };

  const saveManagerEdit = async (goal) => {
    setErrors([]);
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/manager/goal-sheets/${selectedSheet.id}/goals/${goal.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ ...reviewForm, weight: Number(reviewForm.weight) })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new ErrorWithMessages(data.message || 'Could not update goal review fields.', data.errors);
      }

      const updatedGoals = selectedSheet.goals.map((item) => item.id === goal.id ? data.goal : item);
      setSelectedSheet({ ...selectedSheet, goals: updatedGoals });
      setEditingGoalId(null);
      setNotice('Manager review fields updated.');
    } catch (saveError) {
      setErrors(saveError.messages || [saveError.message]);
    }
  };

  const returnForRework = async () => {
    setErrors([]);
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/manager/goal-sheets/${selectedSheet.id}/return`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ comment: returnComment })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not return Goal Sheet for rework.');
      }

      setNotice('Goal Sheet returned for rework.');
      setReturnComment('');
      setSelectedSheet(null);
      await loadSubmittedSheets();
    } catch (returnError) {
      setErrors([returnError.message]);
    }
  };

  const approveAndLock = async () => {
    setErrors([]);
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/manager/goal-sheets/${selectedSheet.id}/approve`, {
        method: 'POST',
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok) {
        throw new ErrorWithMessages(data.message || 'Could not approve Goal Sheet.', data.errors);
      }

      setNotice('Goal Sheet approved and locked.');
      setSelectedSheet(data.goalSheet);
      await loadSubmittedSheets();
    } catch (approveError) {
      setErrors(approveError.messages || [approveError.message]);
    }
  };

  const totalWeight = selectedSheet?.goals.reduce((sum, goal) => sum + Number(goal.weight), 0) || 0;

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <span className="rounded-md border border-line bg-white px-3 py-1 text-sm font-medium text-muted">
          Manager Workspace
        </span>
        <h2 className="mt-4 text-3xl font-semibold">L1 Manager Approval</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Review Submitted Goal Sheets from your direct reports. Adjust only Target Value, Deadline, and Weightage before returning or approving.
        </p>
      </div>

      {notice && <Message tone="success" messages={[notice]} />}
      {errors.length > 0 && <Message tone="error" messages={errors} />}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-lg border border-line bg-white shadow-subtle">
          <div className="border-b border-line px-5 py-4">
            <h3 className="text-lg font-semibold">Submitted Goal Sheets</h3>
            <p className="mt-1 text-sm text-muted">{isLoading ? 'Loading...' : `${goalSheets.length} awaiting review`}</p>
          </div>
          <div className="divide-y divide-line">
            {goalSheets.length === 0 && (
              <p className="px-5 py-5 text-sm text-muted">No submitted Goal Sheets are waiting for L1 Manager Approval.</p>
            )}
            {goalSheets.map((sheet) => (
              <button
                key={sheet.id}
                onClick={() => openSheet(sheet.id)}
                className="block w-full px-5 py-4 text-left hover:bg-slate-50"
              >
                <span className="block text-sm font-semibold">{sheet.owner.name}</span>
                <span className="mt-1 block text-sm text-muted">{sheet.cycle.name} - {sheet.goals.length} goals</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
          {!selectedSheet ? (
            <div className="px-5 py-8 text-sm text-muted">Select a Submitted Goal Sheet to review.</div>
          ) : (
            <>
              <div className="flex flex-col justify-between gap-3 border-b border-line px-5 py-4 md:flex-row md:items-center">
                <div>
                  <h3 className="text-lg font-semibold">{selectedSheet.owner.name}</h3>
                  <p className="mt-1 text-sm text-muted">
                    Status: {selectedSheet.status} | Total weightage: {totalWeight}%
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={approveAndLock} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brandDark">
                    Approve & Lock
                  </button>
                </div>
              </div>

              <div className="w-full max-w-full overflow-x-auto">
                <table className="min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Thrust Area</th>
                      <th className="px-4 py-3 font-semibold">Goal Title</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold">UoM Type</th>
                      <th className="px-4 py-3 font-semibold">Target Value</th>
                      <th className="px-4 py-3 font-semibold">Deadline</th>
                      <th className="px-4 py-3 font-semibold">Weightage</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {selectedSheet.goals.map((goal) => {
                      const isEditing = editingGoalId === goal.id;

                      return (
                        <tr key={goal.id}>
                          <td className="px-4 py-4 font-medium">{goal.thrustArea}</td>
                          <td className="px-4 py-4">{goal.title}</td>
                          <td className="px-4 py-4 text-muted">{goal.description}</td>
                          <td className="px-4 py-4 text-muted">{goal.uomType}</td>
                          <td className="px-4 py-4">
                            {isEditing ? <InlineInput value={reviewForm.targetValue} onChange={(value) => setReviewForm({ ...reviewForm, targetValue: value })} /> : goal.targetValue}
                          </td>
                          <td className="px-4 py-4">
                            {isEditing ? <InlineInput type="date" value={reviewForm.deadline} onChange={(value) => setReviewForm({ ...reviewForm, deadline: value })} /> : goal.deadline || '-'}
                          </td>
                          <td className="px-4 py-4">
                            {isEditing ? <InlineInput type="number" value={reviewForm.weight} onChange={(value) => setReviewForm({ ...reviewForm, weight: value })} /> : `${goal.weight}%`}
                          </td>
                          <td className="px-4 py-4 text-muted">{goal.status}</td>
                          <td className="px-4 py-4">
                            {isEditing ? (
                              <div className="flex gap-2">
                                <button onClick={() => saveManagerEdit(goal)} className="rounded-md bg-brand px-3 py-1.5 font-semibold text-white">Save</button>
                                <button onClick={() => setEditingGoalId(null)} className="rounded-md border border-line px-3 py-1.5 font-semibold">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => startGoalEdit(goal)} className="rounded-md border border-line px-3 py-1.5 font-semibold hover:border-brand hover:text-brand">Edit</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-line p-5">
                <label className="block text-sm font-semibold">
                  Return for Rework Comment
                  <textarea
                    value={returnComment}
                    onChange={(event) => setReturnComment(event.target.value)}
                    className="mt-2 min-h-20 w-full rounded-md border border-line px-3 py-3 text-sm font-normal outline-none focus:border-brand"
                    placeholder="Explain what the employee should revise before resubmitting."
                  />
                </label>
                <button onClick={returnForRework} className="mt-3 rounded-md border border-line px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand">
                  Return for Rework
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ManagerCheckIns session={session} />
    </section>
  );
}

function ManagerCheckIns({ session }) {
  const [quarter, setQuarter] = useState('Q1');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [progress, setProgress] = useState(null);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json'
  }), [session.token]);

  const loadCheckIns = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      const response = await fetch(`${API_BASE_URL}/manager/checkins?quarter=${quarter}`, {
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Could not load Quarterly Check-ins.');

      setEmployees(data.employees || []);
      setSelectedEmployee(null);
      setProgress(null);
    } catch (loadError) {
      setErrors([loadError.message]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCheckIns();
  }, [quarter]);

  const openEmployeeProgress = async (employeeId) => {
    setErrors([]);
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/manager/checkins/${employeeId}?quarter=${quarter}`, {
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Could not open employee progress.');

      setSelectedEmployee(data.employee);
      setProgress(data);
      setComment(data.checkIn?.comment || '');
    } catch (openError) {
      setErrors([openError.message]);
    }
  };

  const completeCheckIn = async () => {
    setErrors([]);
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/manager/checkins/${selectedEmployee.id}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ quarter, comment, completed: true })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Could not complete Quarterly Check-in.');

      setProgress({ ...progress, checkIn: data.checkIn });
      setNotice('Quarterly Check-in completed.');
      await loadCheckIns();
    } catch (saveError) {
      setErrors([saveError.message]);
    }
  };

  return (
    <div className="mt-8 max-w-full overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
      <div className="flex flex-col justify-between gap-3 border-b border-line px-5 py-4 md:flex-row md:items-center">
        <div>
          <h3 className="text-lg font-semibold">Quarterly Check-ins</h3>
          <p className="mt-1 text-sm text-muted">Review Planned vs Actual progress and complete manager check-ins for direct reports.</p>
        </div>
        <label className="text-sm font-semibold">
          Quarter
          <select
            value={quarter}
            onChange={(event) => setQuarter(event.target.value)}
            className="ml-3 rounded-md border border-line px-3 py-2 text-sm font-normal outline-none focus:border-brand"
          >
            {quarters.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="grid min-w-0 gap-6 p-5 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-lg border border-line">
          <div className="border-b border-line px-4 py-3">
            <h4 className="font-semibold">Team Members</h4>
            <p className="mt-1 text-sm text-muted">{isLoading ? 'Loading...' : `${employees.length} approved Goal Sheets`}</p>
          </div>
          <div className="divide-y divide-line">
            {employees.length === 0 && <p className="px-4 py-4 text-sm text-muted">No approved locked Goal Sheets for this quarter.</p>}
            {employees.map((item) => (
              <button
                key={item.employee.id}
                onClick={() => openEmployeeProgress(item.employee.id)}
                className="block w-full px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="block text-sm font-semibold">{item.employee.name}</span>
                <span className="mt-1 block text-sm text-muted">
                  Weighted Score: {formatScore(item.weightedScore)} | {item.checkIn?.status || 'DRAFT'}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          {notice && <Message tone="success" messages={[notice]} />}
          {errors.length > 0 && <Message tone="error" messages={errors} />}

          {!progress ? (
            <p className="rounded-lg border border-line px-5 py-8 text-sm text-muted">Select a team member to open Quarterly Check-in progress.</p>
          ) : (
            <div className="space-y-5">
              {progress.checkIn?.status === 'COMPLETED' && (
                <Message tone="success" messages={['Check-in completed and locked.']} />
              )}
              <div>
                <h4 className="text-lg font-semibold">{selectedEmployee.name}</h4>
                <p className="mt-1 text-sm text-muted">Quarter: {quarter} | Check-in: {progress.checkIn?.status || 'DRAFT'}</p>
              </div>

              <div className="w-full max-w-full overflow-x-auto rounded-lg border border-line">
                <table className="min-w-[840px] table-fixed text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-muted">
                    <tr>
                      <th className="w-44 px-3 py-3 font-semibold">Goal Title</th>
                      <th className="w-32 px-3 py-3 font-semibold">Planned Target</th>
                      <th className="w-36 px-3 py-3 font-semibold">Actual Achievement</th>
                      <th className="w-36 px-3 py-3 font-semibold">Employee Status</th>
                      <th className="w-32 px-3 py-3 font-semibold">Progress Score</th>
                      <th className="w-32 px-3 py-3 font-semibold">Weighted Score</th>
                      <th className="w-56 px-3 py-3 font-semibold">Employee Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {progress.goals.map((goal) => (
                      <tr key={goal.id}>
                        <td className="whitespace-normal break-words px-3 py-4 font-medium">{goal.title}</td>
                        <td className="whitespace-normal break-words px-3 py-4 text-muted">{goal.targetValue}</td>
                        <td className="whitespace-normal break-words px-3 py-4 text-muted">{goal.achievement?.actualValue || '-'}</td>
                        <td className="whitespace-normal break-words px-3 py-4 text-muted">{goal.achievement?.status || 'NOT_STARTED'}</td>
                        <td className="px-3 py-4 text-muted">{formatScore(goal.achievement?.progressScore, '%')}</td>
                        <td className="px-3 py-4 text-muted">{formatScore(goal.achievement?.weightedScore)}</td>
                        <td className="whitespace-normal break-words px-3 py-4 text-muted">{goal.achievement?.employeeNote || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="block text-sm font-semibold">
                Manager Check-in Comment
                {progress.checkIn?.status === 'COMPLETED' ? (
                  <div className="mt-2 min-h-20 rounded-md border border-line bg-slate-50 px-3 py-3 text-sm font-normal leading-6 text-ink">
                    {progress.checkIn.comment}
                  </div>
                ) : (
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="mt-2 min-h-24 w-full rounded-md border border-line px-3 py-3 text-sm font-normal outline-none focus:border-brand"
                    placeholder="Summarize the quarterly discussion, risks, and next actions."
                  />
                )}
              </label>
              {progress.checkIn?.status !== 'COMPLETED' && (
                <button onClick={completeCheckIn} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brandDark">
                  Mark Check-in Completed
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ session }) {
  const [dashboard, setDashboard] = useState(null);
  const [completionRows, setCompletionRows] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [unlockReasonById, setUnlockReasonById] = useState({});
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json'
  }), [session.token]);

  const loadAdminData = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      const [dashboardResponse, completionResponse, auditResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/dashboard`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/admin/completion`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/admin/audit-logs`, { headers: authHeaders })
      ]);

      const dashboardData = await dashboardResponse.json();
      const completionData = await completionResponse.json();
      const auditData = await auditResponse.json();

      if (!dashboardResponse.ok) throw new Error(dashboardData.message || 'Could not load Admin Dashboard.');
      if (!completionResponse.ok) throw new Error(completionData.message || 'Could not load Completion Dashboard.');
      if (!auditResponse.ok) throw new Error(auditData.message || 'Could not load Audit Trail.');

      setDashboard(dashboardData);
      setCompletionRows(completionData.rows || []);
      setAuditLogs(auditData.auditLogs || []);
    } catch (loadError) {
      setErrors([loadError.message]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const unlockGoalSheet = async (sheetId) => {
    setErrors([]);
    setNotice('');

    try {
      const response = await fetch(`${API_BASE_URL}/admin/goal-sheets/${sheetId}/unlock`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason: unlockReasonById[sheetId] || '' })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Could not unlock Goal Sheet.');

      setNotice('Goal Sheet unlocked and moved to Revision Requested.');
      setUnlockReasonById({ ...unlockReasonById, [sheetId]: '' });
      await loadAdminData();
    } catch (unlockError) {
      setErrors([unlockError.message]);
    }
  };

  const downloadAchievementCsv = async () => {
    setErrors([]);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/reports/achievement.csv`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });

      if (!response.ok) throw new Error('Could not export Achievement Report.');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'atomgoals-achievement-report.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setErrors([exportError.message]);
    }
  };

  const summaryCards = dashboard ? [
    ['Total Employees', dashboard.summary.totalEmployees],
    ['Total Managers', dashboard.summary.totalManagers],
    ['Goal Sheets Draft', dashboard.summary.goalSheetsDraft],
    ['Goal Sheets Submitted', dashboard.summary.goalSheetsSubmitted],
    ['Returned for Rework', dashboard.summary.goalSheetsReturned],
    ['Approved/Locked', dashboard.summary.goalSheetsApprovedLocked],
    ['Q1 Check-ins', `${dashboard.summary.checkIns.Q1.completed} completed / ${dashboard.summary.checkIns.Q1.pending} pending`],
    ['Q2 Check-ins', `${dashboard.summary.checkIns.Q2.completed} completed / ${dashboard.summary.checkIns.Q2.pending} pending`],
    ['Q3 Check-ins', `${dashboard.summary.checkIns.Q3.completed} completed / ${dashboard.summary.checkIns.Q3.pending} pending`],
    ['Q4 Check-ins', `${dashboard.summary.checkIns.Q4.completed} completed / ${dashboard.summary.checkIns.Q4.pending} pending`]
  ] : [];

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="rounded-md border border-line bg-white px-3 py-1 text-sm font-medium text-muted">Admin Workspace</span>
          <h2 className="mt-4 text-3xl font-semibold">Admin Dashboard</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Monitor Goal Sheet governance, Check-in Completion, Audit Trail activity, and Achievement Report exports.
          </p>
        </div>
        <button onClick={downloadAchievementCsv} className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brandDark">
          Export Achievement Report
        </button>
      </div>

      {notice && <Message tone="success" messages={[notice]} />}
      {errors.length > 0 && <Message tone="error" messages={errors} />}

      {isLoading ? (
        <p className="text-sm text-muted">Loading Admin Dashboard...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map(([label, value]) => (
              <article key={label} className="rounded-lg border border-line bg-white p-4 shadow-subtle">
                <p className="text-sm font-semibold text-muted">{label}</p>
                <p className="mt-3 text-2xl font-semibold">{value}</p>
              </article>
            ))}
          </div>

          <AdminCompletionTable rows={completionRows} />
          <AdminUnlockPanel
            sheets={dashboard.unlockableGoalSheets}
            reasons={unlockReasonById}
            setReasons={setUnlockReasonById}
            onUnlock={unlockGoalSheet}
          />
          <AdminAuditTrail logs={auditLogs} />
        </>
      )}
    </section>
  );
}

function AdminCompletionTable({ rows }) {
  return (
    <div className="mt-8 max-w-full overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold">Completion Dashboard</h3>
        <p className="mt-1 text-sm text-muted">Employee-level Goal Sheet and Check-in Completion status.</p>
      </div>
      <div className="w-full max-w-full overflow-x-auto">
        <table className="min-w-[980px] table-fixed text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-muted">
            <tr>
              <th className="w-44 px-3 py-3 font-semibold">Employee Name</th>
              <th className="w-44 px-3 py-3 font-semibold">Manager Name</th>
              <th className="w-40 px-3 py-3 font-semibold">Goal Sheet Status</th>
              <th className="w-24 px-3 py-3 font-semibold">Total Goals</th>
              <th className="w-28 px-3 py-3 font-semibold">Total Weightage</th>
              <th className="w-28 px-3 py-3 font-semibold">Q1 Check-in</th>
              <th className="w-28 px-3 py-3 font-semibold">Q2 Check-in</th>
              <th className="w-28 px-3 py-3 font-semibold">Q3 Check-in</th>
              <th className="w-28 px-3 py-3 font-semibold">Q4 Check-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.employeeEmail}>
                <td className="whitespace-normal break-words px-3 py-4 font-medium">{row.employeeName}</td>
                <td className="whitespace-normal break-words px-3 py-4 text-muted">{row.managerName || '-'}</td>
                <td className="px-3 py-4 text-muted">{row.goalSheetStatus}</td>
                <td className="px-3 py-4 text-muted">{row.totalGoals}</td>
                <td className="px-3 py-4 text-muted">{row.totalWeightage}%</td>
                <td className="px-3 py-4 text-muted">{row.q1CheckInStatus}</td>
                <td className="px-3 py-4 text-muted">{row.q2CheckInStatus}</td>
                <td className="px-3 py-4 text-muted">{row.q3CheckInStatus}</td>
                <td className="px-3 py-4 text-muted">{row.q4CheckInStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminUnlockPanel({ sheets, reasons, setReasons, onUnlock }) {
  return (
    <div className="mt-8 rounded-lg border border-line bg-white shadow-subtle">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold">Goal Unlock</h3>
        <p className="mt-1 text-sm text-muted">Unlock approved Goal Sheets only when a governed revision is required.</p>
      </div>
      <div className="divide-y divide-line">
        {sheets.length === 0 && <p className="px-5 py-5 text-sm text-muted">No approved locked Goal Sheets available for unlock.</p>}
        {sheets.map((sheet) => (
          <div key={sheet.id} className="grid min-w-0 gap-3 px-5 py-4 lg:grid-cols-[1fr_360px_110px] lg:items-center">
            <div className="min-w-0">
              <p className="font-semibold">{sheet.employeeName}</p>
              <p className="mt-1 text-sm text-muted">{sheet.employeeEmail} | Manager: {sheet.managerName || '-'}</p>
            </div>
            <input
              value={reasons[sheet.id] || ''}
              onChange={(event) => setReasons({ ...reasons, [sheet.id]: event.target.value })}
              className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="Reason for unlock"
            />
            <button onClick={() => onUnlock(sheet.id)} className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand">
              Unlock
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAuditTrail({ logs }) {
  return (
    <div className="mt-8 max-w-full overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold">Audit Trail</h3>
        <p className="mt-1 text-sm text-muted">Newest-first governance activity across goal sheets, achievements, and check-ins.</p>
      </div>
      <div className="w-full max-w-full overflow-x-auto">
        <table className="min-w-[980px] table-fixed text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-muted">
            <tr>
              <th className="w-44 px-3 py-3 font-semibold">Timestamp</th>
              <th className="w-44 px-3 py-3 font-semibold">Actor/User</th>
              <th className="w-56 px-3 py-3 font-semibold">Action</th>
              <th className="w-32 px-3 py-3 font-semibold">Entity Type</th>
              <th className="w-24 px-3 py-3 font-semibold">Entity ID</th>
              <th className="w-80 px-3 py-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-3 py-4 text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="whitespace-normal break-words px-3 py-4 text-muted">{log.actor ? `${log.actor.name} (${log.actor.role})` : 'System'}</td>
                <td className="whitespace-normal break-words px-3 py-4 font-medium">{log.action}</td>
                <td className="px-3 py-4 text-muted">{log.entityType}</td>
                <td className="px-3 py-4 text-muted">{log.entityId || '-'}</td>
                <td className="whitespace-normal break-words px-3 py-4 text-muted">{log.details ? JSON.stringify(log.details) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

function InlineInput({ type = 'text', value, onChange }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-32 rounded-md border border-line px-2 py-2 text-sm outline-none focus:border-brand"
    />
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
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
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
