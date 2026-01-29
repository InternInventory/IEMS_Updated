// src/context/ThemeContext.js
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

// Light theme color palette
const lightThemeColors = {
  // Primary colors
  primary: "#4F46E5", // Indigo
  primaryLight: "#818CF8",
  primaryDark: "#3730A3",
  
  // Background colors
  background: "#FFFFFF",
  surface: "#F9FAFB",
  card: "#FFFFFF",
  sidebar: "#F8FAFC",
  
  // Text colors
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  textInverse: "#FFFFFF",
  
  // Border & Divider
  border: "#E5E7EB",
  divider: "#F3F4F6",
  
  // Status colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  
  // Accent colors
  accent1: "#8B5CF6", // Violet
  accent2: "#EC4899", // Pink
  accent3: "#0EA5E9", // Sky blue
  
  // Interactive states
  hover: "#F3F4F6",
  active: "#E5E7EB",
  selected: "#E0E7FF",
  
  // Shadows
  shadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  shadowMd: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  shadowLg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
};

// Dark theme color palette
const darkThemeColors = {
  primary: "#6366F1",
  primaryLight: "#818CF8",
  primaryDark: "#4F46E5",
  
  background: "#0F172A",
  surface: "#1E293B",
  card: "#334155",
  sidebar: "#1E293B",
  
  textPrimary: "#F1F5F9",
  textSecondary: "#CBD5E1",
  textTertiary: "#64748B",
  textInverse: "#0F172A",
  
  border: "#334155",
  divider: "#1E293B",
  
  success: "#34D399",
  warning: "#FBBF24",
  error: "#F87171",
  info: "#60A5FA",
  
  accent1: "#A78BFA",
  accent2: "#F472B6",
  accent3: "#38BDF8",
  
  hover: "#334155",
  active: "#475569",
  selected: "#3730A3",
  
  shadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
  shadowMd: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
  shadowLg: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    
    // Fallback to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return "dark";
    }
    
    return "light";
  });

  const [colors, setColors] = useState(theme === "light" ? lightThemeColors : darkThemeColors);

  useEffect(() => {
    // Update CSS variables and localStorage
    const currentColors = theme === "light" ? lightThemeColors : darkThemeColors;
    setColors(currentColors);
    
    // Set data-theme attribute
    document.documentElement.setAttribute("data-theme", theme);
    
    // Set CSS variables for colors
    Object.entries(currentColors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    });
    
    // Store theme preference
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  const setThemeLight = () => setTheme("light");
  const setThemeDark = () => setTheme("dark");

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      colors,
      toggleTheme, 
      setThemeLight, 
      setThemeDark,
      isLight: theme === "light",
      isDark: theme === "dark"
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);