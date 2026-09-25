export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-2 px-4">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Team Tracker</h1>
        <p className="text-sm text-muted">Projects, tasks, and hours for the team</p>
      </div>
      {children}
    </div>
  );
}
