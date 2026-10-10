import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
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
          <Box
            component="img"
            src="/icon-192.png"
            alt="Assemblie logo"
            sx={{ width: 96, height: 96, borderRadius: '24px', boxShadow: '0 8px 24px rgba(91, 61, 245, 0.35)', mb: 1 }}
          />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Assemblie</Typography>
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
