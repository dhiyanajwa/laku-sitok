import { createContext, useContext, useMemo, useState } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { getLakuTheme } from '../theme/lakuTheme'

const THEME_STORAGE_KEY = 'laku_sitok_theme_mode'
const ThemeModeContext = createContext(null)

function initialThemeMode() {
  const savedMode = localStorage.getItem(THEME_STORAGE_KEY)
  if (savedMode === 'light' || savedMode === 'dark') return savedMode
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function VendorThemeProvider({ children }) {
  const [mode, setMode] = useState(initialThemeMode)
  const theme = useMemo(() => getLakuTheme(mode), [mode])
  const value = useMemo(() => ({
    mode,
    setMode: (nextMode) => {
      const resolvedMode = nextMode === 'dark' ? 'dark' : 'light'
      setMode(resolvedMode)
      localStorage.setItem(THEME_STORAGE_KEY, resolvedMode)
    },
    toggleMode: () => {
      setMode((current) => {
        const nextMode = current === 'dark' ? 'light' : 'dark'
        localStorage.setItem(THEME_STORAGE_KEY, nextMode)
        return nextMode
      })
    },
  }), [mode])

  return <ThemeModeContext.Provider value={value}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="laku-vendor-theme" data-laku-theme={mode}>{children}</div>
    </ThemeProvider>
  </ThemeModeContext.Provider>
}

export function useThemeMode() {
  const value = useContext(ThemeModeContext)
  if (!value) throw new Error('useThemeMode must be used inside VendorThemeProvider.')
  return value
}