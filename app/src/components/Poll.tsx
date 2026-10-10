import { Avatar, AvatarGroup, Box, ButtonBase, Stack, Tooltip, Typography } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import PollRoundedIcon from '@mui/icons-material/PollRounded'
import type { Member, Message } from '../api'
import { colorFor, initials } from '../people'

type Props = {
  message: Message
  myUid: string
  members: Member[]
  mine: boolean
  onVote: (option: number | null) => void
}

export default function Poll({ message, myUid, members, mine, onVote }: Props) {
  const options = message.options ?? []
  const votes = message.votes ?? {}
  const counts = options.map((_, i) => Object.values(votes).filter((v) => v === i).length)
  const total = counts.reduce((a, b) => a + b, 0)
  const myVote = votes[myUid]
  const nameOf = (uid: string) => members.find((m) => m.uid === uid)?.name ?? '?'

  return (
    <Box sx={{ minWidth: 240, px: 0.5, pt: 0.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
        <PollRoundedIcon fontSize="small" sx={{ opacity: 0.8 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {message.text}
        </Typography>
      </Stack>
      <Stack spacing={0.75}>
        {options.map((label, i) => {
          const pct = total ? Math.round((counts[i]! / total) * 100) : 0
          const chosen = myVote === i
          const voters = Object.keys(votes).filter((uid) => votes[uid] === i)
          return (
            <ButtonBase
              key={i}
              onClick={() => onVote(chosen ? null : i)}
              sx={{
                position: 'relative',
                display: 'block',
                width: '100%',
                textAlign: 'left',
                borderRadius: 2,
                overflow: 'hidden',
                border: 1,
                borderColor: chosen ? 'currentColor' : mine ? 'rgba(255,255,255,0.35)' : 'divider',
              }}
            >
              {/* Result bar behind the label */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: `${pct}%`,
                  bgcolor: mine ? 'rgba(255,255,255,0.22)' : 'action.selected',
                  transition: 'width 300ms ease',
                }}
              />
              <Stack direction="row" spacing={1} sx={{ position: 'relative', alignItems: 'center', px: 1.25, py: 0.9 }}>
                {chosen && <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />}
                <Typography variant="body2" sx={{ flex: 1, fontWeight: chosen ? 700 : 500 }}>
                  {label}
                </Typography>
                {voters.length > 0 && (
                  <AvatarGroup
                    max={4}
                    sx={{
                      '& .MuiAvatar-root': {
                        width: 22,
                        height: 22,
                        fontSize: 10,
                        fontWeight: 700,
                        borderWidth: 1.5,
                        borderColor: mine ? 'primary.main' : 'background.paper',
                      },
                    }}
                  >
                    {voters.map((uid) => (
                      <Tooltip key={uid} title={nameOf(uid)}>
                        <Avatar sx={{ bgcolor: colorFor(uid) }}>{initials(nameOf(uid))}</Avatar>
                      </Tooltip>
                    ))}
                  </AvatarGroup>
                )}
                <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.85, minWidth: 36, textAlign: 'right' }}>
                  {pct}%
                </Typography>
              </Stack>
            </ButtonBase>
          )
        })}
      </Stack>
      <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.75 }}>
        {total} {total === 1 ? 'vote' : 'votes'} · tap to vote, tap again to undo
      </Typography>
    </Box>
  )
}
