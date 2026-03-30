import { CircularProgress, Stack, Typography } from '@mui/material';

export function LoadingState({ label }: { label: string }) {
  return (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 8 }}>
      <CircularProgress size={28} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}
