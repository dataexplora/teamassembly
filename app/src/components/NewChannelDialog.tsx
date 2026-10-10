import { useState } from 'react'
import { Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'

const EMOJIS = ['💬', '💡', '✅', '📎', '🎉', '🎨', '🛠️', '📣', '🐛', '📊', '🧪', '🚀', '🍕', '🎯', '📚', '❓']

type Props = {
  open: boolean
  onClose: () => void
  onCreate: (name: string, emoji: string) => Promise<void>
}

export default function NewChannelDialog({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0]!)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await onCreate(name, emoji)
      setName('')
      setEmoji(EMOJIS[0]!)
      onClose()
    } catch {
      // parent shows the error
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>New channel</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0.5, mb: 2, mt: 0.5 }}>
            {EMOJIS.map((e) => (
              <ButtonBase
                key={e}
                onClick={() => setEmoji(e)}
                aria-label={`Use ${e}`}
                sx={{
                  fontSize: 22,
                  aspectRatio: '1',
                  borderRadius: 2,
                  border: 2,
                  borderColor: e === emoji ? 'primary.main' : 'transparent',
                  bgcolor: e === emoji ? 'action.selected' : 'transparent',
                }}
              >
                {e}
              </ButtonBase>
            ))}
          </Box>
          <TextField
            label="Channel name"
            placeholder="e.g. Design"
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 30 } }}
            autoFocus
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={!name.trim() || busy}>
            {busy ? 'Creating...' : `Create ${emoji} ${name.trim()}`.trim()}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
