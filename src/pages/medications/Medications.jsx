import { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import MaterialIcon from '../../components/layout/MaterialIcon';
import useAddMedication from '../../hooks/useAddMedication.js';
import useGetMedications from '../../hooks/useGetMedications.js';
import useDeleteMedication from '../../hooks/useDeleteMedication.js';
import useUpdateMedication from '../../hooks/useUpdateMedication.js';
import useAuth from '../../auth/useAuth.js';
import { medicationSchema } from '../../validations/medicationSchema.js';

const defaultValues = { name: '', dosage: '', frequency: '' };

function MedicationForm() {
  const request = useAddMedication();
  const submitting = useRef(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(medicationSchema),
    defaultValues,
    mode: 'onBlur',
  });
  const pending = request.isPending || isSubmitting;

  async function handleAddMedication(data) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await request.mutateAsync(data);
      reset(defaultValues);
    } catch {
      // Keep the entered values so the patient can retry.
    } finally {
      submitting.current = false;
    }
  }

  return (
    <Stack component="form" noValidate onSubmit={event => handleSubmit(handleAddMedication)(event)} spacing={3} aria-busy={pending}>
      {request.isSuccess && <Alert severity="success">Your medication has been saved successfully.</Alert>}
      {request.isError && (
        <Alert severity="error">
          {request.error?.response?.data?.message || request.error?.message || 'Unable to save your medication. Please try again.'}
        </Alert>
      )}
      <TextField {...register('name')} label="Medication Name" required fullWidth disabled={pending}
        error={!!errors.name} helperText={errors.name?.message}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
      <TextField {...register('dosage')} label="Dosage" required fullWidth disabled={pending}
        error={!!errors.dosage} helperText={errors.dosage?.message}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
      <TextField {...register('frequency')} label="Frequency" required fullWidth disabled={pending}
        error={!!errors.frequency} helperText={errors.frequency?.message}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
      <Button type="submit" variant="contained" disabled={pending}
        startIcon={pending ? <CircularProgress size={18} color="inherit" /> : <MaterialIcon name="add" />}
        sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, minHeight: 48, borderRadius: 3, px: 3 }}>
        {pending ? 'Saving...' : 'Add medication'}
      </Button>
    </Stack>
  );
}

