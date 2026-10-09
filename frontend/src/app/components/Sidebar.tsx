import { Calendar, Users, FileText, BarChart3 } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  fullName: string;
  username?: string | null;
  avatarUrl?: string | null;
  onProfileOpen?: () => void;
}

export function Sidebar({ activeView, onViewChange, fullName, username, avatarUrl, onProfileOpen }: SidebarProps) {
  const { t } = useTranslation();

  const menuItems = [
    { id: 'patients', label: t('dashboard.patients'), icon: Users },
    { id: 'calendar', label: t('dashboard.schedule'), icon: Calendar },
    { id: 'notes', label: t('dashboard.notes'), icon: FileText },
    { id: 'analytics', label: t('dashboard.analytics'), icon: BarChart3 },
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-screen flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-primary">MindCare Pro</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('role.psychologist')}</p>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          type="button"
          onClick={onProfileOpen}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:bg-sidebar-accent"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              {fullName.split(' ').map((namePart) => namePart[0]).join('')}
            </div>
          )}
          <div>
            <p className="text-sm">{fullName}</p>
            <p className="text-xs text-muted-foreground">{username ? `@${username}` : t('role.psychologist')}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
