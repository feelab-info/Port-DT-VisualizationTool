'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Map, Activity, Database, Anchor, BarChart2, Sun, Moon, LogOut, Zap, Power, Languages } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { translations } from '@/translations/translations';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const { user, logout } = useAuth();

  const t = translations[language];

  const navItems = [
    { name: t.dashboard, href: '/', icon: Home },
    { name: t.portMap, href: '/map', icon: Map },
    { name: t.simulation, href: '/simulation', icon: Activity },
    { name: t.historicalPortData, href: '/real-time', icon: Database },
    { name: t.converters, href: '/converters', icon: Power },
    { name: t.shipEnergyPrediction, href: '/prediction', icon: BarChart2 },
    { name: t.pvSolarModel, href: '/pv-model', icon: Zap },
  ];

  const handleLogout = () => {
    logout();
  };

  // Get initials for Port Authority
  const getUserInitials = (): string => {
    return 'PA';
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
    if (email === 'diogo.paulino10@gmail.com') return t.systemAdministrator;
    if (email.endsWith('@apram.pt')) return t.portAuthorityStaff;
    return t.authorizedUser;
  };

  return (
    <div className="h-full w-64 bg-sidebar-bg text-sidebar-text p-4 flex flex-col">
      <div className="mb-8 flex items-center gap-3">
        <Anchor className="h-8 w-8" />
        <h1 className="text-xl font-bold text-sidebar-text">Port Digital Twin</h1>
      </div>
      
      {/* Clean User profile without logout button */}
      {user && (
        <div className="mb-6 p-4 bg-gray-700 dark:bg-gray-700 rounded-lg border border-gray-600 dark:border-gray-600">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="bg-blue-600 dark:bg-blue-500 p-2.5 rounded-full flex items-center justify-center min-w-[2.75rem] h-11 shadow-md">
                <span className="text-white font-bold text-sm">
                  {getUserInitials()}
                </span>
              </div>
              {/* Online status indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-700 dark:border-gray-600 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p 
                className="font-semibold text-sidebar-text truncate text-sm leading-tight mb-1" 
                title={t.portAuthority}
              >
                {t.portAuthority}
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

      {/* Shift2DC Logo with Subtle Electric Effect */}
      <div className="mb-6 px-2">
        <Link href="/shift2dc" className="block">
          <div className="relative group cursor-pointer">
            {/* Main container */}
            <div className="relative p-4 bg-gray-700 dark:bg-gray-700 rounded-lg border border-gray-600 dark:border-gray-600 overflow-hidden transition-all duration-300 hover:bg-gray-600 dark:hover:bg-gray-600 hover:border-blue-500">
              {/* Logo */}
              <div className="relative flex items-center justify-center">
                <Image
                  src="/img/shift2dc_logo.png"
                  alt="Shift2DC"
                  width={160}
                  height={45}
                  className="h-auto max-w-full opacity-95 filter brightness-110 transition-all duration-300 group-hover:brightness-125"
                />
              </div>
              
              {/* Single subtle spark effect */}
              <div className="absolute top-2 right-3 w-1 h-1 rounded-full opacity-40 animate-ping" style={{backgroundColor: '#93be47', animationDuration: '3s'}}></div>
              
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-lg"></div>
            </div>
          </div>
        </Link>
      </div>
      
      {/* Bottom controls with logout, theme toggle, and language toggle */}
      <div className="mt-auto pt-4 border-t border-gray-700 dark:border-gray-600">
        {/* Language and Theme toggles */}
        <div className="flex gap-2 mb-2">
          <button 
            onClick={toggleLanguage}
            className="flex-1 p-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
            aria-label={`Switch to ${language === 'en' ? 'Portuguese' : 'English'}`}
            title={language === 'en' ? t.portuguese : t.english}
          >
            <Languages className="h-4 w-4" />
            <span className="text-sm font-semibold">{language === 'en' ? 'PT' : 'EN'}</span>
          </button>
          
          <button 
            onClick={toggleTheme}
            className="flex-1 p-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
            aria-label={theme === 'light' ? t.switchToDark : t.switchToLight}
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-4 w-4" />
                <span className="text-sm">{t.dark}</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" />
                <span className="text-sm">{t.light}</span>
              </>
            )}
          </button>
        </div>
        
        {/* Logout button */}
        {user && (
          <button
            onClick={handleLogout}
            className="w-full p-2 rounded-md hover:bg-red-600 dark:hover:bg-red-500 transition-colors flex items-center justify-center gap-2 text-gray-300 hover:text-white"
            title={t.signOutTooltip}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">{t.signOut}</span>
          </button>
        )}
      </div>
    </div>
  );
}