import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import { getTeam, type Team } from '../api'
import ShareQr from '../components/ShareQr'

export default function Share() {
  const { teamId = '' } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState<Team | null>(null)

  useEffect(() => {
    getTeam(teamId).then(setTeam)
  }, [teamId])

  if (!team) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 3, py: 6 }}>
      <Stack spacing={4} sx={{ alignItems: "center", maxWidth: 420, width: '100%', mx: 'auto' }}>
        <Stack spacing={1} sx={{ textAlign: "center" }}>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>Team ready</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>{team.name}</Typography>
          <Typography color="text.secondary">Ask people to scan this with their phone camera.</Typography>
        </Stack>

        <ShareQr teamId={team.id} teamName={team.name} />

        <Button
          variant="contained"
          size="large"
          fullWidth
          endIcon={<ArrowForwardRoundedIcon />}
          onClick={() => navigate(`/t/${team.id}`)}
        >
          Enter room
        </Button>
      </Stack>
    </Box>
  )
}
