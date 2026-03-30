import { Paper, Stack, Typography } from '@mui/material';

export function SectionCard({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper elevation={0} sx={{ p: 2.25, border: '1px solid rgba(22,32,36,0.08)', backgroundColor: 'rgba(255,255,255,0.82)' }}>
      <Stack spacing={1.25}>
        {eyebrow ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h6">{title}</Typography>
        {children}
      </Stack>
    </Paper>
  );
}
