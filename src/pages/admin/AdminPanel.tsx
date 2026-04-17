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
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-cdgai-dark text-white flex flex-col flex-shrink-0">
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between flex-shrink-0">
          <h1 className="text-2xl font-black text-gray-900 capitalize">
            {activeTab.replace('-', ' ')}
          </h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm font-bold text-gray-500">
              CDGAI Career Fair 2025
            </div>
            <div className="w-10 h-10 rounded-full bg-cdgai-maroon text-white flex items-center justify-center font-bold">
              AD
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'students' && <StudentsTab />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'export' && <ExportTab />}
        </main>
      </div>
    </div>);

};