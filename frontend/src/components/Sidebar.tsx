'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Activity, Database, Anchor, BarChart2, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Port Map', href: '/map', icon: Map },
    { name: 'Simulation', href: '/simulation', icon: Activity },
    { name: 'Historical Port Data', href: '/real-time', icon: Database },
    { name: 'Ship Energy Prediction', href: '/prediction', icon: BarChart2 },
  ];

  const handleLogout = () => {
    logout();
  };

  // Get initials from user name (improved to handle edge cases)
  const getUserInitials = (name: string): string => {
    const cleanName = name.trim();
    if (!cleanName) return 'U';
    
    return cleanName
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get display name with better formatting
  const getDisplayName = (name: string): string => {
    const parts = name.trim().split(' ').filter(part => part.length > 0);
    if (parts.length === 0) return 'User';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} ${parts[1].charAt(0)}.`;
    
    // For 3+ parts, show first name + last initial
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };

  // Smart email truncation that preserves domain
  const getDisplayEmail = (email: string): string => {
    if (email.length <= 25) return email;
    
    const [localPart, domain] = email.split('@');
    if (!domain) return email; // Fallback for invalid email
    
    // If local part is too long, truncate it but keep domain visible
    if (localPart.length > 15) {
      return `${localPart.substring(0, 12)}...@${domain}`;
    }
    
    return email;
  };

  // Get role based on email domain
  const getUserRole = (email: string): string => {
    if (email === 'diogo.paulino10@gmail.com') return 'System Administrator';
    if (email.endsWith('@apram.pt')) return 'Port Authority Staff';
    return 'Authorized User';
  };

  return (
    <div className="h-full w-64 bg-sidebar-bg text-sidebar-text p-4 flex flex-col">
      <div className="mb-8 flex items-center gap-3">
        <Anchor className="h-8 w-8" />
        <h1 className="text-xl font-bold text-sidebar-text">Port Digital Twin</h1>
      </div>
      
      {/* Clean User profile without logout button */}
      {user && (
        <div className="mb-6 p-4 bg-gray-700 dark:bg-gray-600 rounded-lg border border-gray-600 dark:border-gray-500">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="bg-blue-600 dark:bg-blue-500 p-2.5 rounded-full flex items-center justify-center min-w-[2.75rem] h-11 shadow-md">
                <span className="text-white font-bold text-sm">
                  {getUserInitials(user.name)}
                </span>
              </div>
              {/* Online status indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-700 dark:border-gray-600 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p 
                className="font-semibold text-sidebar-text truncate text-sm leading-tight mb-1" 
                title={user.name}
              >
                {getDisplayName(user.name)}
              </p>
              <p 
                className="text-xs text-gray-400 dark:text-gray-300 truncate leading-tight mb-1" 
                title={user.email}
              >
                {getDisplayEmail(user.email)}
              </p>
              <p className="text-xs text-blue-400 dark:text-blue-300 truncate leading-tight">
                {getUserRole(user.email)}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    isActive 
                      ? 'bg-blue-600 dark:bg-blue-500 text-white dark:text-white' 
                      : 'text-gray-300 dark:text-gray-200 hover:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Bottom controls with logout and theme toggle */}
      <div className="mt-auto pt-4 border-t border-gray-700 dark:border-gray-600">
        
        <div className="flex gap-2">
          <button 
            onClick={toggleTheme}
            className="flex-1 p-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-4 w-4" />
                <span className="text-sm">Dark</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" />
                <span className="text-sm">Light</span>
              </>
            )}
          </button>
          
          {user && (
            <button
              onClick={handleLogout}
              className="flex-1 p-2 rounded-md hover:bg-red-600 dark:hover:bg-red-500 transition-colors flex items-center justify-center gap-2 text-gray-300 hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}