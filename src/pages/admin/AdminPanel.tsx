import React, { useState } from 'react';
import { Logo } from '../../components/Logo';
import { DashboardTab } from './DashboardTab';
import { StudentsTab } from './StudentsTab';
import { SettingsTab } from './SettingsTab';
import { ExportTab } from './ExportTab';
import {
  LayoutDashboard,
  Users,
  Settings,
  Download,
  LogOut } from
'lucide-react';
type Tab = 'dashboard' | 'students' | 'settings' | 'export';
export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />
  },
  {
    id: 'students',
    label: 'Students',
    icon: <Users size={20} />
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={20} />
  },
  {
    id: 'export',
    label: 'Export Data',
    icon: <Download size={20} />
  }];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar — hidden on mobile (replaced by bottom tab bar) */}
      <div className="hidden md:flex w-64 bg-cdgai-dark text-white flex-col flex-shrink-0">
        <div className="p-6 border-b border-white/10 flex flex-col items-center">
          <Logo size="sm" className="mb-4" />
          <div className="text-sm font-bold tracking-widest uppercase text-gray-400">
            Admin Panel
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) =>
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === item.id ? 'bg-cdgai-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            
              {item.icon}
              <span>{item.label}</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <a
            href="/"
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
            
            <LogOut size={20} />
            <span>Exit to Monitor</span>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3 sm:py-5 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg sm:text-2xl font-black text-gray-900 capitalize">
            {activeTab.replace('-', ' ')}
          </h1>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden sm:block text-sm font-bold text-gray-500">
              CDGAI Career Fair 2025
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-cdgai-maroon text-white flex items-center justify-center font-bold text-sm">
              AD
            </div>
            <a
              href="/"
              className="md:hidden flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors">
              <LogOut size={16} />
              <span>Exit</span>
            </a>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-20 md:pb-8">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'students' && <StudentsTab />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'export' && <ExportTab />}
        </main>
      </div>

      {/* Bottom Tab Bar — mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-cdgai-dark border-t border-white/10 flex z-50">
        {navItems.map((item) =>
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id as Tab)}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-bold transition-colors ${activeTab === item.id ? 'text-cdgai-accent' : 'text-gray-400'}`}>
          {item.icon}
          <span className="text-[10px]">{item.label}</span>
        </button>
        )}
      </div>
    </div>);

};