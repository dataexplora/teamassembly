import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  colorSchemes: {
    light: { palette: { primary: { main: '#5b4cf0' }, background: { default: '#f7f7fb' } } },
    dark: { palette: { primary: { main: '#8b80ff' }, background: { default: '#0f0f14', paper: '#17171f' } } },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: { styleOverrides: { sizeLarge: { paddingTop: 14, paddingBottom: 14, borderRadius: 14 } } },
  },
})
