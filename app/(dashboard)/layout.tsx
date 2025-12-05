import { Sidebar } from "@/components/layout/Sidebar"
import { AuthProvider } from "@/components/AuthProvider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen bg-gradient-to-br from-white via-slate-50/30 to-slate-100/50 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}

