import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  AppBar,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import {
  getMyMembership,
  getTeam,
  joinTeam,
  sendText,
  subscribeMembers,
  subscribeMessages,
  type Member,
  type Message,
  type Team,
} from '../api'
import { auth } from '../firebase'
import { loadMyName, saveMyName } from '../identity'
import ShareQr from '../components/ShareQr'

type Phase = 'loading' | 'missing' | 'join' | 'in'

export default function Room() {
  const { teamId = '' } = useParams()
  const [phase, setPhase] = useState<Phase>('loading')
  const [team, setTeam] = useState<Team | null>(null)
  const [me, setMe] = useState<Member | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const t = await getTeam(teamId)
      if (cancelled) return
      if (!t) return setPhase('missing')
      setTeam(t)
      const m = await getMyMembership(teamId)
      if (cancelled) return
      if (m) {
        setMe(m)
        setPhase('in')
      } else {
        setPhase('join')
      }
    })().catch((err) => {
      console.error(err)
      if (!cancelled) setPhase('missing')
    })
    return () => {
      cancelled = true
    }
  }, [teamId])

  if (phase === 'loading') {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }
  if (phase === 'missing' || !team) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 3 }}>
        <Alert severity="warning">This team does not exist or has expired.</Alert>
      </Box>
    )
  }
  if (phase === 'join') {
    return (
      <JoinForm
        team={team}
        onJoined={(m) => {
          setMe(m)
          setPhase('in')
        }}
      />
    )
  }
  return <Chat team={team} me={me!} />
}

function JoinForm({ team, onJoined }: { team: Team; onJoined: (m: Member) => void }) {
  const [name, setName] = useState(loadMyName())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean || busy) return
    setBusy(true)
    setError(null)
    try {
      await joinTeam(team.id, clean)
      saveMyName(clean)
      onJoined({ uid: auth.currentUser!.uid, name: clean })
    } catch (err) {
      console.error(err)
      setError('Could not join. Try again.')
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 3, py: 6 }}>
      <Stack spacing={4} component="form" onSubmit={onSubmit} sx={{ maxWidth: 420, width: '100%', mx: 'auto' }}>
        <Stack spacing={1} sx={{ textAlign: "center" }}>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>You are invited to</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>{team.name}</Typography>
          <Typography color="text.secondary">Just tell the team what to call you.</Typography>
        </Stack>
        <TextField
          label="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 40 } }}
          autoFocus
          fullWidth
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={!name.trim() || busy}>
          {busy ? 'Joining...' : 'Join'}
        </Button>
      </Stack>
    </Box>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

// Stable color per user so people are recognizable at a glance
function colorFor(uid: string) {
  let h = 0
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) % 360
  return `hsl(${h} 60% 45%)`
}

function Chat({ team, me }: { team: Team; me: Member }) {
  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => subscribeMembers(team.id, setMembers), [team.id])
  useEffect(() => subscribeMessages(team.id, setMessages), [team.id])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    const clean = text.trim()
    if (!clean) return
    setText('')
    try {
      await sendText(team.id, me.name, clean)
    } catch (err) {
      console.error(err)
      setText(clean)
    }
  }

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0} color="default" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" noWrap sx={{ fontWeight: 800, flex: 1 }}>
            {team.name}
          </Typography>
          <Box onClick={() => setShowMembers(true)} sx={{ cursor: 'pointer' }}>
            <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 30, height: 30, fontSize: 13 } }}>
              {members.map((m) => (
                <Avatar key={m.uid} sx={{ bgcolor: colorFor(m.uid) }}>{initials(m.name)}</Avatar>
              ))}
            </AvatarGroup>
          </Box>
          <IconButton onClick={() => setShowQr(true)} aria-label="Invite">
            <QrCode2RoundedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
        {messages.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: "center", mt: 6 }}>
            No messages yet. Say hi 👋
          </Typography>
        )}
        <Stack spacing={1}>
          {messages.map((m, i) => {
            const mine = m.uid === me.uid
            const showName = !mine && messages[i - 1]?.uid !== m.uid
            return (
              <Box key={m.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <Box sx={{ maxWidth: '80%' }}>
                  {showName && (
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colorFor(m.uid), ml: 1.5 }}>
                      {m.name}
                    </Typography>
                  )}
                  <Paper
                    elevation={0}
                    sx={{
                      px: 1.75,
                      py: 1,
                      borderRadius: 3,
                      borderBottomRightRadius: mine ? 4 : undefined,
                      borderBottomLeftRadius: mine ? undefined : 4,
                      bgcolor: mine ? 'primary.main' : 'action.hover',
                      color: mine ? 'primary.contrastText' : 'text.primary',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    <Typography variant="body1">{m.text}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', textAlign: 'right' }}>
                      {m.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            )
          })}
        </Stack>
        <div ref={bottomRef} />
      </Box>

      <Box
        component="form"
        onSubmit={onSend}
        sx={{
          display: 'flex',
          gap: 1,
          p: 1.5,
          pb: 'calc(12px + env(safe-area-inset-bottom))',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          size="small"
          fullWidth
          multiline
          maxRows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend(e)
            }
          }}
        />
        <IconButton type="submit" color="primary" disabled={!text.trim()} aria-label="Send">
          <SendRoundedIcon />
        </IconButton>
      </Box>

      <Dialog open={showMembers} onClose={() => setShowMembers(false)} fullWidth maxWidth="xs">
        <DialogTitle>{members.length} in the team</DialogTitle>
        <List dense>
          {members.map((m) => (
            <ListItem key={m.uid}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: colorFor(m.uid) }}>{initials(m.name)}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={m.name + (m.uid === me.uid ? ' (you)' : '')}
                secondary={m.uid === team.createdBy ? 'Admin' : undefined}
              />
            </ListItem>
          ))}
        </List>
      </Dialog>

      <Dialog open={showQr} onClose={() => setShowQr(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ textAlign: "center" }}>Invite to {team.name}</DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <ShareQr teamId={team.id} teamName={team.name} />
        </DialogContent>
      </Dialog>
    </Box>
  )
}
