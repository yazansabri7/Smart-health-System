import { Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import MaterialIcon from '../../components/layout/MaterialIcon';
import useAddReading from '../../hooks/useAddReading.js';
import { readingSchema } from '../../validations/readingSchema.js';

const defaultValues = { readingType: 'pressure', systolic: '', diastolic: '', glucoseLevel: '' };
const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 3 },
};

export default function HealthReadings() {
  const request = useAddReading();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(readingSchema),
    defaultValues,
    mode: 'onBlur',
    shouldUnregister: true,
  });
  const readingType = useWatch({ control, name: 'readingType' });
  const pending = request.isPending || isSubmitting;
  const showPressure = readingType === 'pressure' || readingType === 'both';
  const showGlucose = readingType === 'glucose' || readingType === 'both';

  async function handleAddReading(data) {
    try {
      await request.mutateAsync(data);
      reset(defaultValues);
    } catch {
      // Mutation state displays the failure; keep the entered values for retry.
    }
  }

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">Patient workspace</Typography>
      <Typography component="h2" variant="h4" sx={{ fontWeight: 750, mt: 0.5, mb: 1, fontSize: { xs: 26, sm: 32 } }}>
        Health Readings
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Record your blood pressure, blood glucose, or both.
      </Typography>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, maxWidth: 760 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
          <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: 3, bgcolor: 'action.selected', color: 'primary.main' }}>
            <MaterialIcon name="monitor_heart" />
          </Box>
          <Typography component="h3" variant="h6">Add a reading</Typography>
        </Stack>
        <Stack component="form" noValidate onSubmit={handleSubmit(handleAddReading)} spacing={3} aria-busy={pending}>
          {request.isSuccess && <Alert severity="success">Your reading has been saved successfully.</Alert>}
          {request.isError && (
            <Alert severity="error" role="alert">
              {request.error?.response
                ? 'Unable to save your reading. Please check your entries and try again.'
                : 'Unable to save your reading. Please try again or check your connection.'}
            </Alert>
          )}
          <Controller
            name="readingType"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Reading type" fullWidth disabled={pending}
                error={!!errors.readingType} helperText={errors.readingType?.message} sx={fieldSx}>
                <MenuItem value="pressure">Blood Pressure</MenuItem>
                <MenuItem value="glucose">Blood Glucose</MenuItem>
                <MenuItem value="both">Both</MenuItem>
              </TextField>
            )}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: showPressure ? '1fr 1fr' : '1fr' }, gap: 3 }}>
            {showPressure && (
              <>
                <TextField {...register('systolic')} label="Systolic" type="number" required fullWidth
                  disabled={pending} error={!!errors.systolic} helperText={errors.systolic?.message}
                  slotProps={{ htmlInput: { step: 'any' } }} sx={fieldSx} />
                <TextField {...register('diastolic')} label="Diastolic" type="number" required fullWidth
                  disabled={pending} error={!!errors.diastolic} helperText={errors.diastolic?.message}
                  slotProps={{ htmlInput: { step: 'any' } }} sx={fieldSx} />
              </>
            )}
            {showGlucose && (
              <TextField {...register('glucoseLevel')} label="Blood glucose (mg/dL)" type="number" required fullWidth
                disabled={pending} error={!!errors.glucoseLevel} helperText={errors.glucoseLevel?.message}
                slotProps={{ htmlInput: { step: 'any' } }} sx={fieldSx} />
            )}
          </Box>
          <Button type="submit" variant="contained" disabled={pending}
            startIcon={pending ? <CircularProgress size={18} color="inherit" /> : <MaterialIcon name="add" />}
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, minHeight: 48, borderRadius: 3, px: 3 }}>
            {pending ? 'Saving...' : 'Save reading'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
