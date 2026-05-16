import { useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const demoUsers = [
  { role: 'Employee', email: 'employee@atomgoals.com' },
  { role: 'Manager', email: 'manager@atomgoals.com' },
  { role: 'Admin', email: 'admin@atomgoals.com' }
];

const roleContent = {
  EMPLOYEE: {
    title: 'Employee Dashboard',
    summary: 'Prepare your Goal Sheet, track Planned vs Actual progress, and submit Quarterly Check-ins.',
    primaryAction: 'Goal Sheet Draft',
    cards: [
      ['Goal Sheet', 'Not started'],
      ['L1 Manager Approval', 'Pending submission'],
      ['Quarterly Check-in', 'No check-in due']
    ]
  },
  MANAGER: {
    title: 'Manager Dashboard',
    summary: 'Review team Goal Sheets, complete L1 Manager Approval, and monitor check-in readiness.',
    primaryAction: 'Review Team Goals',
    cards: [
      ['Team Goal Sheets', 'Awaiting review'],
      ['L1 Manager Approval', '3 pending'],
      ['Planned vs Actual', 'Team view placeholder']
    ]
  },
  ADMIN: {
    title: 'Admin Dashboard',
    summary: 'Monitor completion health, audit workflow changes, and prepare cycle-level reporting.',
    primaryAction: 'Completion Dashboard',
    cards: [
      ['Goal Cycle', 'Setup placeholder'],
      ['Completion Dashboard', 'Demo view'],
      ['Audit Trail', 'Ready for event logs']
    ]
  }
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

  const dashboard = useMemo(() => {
    return session?.user?.role ? roleContent[session.user.role] : null;
  }, [session]);

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
        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_420px] lg:py-14">
          <div className="flex flex-col justify-center">
            <span className="mb-4 w-fit rounded-md border border-line bg-white px-3 py-1 text-sm font-medium text-muted">
              Goal Setting & Tracking Portal
            </span>
            <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-ink md:text-5xl">
              AtomGoals - Goal Setting & Tracking Portal
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
              Sign in to access the right workspace for Goal Sheet planning, L1 Manager Approval,
              Quarterly Check-ins, Completion Dashboard visibility, and Audit Trail readiness.
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

          <form onSubmit={handleLogin} className="rounded-lg border border-line bg-white p-6 shadow-subtle">
            <div className="border-b border-line pb-4">
              <h3 className="text-xl font-semibold">Portal Login</h3>
              <p className="mt-1 text-sm text-muted">Use a demo account to open a role-based dashboard.</p>
            </div>

            <label className="mt-5 block text-sm font-semibold" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-line px-3 py-3 text-sm outline-none focus:border-brand"
              required
            />

            <label className="mt-4 block text-sm font-semibold" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-line px-3 py-3 text-sm outline-none focus:border-brand"
              required
            />

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-5 w-full rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white shadow-subtle hover:bg-brandDark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>
      ) : (
        <Dashboard user={session.user} dashboard={dashboard} />
      )}
    </main>
  );
}

function Dashboard({ user, dashboard }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="rounded-md border border-line bg-white px-3 py-1 text-sm font-medium text-muted">
            {user.role.replace('_', ' ')}
          </span>
          <h2 className="mt-4 text-3xl font-semibold">{dashboard.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{dashboard.summary}</p>
        </div>
        <button className="w-fit rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white shadow-subtle hover:bg-brandDark">
          {dashboard.primaryAction}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {dashboard.cards.map(([label, value]) => (
          <article key={label} className="rounded-lg border border-line bg-white p-5 shadow-subtle">
            <p className="text-sm font-semibold text-muted">{label}</p>
            <p className="mt-3 text-xl font-semibold">{value}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
        <div className="border-b border-line px-5 py-4">
          <h3 className="text-lg font-semibold">Workflow Preview</h3>
          <p className="mt-1 text-sm text-muted">Placeholders only. Goal creation is intentionally not implemented yet.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Area</th>
                <th className="px-5 py-3 font-semibold">Owner</th>
                <th className="px-5 py-3 font-semibold">Current State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="px-5 py-4 font-medium">Goal Sheet</td>
                <td className="px-5 py-4 text-muted">{user.name}</td>
                <td className="px-5 py-4 text-muted">Schema and auth ready</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-medium">Quarterly Check-in</td>
                <td className="px-5 py-4 text-muted">Employee and manager</td>
                <td className="px-5 py-4 text-muted">Placeholder</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-medium">Audit Trail</td>
                <td className="px-5 py-4 text-muted">Admin</td>
                <td className="px-5 py-4 text-muted">Model available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default App;