function MedicationsContent({ version }) {
  const { data: medications = [], isPending, isError, error, refetch, isFetching } = useGetMedications();
  const deleteRequest = useDeleteMedication();
  const [selectedMedication, setSelectedMedication] = useState(null);
  const deleting = useRef(false);
  const backendMessage = deleteRequest.error?.response?.data?.message;
  const updateRequest = useUpdateMedication();
  const [editingMedication, setEditingMedication] = useState(null);
  const saving = useRef(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(medicationSchema), defaultValues, mode: 'onBlur',
  });
  const savingPending = updateRequest.isPending || isSubmitting;
  const updateMessage = updateRequest.error?.response?.data?.message || updateRequest.error?.message;

  function handleEdit(medication) {
    updateRequest.reset();
    reset({ name: medication.name ?? '', dosage: medication.dosage ?? '', frequency: medication.frequency ?? '' });
    setEditingMedication(medication);
  }

  function handleEditClose() {
    if (!saving.current && !savingPending) setEditingMedication(null);
  }

  async function handleUpdate(values) {
    if (saving.current || !editingMedication) return;
    saving.current = true;
    try {
      await updateRequest.mutateAsync({ medicationId: editingMedication.id, values });
      setEditingMedication(null);
    } catch {
      // Keep the entered values available for retry.
    } finally {
      saving.current = false;
    }
  }

  function handleClose() {
    if (!deleting.current) setSelectedMedication(null);
  }

  async function handleDelete() {
    if (deleting.current || !selectedMedication) return;
    deleting.current = true;
    try {
      await deleteRequest.mutateAsync(selectedMedication.id);
      setSelectedMedication(null);
    } catch {
      // Keep the dialog open and the medication visible for retry.
    } finally {
      deleting.current = false;
    }
  }
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">Patient workspace</Typography>
      <Typography component="h2" variant="h4" sx={{ fontWeight: 750, mt: 0.5, mb: 1, fontSize: { xs: 26, sm: 32 } }}>
        Medications
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Enter the medication name, dosage, and frequency from your existing prescription or medication instructions.
      </Typography>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, maxWidth: 760 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
          <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: 3, bgcolor: 'action.selected', color: 'primary.main' }}>
            <MaterialIcon name="medication" />
          </Box>
          <Typography component="h3" variant="h6">Add a medication</Typography>
        </Stack>
        <MedicationForm key={version} />
      </Paper>
      <Paper variant="outlined" sx={{ mt: 3, p: { xs: 3, md: 4 }, borderRadius: 4, maxWidth: 760 }}>
        <Typography component="h3" variant="h6" sx={{ mb: 3 }}>My medications</Typography>
        {updateRequest.isSuccess && <Alert severity="success" sx={{ mb: 3 }}>Your medication has been updated successfully.</Alert>}
        {deleteRequest.isSuccess && <Alert severity="success" sx={{ mb: 3 }}>Your medication has been deleted successfully.</Alert>}
        {isPending ? (
          <CircularProgress size={24} aria-label="Loading medications" />
        ) : isError ? (
          <Alert severity="error" action={
            <Button color="inherit" disabled={isFetching} onClick={() => refetch()}>Try again</Button>
          }>
            {error?.response?.data?.message || error?.message || 'Failed to load medications.'}
          </Alert>
        ) : medications.length === 0 ? (
          <Typography color="text.secondary">No medications added yet.</Typography>
        ) : (
          <Stack spacing={3}>
            {medications.map(medication => (
              <Box key={medication.id} sx={{ overflowWrap: 'anywhere' }}>
                <Typography component="h4" variant="subtitle1" sx={{ fontWeight: 600 }}>{medication.name}</Typography>
                <Typography color="text.secondary">Dosage: {medication.dosage}</Typography>
                <Typography color="text.secondary">Frequency: {medication.frequency}</Typography>
                <Button size="small" disabled={deleteRequest.isPending || savingPending}
                  startIcon={<MaterialIcon name="edit" />} sx={{ mt: 1, mr: 1, borderRadius: 3 }}
                  aria-label={`Edit ${medication.name}`} onClick={() => handleEdit(medication)}>
                  Edit
                </Button>
                <Button color="error" size="small" disabled={deleteRequest.isPending}
                  startIcon={<MaterialIcon name="delete" />} sx={{ mt: 1, borderRadius: 3 }}
                  aria-label={`Delete ${medication.name}`}
                  onClick={() => {
                    deleteRequest.reset();
                    setSelectedMedication(medication);
                  }}>
                  Delete
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
      <Dialog open={editingMedication !== null} onClose={handleEditClose} disableEscapeKeyDown={savingPending}
        fullWidth maxWidth="sm" aria-labelledby="edit-medication-title"
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <Box component="form" noValidate onSubmit={event => handleSubmit(handleUpdate)(event)} aria-busy={savingPending}>
          <DialogTitle id="edit-medication-title">Edit medication</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              {updateRequest.isError && <Alert severity="error">
                {typeof updateMessage === 'string' && updateMessage.trim() ? updateMessage : 'Failed to update medication. Please try again.'}
              </Alert>}
              <TextField {...register('name')} label="Medication Name" required fullWidth disabled={savingPending}
                error={!!errors.name} helperText={errors.name?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              <TextField {...register('dosage')} label="Dosage" required fullWidth disabled={savingPending}
                error={!!errors.dosage} helperText={errors.dosage?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
              <TextField {...register('frequency')} label="Frequency" required fullWidth disabled={savingPending}
                error={!!errors.frequency} helperText={errors.frequency?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button type="button" onClick={handleEditClose} disabled={savingPending} sx={{ borderRadius: 3 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={savingPending}
              startIcon={savingPending ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{ borderRadius: 3, minHeight: 44 }}>
              {savingPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={selectedMedication !== null} onClose={handleClose} disableEscapeKeyDown={deleteRequest.isPending}
        fullWidth maxWidth="sm" aria-labelledby="delete-medication-title" aria-describedby="delete-medication-description"
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle id="delete-medication-title">Delete medication</DialogTitle>
        <DialogContent aria-busy={deleteRequest.isPending}>
          {deleteRequest.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {typeof backendMessage === 'string' && backendMessage.trim()
                ? backendMessage : 'Unable to delete your medication. Please try again.'}
            </Alert>
          )}
          <DialogContentText id="delete-medication-description">
            Are you sure you want to delete this medication?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleClose} disabled={deleteRequest.isPending} sx={{ borderRadius: 3 }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={deleteRequest.isPending}
            startIcon={deleteRequest.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ borderRadius: 3, minHeight: 44 }}>
            {deleteRequest.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function Medications() {
  const { version } = useAuth();
  return <MedicationsContent key={version} version={version} />;
}
