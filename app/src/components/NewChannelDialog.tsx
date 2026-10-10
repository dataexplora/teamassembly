import { useState } from 'react'
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded'
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded'
import type { ChannelKind } from '../api'

const EMOJIS = ['💬', '💡', '✅', '📎', '🎉', '🎨', '🛠️', '📣', '🐛', '📊', '🧪', '🚀', '🍕', '🎯', '📚', '❓']

type Props = {
  open: boolean
  onClose: () => void
  onCreate: (name: string, emoji: string, kind: ChannelKind) => Promise<void>
}

export default function NewChannelDialog({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0]!)
  const [busy, setBusy] = useState(false)
  const [kind, setKind] = useState<ChannelKind>('chat')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await onCreate(name, emoji, kind)
      setName('')
      setEmoji(EMOJIS[0]!)
      setKind('chat')
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
          <ToggleButtonGroup
            value={kind}
            exclusive
            fullWidth
            size="small"
            onChange={(_, v: ChannelKind | null) => v && setKind(v)}
            sx={{ mb: 2, mt: 0.5 }}
          >
            <ToggleButton value="chat" sx={{ gap: 1 }}>
              <ChatBubbleOutlineRoundedIcon fontSize="small" /> Chat
            </ToggleButton>
            <ToggleButton value="todo" sx={{ gap: 1 }}>
              <ChecklistRoundedIcon fontSize="small" /> Checklist
            </ToggleButton>
          </ToggleButtonGroup>
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
            placeholder={kind === 'todo' ? 'e.g. Shopping list' : 'e.g. Design'}
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
