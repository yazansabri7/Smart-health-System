import { Box } from '@mui/material';

export default function MaterialIcon({ name, sx = {} }) {
  return <Box component="span" className="material-symbols-outlined" aria-hidden="true" sx={{ fontSize: 22, lineHeight: 1, flexShrink: 0, ...sx }}>{name}</Box>;
}
