import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, Paper, Snackbar, Stack, Typography } from '@mui/material';
import EditReadingDialog from './EditReadingDialog.jsx';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(timestamp) {
  const date = timestamp ? new Date(timestamp) : null;
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : 'Date unavailable';
}

export default function ReadingHistory({ query }) {
  const [selectedReading, setSelectedReading] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  function handleUpdated() {
    setSelectedReading(null);
    setUpdateSuccess(true);
  }

  return (
    <Paper component="section" aria-labelledby="reading-history-title" variant="outlined"
      sx={{ mt: 3, p: { xs: 3, md: 4 }, borderRadius: 4, maxWidth: 760 }}>
      <Typography id="reading-history-title" component="h3" variant="h6" sx={{ mb: 3 }}>Reading History</Typography>
      {query.isPending ? (
        <Stack direction="row" spacing={1.5} alignItems="center" role="status">
          <CircularProgress size={20} aria-label="Loading readings" />
          <Typography color="text.secondary">Loading your readings...</Typography>
        </Stack>
      ) : query.isError ? (
        <Alert severity="error" action={
          <Button color="inherit" disabled={query.isFetching} onClick={() => query.refetch()}>Try again</Button>
        }>
          Unable to load your readings. Please try again.
        </Alert>
      ) : (
        <>
          {query.isFetching && <Typography role="status" color="text.secondary" sx={{ mb: 2 }}>Refreshing readings...</Typography>}
          {query.data.length === 0 ? (
            <Typography color="text.secondary">No readings yet. Add your first reading above.</Typography>
          ) : (
            <Stack component="ul" spacing={2.5} divider={<Divider component="li" role="presentation" />}
              sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {query.data.map(reading => {
                const systolic = reading.bloodPressure?.systolic;
                const diastolic = reading.bloodPressure?.diastolic;
                const glucoseLevel = reading.glucoseReading?.glucoseLevel;
                const hasPressure = systolic != null || diastolic != null;
                const hasGlucose = glucoseLevel != null;
                let type = 'Reading';
                if (hasPressure && hasGlucose) type = 'Blood Pressure and Blood Glucose';
                else if (hasPressure) type = 'Blood Pressure';
                else if (hasGlucose) type = 'Blood Glucose';

                return (
                  <Box component="li" key={reading.id} sx={{
                    display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 1,
                  }}>
                    <Box>
                      <Typography fontWeight={700}>{type}</Typography>
                      <Typography variant="body2" color="text.secondary">{formatDate(reading.timestamp)}</Typography>
                    </Box>
                    <Stack spacing={0.5} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      {hasPressure && <Typography>{systolic ?? '—'} / {diastolic ?? '—'} mmHg</Typography>}
                      {hasGlucose && <Typography>{glucoseLevel} mg/dL</Typography>}
                      <Button size="small" disabled={reading.id == null || (!hasPressure && !hasGlucose)}
                        onClick={() => { setUpdateSuccess(false); setSelectedReading(reading); }}
                        aria-label={`Edit ${type.toLowerCase()} reading from ${formatDate(reading.timestamp)}`}
                        sx={{ alignSelf: { xs: 'flex-start', sm: 'flex-end' }, borderRadius: 3 }}>
                        Edit
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </>
      )}
      {selectedReading && (
        <EditReadingDialog key={selectedReading.id} reading={selectedReading}
          onClose={() => setSelectedReading(null)} onUpdated={handleUpdated} />
      )}
      <Snackbar open={updateSuccess} autoHideDuration={6000} onClose={() => setUpdateSuccess(false)}>
        <Alert severity="success" onClose={() => setUpdateSuccess(false)}>Your reading has been updated successfully.</Alert>
      </Snackbar>
    </Paper>
  );
}
