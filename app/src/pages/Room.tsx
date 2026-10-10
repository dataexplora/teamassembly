import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded'
import PollRoundedIcon from '@mui/icons-material/PollRounded'
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import NewChannelDialog from '../components/NewChannelDialog'
import TodoBoard from '../components/TodoBoard'
import {
  DEFAULT_CHANNELS,
  createChannel,
  deleteChannel,
  subscribeChannels,
  type Channel,
  amIBanned,
  deleteTeam,
  getMyMembership,
  leaveTeam,
  getTeam,
  joinTeam,
  NameTakenError,
  sendMessage,
  sendPoll,
  subscribeMembers,
  subscribeMessages,
  subscribeMyMembership,
  subscribeTeam,
  vote,
  type ChannelId,
  type Member,
  type Message,
  type Team,
} from '../api'
import { auth } from '../firebase'
import { loadMyName, saveMyName } from '../identity'
import { compressImage } from '../image'
import ShareQr from '../components/ShareQr'
import Linkify from '../components/Linkify'
import Poll from '../components/Poll'
import PollDialog from '../components/PollDialog'
import LinkCard from '../components/LinkCard'
import TeamDialog from '../components/TeamDialog'
import { colorFor, initials } from '../people'

type Phase = 'loading' | 'missing' | 'join' | 'in' | 'removed' | 'banned' | 'deleted' | 'leaving'

export default function Room() {
  const { teamId = '' } = useParams()
  const navigate = useNavigate()
  // Set while we are the ones leaving/deleting, so our own subscriptions do not show 'removed'
  const selfExit = useRef(false)
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
        setPhase((await amIBanned(teamId)) ? 'banned' : 'join')
      }
    })().catch((err) => {
      console.error(err)
      if (!cancelled) setPhase('missing')
    })
    return () => {
      cancelled = true
    }
  }, [teamId])

  // While inside: follow renames and notice if the admin removes us
  const inside = phase === 'in' && me
  useEffect(() => {
    if (!inside) return
    const offTeam = subscribeTeam(teamId, (t) => {
      if (t) setTeam(t)
      else if (!selfExit.current) setPhase('deleted')
    })
    const offMe = subscribeMyMembership(teamId, me.uid, (still) => {
      if (still || selfExit.current) return
      amIBanned(teamId)
        .catch(() => false)
        // A team deletion also removes members: do not overwrite 'deleted'
        .then((b) => setPhase((p) => (p === 'deleted' ? p : b ? 'banned' : 'removed')))
    })
    return () => {
      offTeam()
      offMe()
    }
  }, [inside, teamId, me?.uid])

  async function exit(action: () => Promise<void>) {
    selfExit.current = true
    setPhase('leaving')
    try {
      await action()
    } catch (err) {
      console.error(err)
    }
    navigate('/', { replace: true })
  }

  if (phase === 'loading' || phase === 'leaving') {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }
  if (phase === 'deleted') {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 3 }}>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Alert severity="info">The admin deleted {team?.name ?? 'this team'}. All messages are gone.</Alert>
          <Button variant="outlined" onClick={() => navigate('/', { replace: true })}>
            Start a new team
          </Button>
        </Stack>
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
  if (phase === 'banned') {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 3 }}>
        <Alert severity="error">You were banned from {team.name} by the admin.</Alert>
      </Box>
    )
  }
  if (phase === 'removed') {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 3 }}>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Alert severity="warning">You were removed from {team.name} by the admin.</Alert>
          <Button variant="outlined" onClick={() => setPhase('join')}>
            Join again
          </Button>
        </Stack>
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
  return (
    <Chat
      team={team}
      me={me!}
      onLeave={() => exit(() => leaveTeam(teamId, me!))}
      onDelete={() => exit(() => deleteTeam(teamId))}
    />
  )
}

