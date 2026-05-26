import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, ClipboardList, Activity,
  Wrench, Bell, AlertTriangle, Users, Settings, Zap, LogOut, CalendarDays, FileText,
  Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type NavItem = { to: string; icon: any; label: string; roles?: string[] };

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/journee', icon: BookOpen, label: 'Journée' },
  { to: '/releves-bloc', icon: Activity, label: 'Relevés Chef Bloc', roles: ['chef_bloc', 'chef_quart', 'admin', 'chef_exploitation'] },
  { to: '/releves-op', icon: ClipboardList, label: 'Saisie Relevés Op.', roles: ['operateur', 'chef_quart', 'admin', 'chef_exploitation'] },
  { to: '/manouvres', icon: Zap, label: 'Manœuvres' },
  { to: '/alarmes', icon: Bell, label: 'Alarmes Répétitives' },
  { to: '/ordres-travaux', icon: Wrench, label: 'Ordres de Travaux' },
  { to: '/defauts', icon: AlertTriangle, label: 'Matériels Défectueux' },
  { to: '/releves-jour', icon: CalendarDays, label: 'Visualisation' },
  { to: '/rapport', icon: FileText, label: 'Rapport Journalier' },
];

const adminItems = [
  { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { to: '/admin/seuils', icon: Settings, label: 'Seuils d\'alerte' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col h-screen sticky top-0 print:hidden">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="GTpp Logo" className="w-10 h-10 object-contain" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">GTpp</p>
            <p className="text-slate-400 text-xs">La Goulette GE 9001E</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-0.5">
          {navItems.filter(({ roles }) => !roles || roles.includes(user?.role ?? '')).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-300 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>

        {(user?.role === 'admin' || user?.role === 'chef_exploitation') && (
          <div className="mt-4">
            <p className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Administration</p>
            <div className="space-y-0.5">
              {adminItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-500/15 text-blue-300 font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-slate-700 px-3 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-xs">
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.prenom} {user?.nom}</p>
            <p className="text-slate-400 text-xs">{user?.matricule}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            className="flex items-center gap-2 text-slate-400 hover:text-amber-400 text-xs transition-colors px-1"
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-xs transition-colors w-full px-1"
        >
          <LogOut size={13} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
