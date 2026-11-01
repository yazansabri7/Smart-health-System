import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { readingSchema } from '../../validations/readingSchema.js';
import useUpdateReading from '../../hooks/useUpdateReading.js';

export default function EditReadingDialog({ reading, onClose, onUpdated }) {
  const hasPressure = reading.bloodPressure != null;
  const hasGlucose = reading.glucoseReading != null;
  let readingType = 'pressure';
  if (hasPressure && hasGlucose) readingType = 'both';
  else if (hasGlucose) readingType = 'glucose';

  const request = useUpdateReading();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(readingSchema),
    mode: 'onBlur',
    defaultValues: {
      readingType,
      systolic: reading.bloodPressure?.systolic ?? '',
      diastolic: reading.bloodPressure?.diastolic ?? '',
      glucoseLevel: reading.glucoseReading?.glucoseLevel ?? '',
    },
  });
  const pending = request.isPending || isSubmitting;

  function handleClose() {
    if (!pending) onClose();
  }

  async function handleUpdate(data) {
    try {
      await request.mutateAsync({ ...data, readingId: reading.id });
      onUpdated();
    } catch {
      // Keep the dialog and entered values available for retry.
    }
  }

  return (
    <Dialog open onClose={handleClose} disableEscapeKeyDown={pending} fullWidth maxWidth="sm"
      aria-labelledby="edit-reading-title" slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <Box component="form" noValidate onSubmit={handleSubmit(handleUpdate)} aria-busy={pending}>
        <DialogTitle id="edit-reading-title">Edit reading</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {request.isError && <Alert severity="error">Unable to update your reading. Please try again.</Alert>}
            <input type="hidden" {...register('readingType')} />
            {hasPressure && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                <TextField {...register('systolic')} label="Systolic" type="number" required fullWidth
                  disabled={pending} error={!!errors.systolic} helperText={errors.systolic?.message}
                  slotProps={{ htmlInput: { step: 'any' } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                <TextField {...register('diastolic')} label="Diastolic" type="number" required fullWidth
                  disabled={pending} error={!!errors.diastolic} helperText={errors.diastolic?.message}
                  slotProps={{ htmlInput: { step: 'any' } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              </Box>
            )}
            {hasGlucose && (
              <TextField {...register('glucoseLevel')} label="Blood glucose (mg/dL)" type="number" required fullWidth
                disabled={pending} error={!!errors.glucoseLevel} helperText={errors.glucoseLevel?.message}
                slotProps={{ htmlInput: { step: 'any' } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button type="button" onClick={handleClose} disabled={pending} sx={{ borderRadius: 3 }}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={pending} sx={{ borderRadius: 3, minHeight: 44 }}
            startIcon={pending ? <CircularProgress size={18} color="inherit" /> : undefined}>
            {pending ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
