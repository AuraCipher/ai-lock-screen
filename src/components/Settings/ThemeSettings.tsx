import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Palette, Check, Sparkles } from 'lucide-react';

interface Theme {
  name: string;
  label: string;
  icon: typeof Sun | typeof Moon | typeof Palette;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    preview: string[];
  };
}

const themes: Theme[] = [
  {
    name: 'light',
    label: 'Light',
    icon: Sun,
    colors: {
      primary: '#6366f1',
      secondary: '#818cf8',
      background: '#ffffff',
      preview: ['#6366f1', '#818cf8', '#f1f5f9', '#ffffff'],
    },
  },
  {
    name: 'dark',
    label: 'Dark',
    icon: Moon,
    colors: {
      primary: '#6366f1',
      secondary: '#818cf8',
      background: '#0f172a',
      preview: ['#6366f1', '#818cf8', '#1e293b', '#0f172a'],
    },
  },
  {
    name: 'sunset',
    label: 'Sunset',
    icon: Palette,
    colors: {
      primary: '#f97316',
      secondary: '#fb923c',
      background: '#fffbeb',
      preview: ['#f97316', '#fb923c', '#fef3c7', '#fffbeb'],
    },
  },
  {
    name: 'ocean',
    label: 'Ocean',
    icon: Palette,
    colors: {
      primary: '#0ea5e9',
      secondary: '#38bdf8',
      background: '#f0f9ff',
      preview: ['#0ea5e9', '#38bdf8', '#e0f2fe', '#f0f9ff'],
    },
  },
  {
    name: 'forest',
    label: 'Forest',
    icon: Palette,
    colors: {
      primary: '#22c55e',
      secondary: '#4ade80',
      background: '#f0fdf4',
      preview: ['#22c55e', '#4ade80', '#dcfce7', '#f0fdf4'],
    },
  },
  {
    name: 'rose',
    label: 'Rose',
    icon: Palette,
    colors: {
      primary: '#e11d48',
      secondary: '#fb7185',
      background: '#fff1f2',
      preview: ['#e11d48', '#fb7185', '#ffe4e6', '#fff1f2'],
    },
  },
];

export default function ThemeSettings() {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [customPrimary, setCustomPrimary] = useState('#6366f1');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    
    // Apply dark class if needed
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const applyTheme = (themeName: string) => {
    const theme = themes.find(t => t.name === themeName);
    if (!theme) return;

    // Apply dark mode class
    if (themeName === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Store theme preference
    localStorage.setItem('theme', themeName);
    setCurrentTheme(themeName);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Choose a theme that suits your style. Your preference will be saved automatically.
      </p>

      {/* Theme Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {themes.map((theme, index) => {
          const Icon = theme.icon;
          const isActive = currentTheme === theme.name;
          
          return (
            <motion.button
              key={theme.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => applyTheme(theme.name)}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                isActive
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg"
                >
                  <Check className="h-3 w-3 text-primary-foreground" />
                </motion.div>
              )}

              {/* Theme icon and name */}
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-5 w-5 text-foreground" />
                <span className="font-medium text-foreground text-sm">{theme.label}</span>
              </div>

              {/* Color preview */}
              <div className="flex gap-1.5">
                {theme.colors.preview.map((color, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 + i * 0.05 }}
                    className="w-6 h-6 rounded-full border border-border shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Custom Color (Coming Soon) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 bg-muted/30 rounded-xl border border-border"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-primary to-purple-600 rounded-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-foreground flex items-center gap-2">
              Custom Theme
              <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                Coming Soon
              </span>
            </p>
            <p className="text-sm text-muted-foreground">Create your own color scheme</p>
          </div>
        </div>

        <div className="flex items-center gap-4 opacity-50">
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Primary:</label>
            <input
              type="color"
              value={customPrimary}
              onChange={(e) => setCustomPrimary(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-not-allowed"
              disabled
            />
          </div>
          <button
            disabled
            className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Apply Custom
          </button>
        </div>
      </motion.div>
    </div>
  );
}
