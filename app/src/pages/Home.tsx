import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import { createTeam } from '../api'
import { saveMyName, loadMyName } from '../identity'

export default function Home() {
  const navigate = useNavigate()
  const [teamName, setTeamName] = useState('')
  const [myName, setMyName] = useState(loadMyName())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = teamName.trim() && myName.trim() && !busy

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      saveMyName(myName.trim())
      const id = await createTeam(teamName, myName)
      navigate(`/t/${id}/share`)
    } catch (err) {
      console.error(err)
      setError('Could not create the team. Try again.')
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 3, py: 6 }}>
      <Stack spacing={4} component="form" onSubmit={onCreate} sx={{ maxWidth: 420, width: '100%', mx: 'auto' }}>
        <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center" }}>
          <GroupsRoundedIcon color="primary" sx={{ fontSize: 64 }} />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Team Assembly</Typography>
          <Typography color="text.secondary">
            Spin up a room, show the QR, start working together. No sign up.
          </Typography>
        </Stack>

        <TextField
          label="Team name"
          placeholder="e.g. Hackathon squad"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 60 } }}
          autoFocus
          fullWidth
        />
        <TextField
          label="Your name"
          value={myName}
          onChange={(e) => setMyName(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 40 } }}
          fullWidth
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={!canSubmit}>
          {busy ? 'Creating...' : 'Create team'}
        </Button>
      </Stack>
    </Box>
  )
}
