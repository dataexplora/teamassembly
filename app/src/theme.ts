import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  colorSchemes: {
    // Brand colors from the Assemblie logo: violet #5b3df5, coral dot #ff6b5e
    light: {
      palette: {
        primary: { main: '#5b3df5' },
        secondary: { main: '#ff6b5e' },
        background: { default: '#f7f7fb' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#8a73ff' },
        secondary: { main: '#ff7f73' },
        background: { default: '#0f0f14', paper: '#17171f' },
      },
    },
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