function JoinForm({ team, onJoined }: { team: Team; onJoined: (m: Member) => void }) {
  const [name, setName] = useState(loadMyName())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [taken, setTaken] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean || busy) return
    setBusy(true)
    setError(null)
    setTaken(null)
    try {
      await joinTeam(team.id, clean)
      saveMyName(clean)
      onJoined({ uid: auth.currentUser!.uid, name: clean })
    } catch (err) {
      if (err instanceof NameTakenError) {
        setTaken(clean)
      } else {
        console.error(err)
        setError('Could not join. Try again.')
      }
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 3, py: 6 }}>
      <Stack spacing={4} component="form" onSubmit={onSubmit} sx={{ maxWidth: 420, width: '100%', mx: 'auto' }}>
        <Stack spacing={1} sx={{ textAlign: 'center' }}>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>You are invited to</Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>{team.name}</Typography>
          <Typography color="text.secondary">Just tell the team what to call you.</Typography>
        </Stack>
        <TextField
          label="Your name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setTaken(null)
          }}
          error={!!taken}
          helperText={taken ? `"${taken}" is already taken in this team. Try another name.` : ' '}
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

type ChatProps = { team: Team; me: Member; onLeave: () => void; onDelete: () => void }

function Chat({ team, me, onLeave, onDelete }: ChatProps) {
  const [channel, setChannel] = useState<ChannelId>('general')
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS)
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState(false)
  const isAdmin = me.uid === team.createdBy
  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMembers, setShowMembers] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [showPoll, setShowPoll] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => subscribeMembers(team.id, setMembers), [team.id])
  useEffect(() => subscribeChannels(team.id, setChannels), [team.id])
  const current = channels.find((c) => c.id === channel)
  // If the admin deleted the channel we are looking at, fall back to General
  useEffect(() => {
    if (!current) setChannel('general')
  }, [current])
  const channelLabel = current ? `${current.emoji} ${current.name}` : ''
  const isTodo = current?.kind === 'todo'
  useEffect(() => {
    setMessages([])
    if (isTodo) return
    return subscribeMessages(team.id, channel, setMessages)
  }, [team.id, channel, isTodo])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    const clean = text.trim()
    if (!clean) return
    setText('')
    try {
      await sendMessage(team.id, channel, me.name, { text: clean })
    } catch (err) {
      console.error(err)
      setText(clean)
      setError('Message not sent.')
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const image = await compressImage(file)
      // Whatever is typed goes along as the caption
      const caption = text.trim()
      setText('')
      await sendMessage(team.id, channel, me.name, { image, text: caption })
    } catch (err) {
      console.error(err)
      setError('Could not send that image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0} color="default" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography
            variant="h6"
            noWrap
            onClick={() => setShowMembers(true)}
            sx={{ fontWeight: 800, flex: 1, cursor: 'pointer' }}
          >
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
          {me.uid === team.createdBy && (
            <IconButton onClick={() => setShowMembers(true)} aria-label="Manage team">
              <ManageAccountsRoundedIcon />
            </IconButton>
          )}
        </Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', pr: 0.5 }}>
          <Tabs
            value={current ? channel : false}
            onChange={(_, v) => setChannel(v)}
            variant="scrollable"
            scrollButtons={false}
            sx={{ flex: 1, minHeight: 40, px: 1, '& .MuiTab-root': { minHeight: 40, minWidth: 0, px: 1.5 } }}
          >
            {channels.map((c) => (
              <Tab key={c.id} value={c.id} label={`${c.emoji} ${c.name}`} />
            ))}
          </Tabs>
          {isAdmin && current?.custom && (
            <IconButton size="small" onClick={() => setConfirmDeleteChannel(true)} aria-label="Delete channel">
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" color="primary" onClick={() => setShowNewChannel(true)} aria-label="New channel">
            <AddRoundedIcon />
          </IconButton>
        </Box>
      </AppBar>

      {current?.kind === 'todo' ? (
        <TodoBoard teamId={team.id} channelId={channel} me={me} isAdmin={isAdmin} onError={setError} />
      ) : (
      <>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
        {messages.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
            Nothing in {channelLabel} yet. Start it off 👋
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
                      px: m.image ? 0.5 : 1.75,
                      pt: m.image ? 0.5 : 1,
                      pb: 1,
                      borderRadius: 3,
                      borderBottomRightRadius: mine ? 4 : undefined,
                      borderBottomLeftRadius: mine ? undefined : 4,
                      bgcolor: mine ? 'primary.main' : 'action.hover',
                      color: mine ? 'primary.contrastText' : 'text.primary',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflow: 'hidden',
                    }}
                  >
                    {m.image && (
                      <Box
                        component="img"
                        src={m.image}
                        alt=""
                        onClick={() => setViewImage(m.image!)}
                        sx={{ display: 'block', maxWidth: '100%', maxHeight: 320, borderRadius: 2.5, cursor: 'zoom-in' }}
                      />
                    )}
                    {m.type === 'poll' ? (
                      <Poll
                        message={m}
                        myUid={me.uid}
                        members={members}
                        mine={mine}
                        onVote={(option) =>
                          vote(team.id, channel, m.id, option).catch((err) => {
                            console.error(err)
                            setError('Vote not counted.')
                          })
                        }
                      />
                    ) : (
                      <>
                        {m.text && (
                          <Typography variant="body1" sx={{ px: m.image ? 1.25 : 0, pt: m.image ? 0.75 : 0 }}>
                            <Linkify text={m.text} />
                          </Typography>
                        )}
                        {m.link && <LinkCard preview={m.link} mine={mine} />}
                      </>
                    )}
                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', textAlign: 'right', px: m.image ? 1.25 : 0 }}>
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
          alignItems: 'flex-end',
          gap: 0.5,
          p: 1.5,
          pb: 'calc(12px + env(safe-area-inset-bottom))',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        <IconButton onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Attach image">
          {uploading ? <CircularProgress size={22} /> : <AddPhotoAlternateRoundedIcon />}
        </IconButton>
        <IconButton onClick={() => setShowPoll(true)} aria-label="New poll">
          <PollRoundedIcon />
        </IconButton>
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${current?.name ?? ''}`}
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
      </>
      )}

      <TeamDialog
        open={showMembers}
        onClose={() => setShowMembers(false)}
        team={team}
        members={members}
        me={me}
        onError={setError}
        onLeave={onLeave}
        onDelete={onDelete}
      />

      <Dialog open={showQr} onClose={() => setShowQr(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ textAlign: 'center' }}>Invite to {team.name}</DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <ShareQr teamId={team.id} teamName={team.name} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewImage} onClose={() => setViewImage(null)} fullScreen>
        <Box
          onClick={() => setViewImage(null)}
          sx={{ height: '100%', bgcolor: '#000', display: 'grid', placeItems: 'center', cursor: 'zoom-out' }}
        >
          {viewImage && <Box component="img" src={viewImage} alt="" sx={{ maxWidth: '100%', maxHeight: '100%' }} />}
        </Box>
      </Dialog>

      <NewChannelDialog
        open={showNewChannel}
        onClose={() => setShowNewChannel(false)}
        onCreate={async (name, emoji, kind) => {
          try {
            const id = await createChannel(team.id, name, emoji, kind)
            setChannel(id)
          } catch (err) {
            console.error(err)
            setError('Could not create the channel.')
            throw err
          }
        }}
      />

      <Dialog open={confirmDeleteChannel} onClose={() => setConfirmDeleteChannel(false)} maxWidth="xs">
        <DialogTitle>Delete {channelLabel}?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">All messages in this channel are deleted for everyone.</Typography>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
          <Button onClick={() => setConfirmDeleteChannel(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              const id = channel
              setConfirmDeleteChannel(false)
              setChannel('general')
              deleteChannel(team.id, id).catch((err) => {
                console.error(err)
                setError('Could not delete the channel.')
              })
            }}
          >
            Delete
          </Button>
        </Box>
      </Dialog>

      <PollDialog
        open={showPoll}
        onClose={() => setShowPoll(false)}
        onCreate={async (question, options) => {
          try {
            await sendPoll(team.id, channel, me.name, question, options)
          } catch (err) {
            console.error(err)
            setError('Could not post the poll.')
            throw err
          }
        }}
      />

      <Snackbar open={!!error} autoHideDuration={3000} onClose={() => setError(null)} message={error} />
    </Box>
  )
}
