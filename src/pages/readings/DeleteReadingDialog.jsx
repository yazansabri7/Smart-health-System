import { useRef } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import useDeleteReading from '../../hooks/useDeleteReading.js';

export default function DeleteReadingDialog({ readingId, onClose, onDeleted }) {
  const request = useDeleteReading();
  const deleting = useRef(false);
  const backendMessage = request.error?.response?.data?.message;
  const errorMessage = typeof backendMessage === 'string' && backendMessage.trim()
    ? backendMessage
    : 'Unable to delete your reading. Please try again.';

  function handleClose() {
    if (!deleting.current) onClose();
  }

  async function handleDelete() {
    // Block rapid repeated clicks before the mutation's pending render.
    if (deleting.current) return;
    deleting.current = true;
    try {
      await request.mutateAsync(readingId);
      onDeleted();
    } catch {
      // Keep the confirmation open and leave the existing history untouched.
    } finally {
      deleting.current = false;
    }
  }

  return (
    <Dialog open onClose={handleClose} disableEscapeKeyDown={request.isPending} fullWidth maxWidth="sm"
      aria-labelledby="delete-reading-title" aria-describedby="delete-reading-description"
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle id="delete-reading-title">Delete reading</DialogTitle>
      <DialogContent aria-busy={request.isPending}>
        {request.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
        <DialogContentText id="delete-reading-description">
          Are you sure you want to delete this reading? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleClose} disabled={request.isPending} sx={{ borderRadius: 3 }}>Cancel</Button>
        <Button onClick={handleDelete} variant="contained" color="error" disabled={request.isPending}
          startIcon={request.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ borderRadius: 3, minHeight: 44 }}>
          {request.isPending ? 'Deleting...' : 'Delete Reading'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
