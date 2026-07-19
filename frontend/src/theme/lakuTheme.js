import { createTheme } from '@mui/material/styles'

const palettes = {
  light: {
    page: '#f7fafc', surface: '#ffffff', surfaceMuted: '#f4f8fb', surfaceRaised: '#edf3f8',
    text: '#10244a', textSecondary: '#526b89', textMuted: '#8294b1', border: '#dce6ef',
    primarySoft: '#e2f8f0', primaryHover: '#effbf7', purpleSoft: '#f6efff',
  },
  dark: {
    page: '#0b1423', surface: '#122037', surfaceMuted: '#172940', surfaceRaised: '#1c304b',
    text: '#edf5ff', textSecondary: '#b3c7df', textMuted: '#91a9c6', border: '#2a405d',
    primarySoft: '#123e3b', primaryHover: '#174d48', purpleSoft: '#2a1d48',
  },
}

export function getLakuTheme(mode = 'light') {
  const colors = palettes[mode] || palettes.light
  return createTheme({
    palette: {
      mode,
      primary: { main: '#008764', contrastText: '#ffffff' },
      secondary: { main: '#7c31ec', contrastText: '#ffffff' },
      background: { default: colors.page, paper: colors.surface },
      text: { primary: colors.text, secondary: colors.textSecondary },
      divider: colors.border,
      success: { main: '#18864a' }, warning: { main: '#c98208' }, error: { main: '#c93c4a' }, info: { main: '#1976b8' },
    },
    shape: { borderRadius: 12 },
    typography: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiOutlinedInput: { styleOverrides: { notchedOutline: { borderColor: colors.border } } },
      MuiInputLabel: { styleOverrides: { root: { color: colors.textMuted } } },
      MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: mode === 'dark' ? '#0a1120' : '#10244a' } } },
    },
  })
}

export const lightLakuTheme = getLakuTheme('light')