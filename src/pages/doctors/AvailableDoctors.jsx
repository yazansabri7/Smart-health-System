import { useRef } from 'react';
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import MaterialIcon from '../../components/layout/MaterialIcon';
import useAvailableDoctors from '../../hooks/useAvailableDoctors.js';
import useAddDoctor from '../../hooks/useAddDoctor.js';
import useAuth from '../../auth/useAuth.js';

function AvailableDoctorsContent() {
  const { data: doctors = [], isPending, isError, error, refetch, isFetching } = useAvailableDoctors();
  const request = useAddDoctor();
  const adding = useRef(false);
  const backendMessage = request.error?.response?.data?.message || request.error?.message;

  async function handleAddDoctor(doctorId) {
    if (adding.current) return;
    adding.current = true;
    try {
      await request.mutateAsync(doctorId);
    } catch {
      // The mutation error is displayed below; allow the patient to retry.
    } finally {
      adding.current = false;
    }
  }

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">Patient workspace</Typography>
      <Typography component="h2" variant="h4" sx={{ fontWeight: 750, mt: 0.5, mb: 1, fontSize: { xs: 26, sm: 32 } }}>
        Available Doctors
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Choose a doctor to add to your care team.</Typography>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
        <Stack spacing={3}>
          {request.isSuccess && <Alert severity="success">Doctor added successfully.</Alert>}
          {request.isError && <Alert severity="error">
            {typeof backendMessage === 'string' && backendMessage.trim() ? backendMessage : 'Failed to add doctor. Please try again.'}
          </Alert>}
          {isPending ? <CircularProgress size={24} aria-label="Loading available doctors" /> : isError ? (
            <Alert severity="error" action={<Button color="inherit" disabled={isFetching} onClick={() => refetch()}>Try again</Button>}>
              {error?.response?.data?.message || error?.message || 'Unable to load available doctors.'}
            </Alert>
          ) : doctors.length === 0 ? (
            <Typography color="text.secondary">No doctors available yet.</Typography>
          ) : doctors.map(doctor => (
            <Stack key={doctor.id} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <Avatar src={doctor.profileImage || undefined} alt={doctor.doctorName || 'Doctor'}
                sx={{ bgcolor: 'action.selected', color: 'primary.main', width: 48, height: 48 }}>
                <MaterialIcon name="medical_services" />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                <Typography component="h3" variant="h6">{doctor.doctorName || 'Doctor'}</Typography>
                {doctor.specialization && <Typography color="text.secondary">{doctor.specialization}</Typography>}
                <Chip size="small" variant="outlined" sx={{ mt: 1 }}
                  label={doctor.isAvailable === true ? 'Available' : doctor.isAvailable === false ? 'Unavailable' : 'Availability not provided'} />
              </Box>
              <Button variant="contained" disabled={request.isPending || doctor.isAvailable !== true}
                aria-label={`Add doctor ${doctor.doctorName || ''}`}
                onClick={() => handleAddDoctor(doctor.id)}
                startIcon={request.isPending && request.variables === doctor.id ? <CircularProgress size={18} color="inherit" /> : <MaterialIcon name="add" />}
                sx={{ borderRadius: 3, minHeight: 44 }}>
                {request.isPending && request.variables === doctor.id ? 'Adding...' : 'Add Doctor'}
              </Button>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

export default function AvailableDoctors() {
  const { version } = useAuth();
  return <AvailableDoctorsContent key={version} />;
}
