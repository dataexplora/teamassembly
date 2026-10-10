import { useEffect, useState } from 'react'
import {
  Avatar,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import PersonRemoveRoundedIcon from '@mui/icons-material/PersonRemoveRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import {
  banMember,
  removeMember,
  renameTeam,
  subscribeBanned,
  unbanMember,
  type Member,
  type Team,
} from '../api'
import { colorFor, initials } from '../people'

type Props = {
  open: boolean
  onClose: () => void
  team: Team
  members: Member[]
  me: Member
  onError: (msg: string) => void
  onLeave: () => void
  onDelete: () => void
}

type PendingAction = { kind: 'remove' | 'ban'; member: Member }

export default function TeamDialog({ open, onClose, team, members, me, onError, onLeave, onDelete }: Props) {
  const isAdmin = me.uid === team.createdBy
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const [saving, setSaving] = useState(false)
  const [menu, setMenu] = useState<{ anchor: HTMLElement; member: Member } | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [working, setWorking] = useState(false)
  const [banned, setBanned] = useState<Member[]>([])
  const [confirmExit, setConfirmExit] = useState(false)

  useEffect(() => {
    if (!editing) setName(team.name)
  }, [team.name, editing])

  useEffect(() => {
    if (!isAdmin || !open) return
    return subscribeBanned(team.id, setBanned)
  }, [isAdmin, open, team.id])

  async function saveName() {
    const clean = name.trim()
    if (!clean || clean === team.name) return setEditing(false)
    setSaving(true)
    try {
      await renameTeam(team.id, clean)
      setEditing(false)
    } catch (err) {
      console.error(err)
      onError('Could not rename the team.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmPending() {
    if (!pending) return
    const { kind, member } = pending
    setWorking(true)
    try {
      if (kind === 'ban') await banMember(team.id, member)
      else await removeMember(team.id, member)
    } catch (err) {
      console.error(err)
      onError(`Could not ${kind} ${member.name}.`)
    } finally {
      setWorking(false)
      setPending(null)
    }
  }

  async function unban(member: Member) {
    try {
      await unbanMember(team.id, member.uid)
    } catch (err) {
      console.error(err)
      onError(`Could not unban ${member.name}.`)
    }
  }

  // Admin first, then everyone else alphabetically
  const sorted = [...members].sort((a, b) =>
    a.uid === team.createdBy ? -1 : b.uid === team.createdBy ? 1 : a.name.localeCompare(b.name),
  )

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pb: 1 }}>
          {editing ? (
            <Stack
              direction="row"
              spacing={1}
              component="form"
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault()
                saveName()
              }}
              sx={{ alignItems: 'center', pt: 1 }}
            >
              <TextField
                label="Team name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 60 } }}
                size="small"
                autoFocus
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={!name.trim() || saving}>
                Save
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, flex: 1, wordBreak: 'break-word' }}>
                {team.name}
              </Typography>
              {isAdmin && (
                <IconButton onClick={() => setEditing(true)} aria-label="Rename team">
                  <EditRoundedIcon />
                </IconButton>
              )}
            </Stack>
          )}
          <Typography variant="body2" color="text.secondary">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </Typography>
        </DialogTitle>

        <List dense>
          {sorted.map((m) => {
            const isThisAdmin = m.uid === team.createdBy
            return (
              <ListItem
                key={m.uid}
                secondaryAction={
                  isAdmin && !isThisAdmin ? (
                    <IconButton
                      edge="end"
                      onClick={(e) => setMenu({ anchor: e.currentTarget, member: m })}
                      aria-label={`Actions for ${m.name}`}
                    >
                      <MoreVertRoundedIcon />
                    </IconButton>
                  ) : undefined
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: colorFor(m.uid) }}>{initials(m.name)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <span>{m.name + (m.uid === me.uid ? ' (you)' : '')}</span>
                      {isThisAdmin && <Chip label="Admin" size="small" color="primary" />}
                    </Stack>
                  }
                />
              </ListItem>
            )
          })}
        </List>

        {isAdmin && banned.length > 0 && (
          <>
            <Divider />
            <List dense subheader={<ListSubheader disableSticky>Banned</ListSubheader>}>
              {banned.map((b) => (
                <ListItem
                  key={b.uid}
                  secondaryAction={
                    <Button size="small" onClick={() => unban(b)}>
                      Unban
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'action.disabled' }}>{initials(b.name)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={b.name} secondary="Cannot rejoin until unbanned" />
                </ListItem>
              ))}
            </List>
          </>
        )}

        <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
          {isAdmin ? (
            <Button color="error" startIcon={<DeleteForeverRoundedIcon />} onClick={() => setConfirmExit(true)}>
              Delete team
            </Button>
          ) : (
            <Button color="error" startIcon={<LogoutRoundedIcon />} onClick={() => setConfirmExit(true)}>
              Leave team
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmExit} onClose={() => setConfirmExit(false)} maxWidth="xs">
        <DialogTitle>{isAdmin ? `Delete ${team.name}?` : `Leave ${team.name}?`}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isAdmin
              ? 'This permanently deletes the team for everyone: all channels, messages, images, polls and members. It cannot be undone.'
              : 'You can come back any time by scanning the invite QR again.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmExit(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmExit(false)
              onClose()
              if (isAdmin) onDelete()
              else onLeave()
            }}
          >
            {isAdmin ? 'Delete forever' : 'Leave'}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            setPending({ kind: 'remove', member: menu!.member })
            setMenu(null)
          }}
        >
          <ListItemIcon>
            <PersonRemoveRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Remove" secondary="Can rejoin with the QR" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setPending({ kind: 'ban', member: menu!.member })
            setMenu(null)
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <BlockRoundedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Ban" secondary="Blocked until you unban" />
        </MenuItem>
      </Menu>

      <Dialog open={!!pending} onClose={() => !working && setPending(null)} maxWidth="xs">
        <DialogTitle>
          {pending?.kind === 'ban' ? 'Ban' : 'Remove'} {pending?.member.name}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pending?.kind === 'ban'
              ? 'They lose access right away and cannot rejoin until you unban them.'
              : 'They lose access right away but can rejoin by scanning the invite QR.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)} disabled={working}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmPending} disabled={working}>
            {working ? 'Working...' : pending?.kind === 'ban' ? 'Ban' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
