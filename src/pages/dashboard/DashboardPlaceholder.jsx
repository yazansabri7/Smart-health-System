import { Box, Chip, Paper, Typography } from '@mui/material';
import MaterialIcon from '../../components/layout/MaterialIcon';

export default function DashboardPlaceholder({ title, role = 'Patient', icon = 'dashboard' }) {
  return <Box>
    <Typography variant="overline" color="text.secondary">{role} workspace</Typography>
    <Typography component="h2" variant="h4" sx={{ fontWeight: 750, mt: 0.5, mb: 1, fontSize: { xs: 26, sm: 32 } }}>{title}</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Your healthcare workspace, in one place.</Typography>
    <Paper variant="outlined" sx={{ p: { xs: 3, md: 6 }, borderRadius: 4, textAlign: 'center' }}>
      <Box sx={{ display: 'inline-flex', p: 2, borderRadius: 3, bgcolor: 'action.selected', color: 'primary.main', mb: 2 }}><MaterialIcon name={icon} sx={{ fontSize: 32 }} /></Box>
      <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
      <Chip label="Planned feature" size="small" variant="outlined" sx={{ mb: 2 }} />
      <Typography color="text.secondary" sx={{ maxWidth: 440, mx: 'auto' }}>This page is a placeholder. {title} features will be available in a future phase.</Typography>
    </Paper>
  </Box>;
}
