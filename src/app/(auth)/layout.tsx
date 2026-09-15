export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Team Tracker</h1>
        <p className="text-sm text-slate-400">Projects, tasks, and hours for the team</p>
      </div>
      {children}
    </div>
  );
}
