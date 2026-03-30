'use client';

import { CssBaseline, GlobalStyles, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0e6b74'
    },
    secondary: {
      main: '#c96f42'
    },
    background: {
      default: '#f4efe7',
      paper: 'rgba(255,255,255,0.88)'
    },
    text: {
      primary: '#162024',
      secondary: '#62707a'
    }
  },
  shape: {
    borderRadius: 20
  },
  typography: {
    fontFamily: 'var(--font-body), sans-serif',
    h1: {
      fontFamily: 'var(--font-display), serif',
      fontWeight: 600,
      letterSpacing: '-0.03em'
    },
    h2: {
      fontFamily: 'var(--font-display), serif',
      fontWeight: 600,
      letterSpacing: '-0.02em'
    },
    h3: {
      fontFamily: 'var(--font-display), serif',
      fontWeight: 600
    },
    button: {
      fontWeight: 700,
      textTransform: 'none'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999
        }
      }
    }
  }
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          body: {
            background:
              'radial-gradient(circle at top left, rgba(14, 107, 116, 0.16), transparent 38%), radial-gradient(circle at bottom right, rgba(201, 111, 66, 0.16), transparent 32%), #f4efe7'
          }
        }}
      />
      {children}
    </ThemeProvider>
  );
}
