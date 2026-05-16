const workflowItems = [
  { title: 'Goal Sheet', detail: 'Draft, submit, and review role-aligned quarterly goals.' },
  { title: 'L1 Manager Approval', detail: 'Keep manager sign-offs visible before tracking begins.' },
  { title: 'Quarterly Check-in', detail: 'Capture progress, comments, blockers, and next actions.' },
  { title: 'Audit Trail', detail: 'Maintain a clear record of status changes and decisions.' }
];

const dashboardRows = [
  { team: 'Operations', planned: 42, actual: 31, status: 'On track' },
  { team: 'People Success', planned: 28, actual: 19, status: 'Review due' },
  { team: 'Engineering', planned: 55, actual: 37, status: 'On track' }
];

function App() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Atomberg Internal</p>
            <h1 className="text-xl font-semibold">AtomGoals</h1>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
            <a href="#workflow" className="hover:text-brand">Workflow</a>
            <a href="#dashboard" className="hover:text-brand">Dashboard</a>
            <a href="#audit" className="hover:text-brand">Audit Trail</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
        <div className="flex flex-col justify-center">
          <span className="mb-4 w-fit rounded-md border border-line bg-white px-3 py-1 text-sm font-medium text-muted">
            HR Goal Planning Workspace
          </span>
          <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-ink md:text-5xl">
            AtomGoals - Goal Setting & Tracking Portal
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            A practical internal portal for goal sheets, quarterly check-ins, planned vs actual tracking,
            manager approvals, and completion visibility across teams.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white shadow-subtle hover:bg-brandDark">
              Create Goal Sheet
            </button>
            <button className="rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
              View Completion Dashboard
            </button>
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-white p-5 shadow-subtle">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="text-lg font-semibold">Quarterly Snapshot</h3>
              <p className="text-sm text-muted">Q2 goal cycle readiness</p>
            </div>
            <span className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Live</span>
          </div>
          <dl className="grid grid-cols-3 gap-3 py-5">
            <div className="rounded-md border border-line p-3">
              <dt className="text-xs font-medium uppercase text-muted">Goal Sheets</dt>
              <dd className="mt-2 text-2xl font-semibold">125</dd>
            </div>
            <div className="rounded-md border border-line p-3">
              <dt className="text-xs font-medium uppercase text-muted">Approvals</dt>
              <dd className="mt-2 text-2xl font-semibold">78</dd>
            </div>
            <div className="rounded-md border border-line p-3">
              <dt className="text-xs font-medium uppercase text-muted">Check-ins</dt>
              <dd className="mt-2 text-2xl font-semibold">34</dd>
            </div>
          </dl>
          <div className="rounded-md bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium">Planned vs Actual Completion</span>
              <span className="text-muted">68%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div className="h-2 w-[68%] rounded-full bg-brand" />
            </div>
          </div>
        </aside>
      </section>

      <section id="workflow" className="border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold">Goal Workflow</h2>
              <p className="mt-2 text-sm text-muted">A focused flow for HR teams, employees, and managers.</p>
            </div>
            <button className="w-fit rounded-md border border-line px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand">
              Configure Cycle
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {workflowItems.map((item, index) => (
              <article key={item.title} className="rounded-lg border border-line p-5">
                <span className="text-sm font-semibold text-accent">Step {index + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="dashboard" className="mx-auto max-w-7xl px-6 py-10">
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-subtle">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-xl font-semibold">Completion Dashboard</h2>
            <p className="mt-1 text-sm text-muted">Representative team-level planned vs actual view.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Team</th>
                  <th className="px-5 py-3 font-semibold">Planned Goals</th>
                  <th className="px-5 py-3 font-semibold">Actual Updates</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dashboardRows.map((row) => (
                  <tr key={row.team}>
                    <td className="px-5 py-4 font-medium">{row.team}</td>
                    <td className="px-5 py-4 text-muted">{row.planned}</td>
                    <td className="px-5 py-4 text-muted">{row.actual}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-ink">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer id="audit" className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <span>AtomGoals base scaffold for hackathon development.</span>
          <span>Audit Trail, JWT, and full workflows planned next.</span>
        </div>
      </footer>
    </main>
  );
}

export default App;
