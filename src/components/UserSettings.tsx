import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronLeft,
  User, 
  Bell, 
  Shield, 
  Lock, 
  HelpCircle, 
  Info, 
  LogOut,
  Moon,
  Sun,
  Palette,
  MessageCircle,
  Key,
  UserPlus,
  Eye,
  AlertCircle,
  Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
}

const defaultThemes: Theme[] = [
  {
    name: 'light',
    colors: {
      primary: '#4f46e5',
      secondary: '#6366f1',
      background: '#ffffff',
      text: '#111827',
    },
  },
  {
    name: 'dark',
    colors: {
      primary: '#6366f1',
      secondary: '#818cf8',
      background: '#111827',
      text: '#ffffff',
    },
  },
  {
    name: 'sunset',
    colors: {
      primary: '#f97316',
      secondary: '#fb923c',
      background: '#fffbeb',
      text: '#1f2937',
    },
  },
  {
    name: 'ocean',
    colors: {
      primary: '#0ea5e9',
      secondary: '#38bdf8',
      background: '#f0f9ff',
      text: '#0f172a',
    },
  },
];

export default function UserSettings({ session, profile, onSignOut }) {
  const [activeSection, setActiveSection] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [customTheme, setCustomTheme] = useState<Theme>({
    name: 'custom',
    colors: {
      primary: '#4f46e5',
      secondary: '#6366f1',
      background: '#ffffff',
      text: '#111827',
    },
  });

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeName: string) => {
    const theme = themeName === 'custom' ? customTheme : defaultThemes.find(t => t.name === themeName);
    if (!theme) return;

    document.documentElement.style.setProperty('--color-primary', theme.colors.primary);
    document.documentElement.style.setProperty('--color-secondary', theme.colors.secondary);
    document.documentElement.style.setProperty('--color-background', theme.colors.background);
    document.documentElement.style.setProperty('--color-text', theme.colors.text);

    localStorage.setItem('theme', themeName);
    setCurrentTheme(themeName);
  };

  const handleThemeChange = (themeName: string) => {
    applyTheme(themeName);
  };

  const handleCustomThemeChange = (color: string, property: keyof Theme['colors']) => {
    const newTheme = {
      ...customTheme,
      colors: {
        ...customTheme.colors,
        [property]: color,
      },
    };
    setCustomTheme(newTheme);
    if (currentTheme === 'custom') {
      applyTheme('custom');
    }
  };

  const settingsSections = [
    {
      id: 'account',
      title: 'Account',
      icon: User,
      items: [
        {
          title: 'Personal Information',
          icon: User,
          onClick: () => setActiveSection('personal'),
          description: 'Update your profile information'
        },
        {
          title: 'Password and Security',
          icon: Key,
          onClick: () => setActiveSection('security'),
          description: 'Change password and security settings'
        },
        {
          title: 'Friends and Contacts',
          icon: UserPlus,
          onClick: () => setActiveSection('friends'),
          description: 'Manage your connections'
        }
      ]
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Palette,
      items: [
        {
          title: 'Theme',
          icon: Moon,
          onClick: () => setActiveSection('theme'),
          description: 'Customize app appearance'
        }
      ]
    },
    // ... other sections remain the same
  ];

  const renderThemeSettings = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Theme Settings</h2>
      
      {/* Theme Selection */}
      <div className="grid grid-cols-2 gap-4">
        {defaultThemes.map((theme) => (
          <button
            key={theme.name}
            onClick={() => handleThemeChange(theme.name)}
            className={`p-4 rounded-lg border-2 transition-all ${
              currentTheme === theme.name
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {theme.name === 'light' ? (
                <Sun className="h-5 w-5" />
              ) : theme.name === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Palette className="h-5 w-5" />
              )}
              <span className="capitalize">{theme.name}</span>
            </div>
            <div className="mt-2 flex space-x-2">
              {Object.values(theme.colors).map((color, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Custom Theme */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Custom Theme</h3>
        <div className="space-y-4">
          {Object.entries(customTheme.colors).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-4">
              <label className="w-24 capitalize">{key}:</label>
              <input
                type="color"
                value={value}
                onChange={(e) => handleCustomThemeChange(e.target.value, key as keyof Theme['colors'])}
                className="h-8 w-14"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => handleCustomThemeChange(e.target.value, key as keyof Theme['colors'])}
                className="px-2 py-1 border rounded"
              />
            </div>
          ))}
          <button
            onClick={() => handleThemeChange('custom')}
            className={`mt-4 px-4 py-2 rounded-lg ${
              currentTheme === 'custom'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Apply Custom Theme
          </button>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'theme':
        return renderThemeSettings();
      // ... other sections remain the same
      default:
        return (
          <div className="divide-y divide-gray-100">
            {settingsSections.map((section) => (
              <div key={section.id} className="py-6">
                <div className="flex items-center mb-4">
                  <section.icon className="h-6 w-6 text-gray-600 mr-2" />
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                </div>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <button
                      key={item.title}
                      onClick={item.onClick}
                      className="w-full text-left px-4 py-3 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <item.icon className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-gray-500">{item.description}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            <button
              onClick={onSignOut}
              className="w-full mt-6 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center space-x-2"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {activeSection ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-6">
            <button
              onClick={() => setActiveSection(null)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold capitalize">{activeSection}</h1>
          </div>
          {renderSectionContent()}
        </div>
      ) : (
        renderSectionContent()
      )}
    </div>
  );
}