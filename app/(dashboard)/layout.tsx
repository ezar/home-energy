import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Zap, BarChart3, DollarSign, TrendingUp, Settings } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SignOutButton } from '@/components/dashboard/SignOutButton'

const navItems = [
  { href: '/', label: 'Resumen', icon: Zap },
  { href: '/consumo', label: 'Consumo', icon: BarChart3 },
  { href: '/coste', label: 'Coste', icon: DollarSign },
  { href: '/pvpc', label: 'PVPC', icon: TrendingUp },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { display_name: string | null; email: string } | null

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-400" />
          <span className="font-semibold text-sm">Energy Dashboard</span>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-3 space-y-2">
          <p className="text-xs text-muted-foreground px-3 truncate">
            {profile?.display_name ?? profile?.email ?? user.email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
