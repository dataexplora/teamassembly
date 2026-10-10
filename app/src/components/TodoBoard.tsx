import { useEffect, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import {
  addTodo,
  deleteTodo,
  setTodoAssignee,
  setTodoDone,
  subscribeTodos,
  type Member,
  type Todo,
} from '../api'
import { colorFor, initials } from '../people'

type Props = {
  teamId: string
  channelId: string
  me: Member
  isAdmin: boolean
  onError: (msg: string) => void
}

export default function TodoBoard({ teamId, channelId, me, isAdmin, onError }: Props) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    setTodos([])
    return subscribeTodos(teamId, channelId, setTodos)
  }, [teamId, channelId])

  const open = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)
  const pct = todos.length ? Math.round((done.length / todos.length) * 100) : 0

  const fail = (msg: string) => (err: unknown) => {
    console.error(err)
    onError(msg)
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const clean = text.trim()
    if (!clean) return
    setText('')
    addTodo(teamId, channelId, clean).catch((err) => {
      setText(clean)
      fail('Could not add the task.')(err)
    })
  }

  function row(t: Todo) {
    const mineToClaim = t.assignee?.uid === me.uid
    const canDelete = t.createdBy === me.uid || isAdmin
    return (
      <Paper
        key={t.id}
        variant="outlined"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 0.5, pr: 1, py: 0.5, borderRadius: 3 }}
      >
        {/* Only the admin can sign tasks off; members see the state but cannot change it */}
        <Tooltip title={isAdmin ? '' : 'Only the admin can mark tasks as done'}>
          <span>
            <Checkbox
              checked={t.done}
              disabled={!isAdmin}
              onChange={(e) =>
                setTodoDone(teamId, channelId, t.id, me, e.target.checked).catch(fail('Could not update the task.'))
              }
              slotProps={{ input: { 'aria-label': t.text } }}
            />
          </span>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0, py: 0.5 }}>
          <Typography
            sx={{
              wordBreak: 'break-word',
              textDecoration: t.done ? 'line-through' : 'none',
              color: t.done ? 'text.secondary' : 'text.primary',
            }}
          >
            {t.text}
          </Typography>
          {t.done && t.doneBy && (
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
              ✓ {t.doneBy.uid === me.uid ? 'you' : t.doneBy.name}
            </Typography>
          )}
        </Box>
        {!t.done &&
          (t.assignee ? (
            <Chip
              size="small"
              avatar={
                <Avatar sx={{ bgcolor: `${colorFor(t.assignee.uid)} !important`, color: '#fff !important' }}>
                  {initials(t.assignee.name)}
                </Avatar>
              }
              label={mineToClaim ? 'You' : t.assignee.name}
              // Tap your own chip to drop the task; anyone else's chip is read only
              onDelete={
                mineToClaim
                  ? () => setTodoAssignee(teamId, channelId, t.id, null).catch(fail('Could not update the task.'))
                  : undefined
              }
              sx={{ maxWidth: 120 }}
            />
          ) : (
            <Button
              size="small"
              onClick={() => setTodoAssignee(teamId, channelId, t.id, me).catch(fail('Could not update the task.'))}
              sx={{ whiteSpace: 'nowrap' }}
            >
              I'll take it
            </Button>
          ))}
        {canDelete && (
          <IconButton
            size="small"
            aria-label="Delete task"
            onClick={() => deleteTodo(teamId, channelId, t.id).catch(fail('Could not delete the task.'))}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Paper>
    )
  }

  return (
    <>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
        {todos.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {done.length} / {todos.length} done
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {pct}%
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} />
            {!isAdmin && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                Claim a task with "I'll take it". The admin ticks it off when it's done.
              </Typography>
            )}
          </Box>
        )}

        {todos.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
            No tasks yet. Add the first one below 👇
          </Typography>
        )}

        <Stack spacing={1}>{open.map(row)}</Stack>

        {done.length > 0 && (
          <>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 3, mb: 1, fontWeight: 700 }}>
              Done
            </Typography>
            <Stack spacing={1}>{done.map(row)}</Stack>
          </>
        )}
      </Box>

      <Box
        component="form"
        onSubmit={onAdd}
        sx={{
          display: 'flex',
          alignItems: 'center',
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
          placeholder="Add a task..."
          size="small"
          fullWidth
          slotProps={{ htmlInput: { maxLength: 200, enterKeyHint: 'done' } }}
        />
        <IconButton type="submit" color="primary" disabled={!text.trim()} aria-label="Add task">
          <AddTaskRoundedIcon />
        </IconButton>
      </Box>
    </>
  )
}
