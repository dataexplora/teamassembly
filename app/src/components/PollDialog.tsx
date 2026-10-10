import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'

const MAX_OPTIONS = 6

type Props = {
  open: boolean
  onClose: () => void
  onCreate: (question: string, options: string[]) => Promise<void>
}

export default function PollDialog({ open, onClose, onCreate }: Props) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [busy, setBusy] = useState(false)

  const filled = options.map((o) => o.trim()).filter(Boolean)
  const canCreate = question.trim() && filled.length >= 2 && !busy

  function reset() {
    setQuestion('')
    setOptions(['', ''])
    setBusy(false)
  }

  async function submit() {
    if (!canCreate) return
    setBusy(true)
    try {
      await onCreate(question, filled)
      reset()
      onClose()
    } catch {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New poll</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField
            label="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            autoFocus
            fullWidth
          />
          {options.map((opt, i) => (
            <Stack key={i} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <TextField
                label={`Option ${i + 1}`}
                value={opt}
                size="small"
                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                slotProps={{ htmlInput: { maxLength: 80 } }}
                fullWidth
              />
              {options.length > 2 && (
                <IconButton
                  size="small"
                  aria-label="Remove option"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          ))}
          {options.length < MAX_OPTIONS && (
            <Button startIcon={<AddRoundedIcon />} onClick={() => setOptions([...options, ''])} sx={{ alignSelf: 'flex-start' }}>
              Add option
            </Button>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={!canCreate}>
          {busy ? 'Posting...' : 'Post poll'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
