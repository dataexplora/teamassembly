import {
  addDoc,
  deleteField,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db, ensureUser } from './firebase'
import { fetchLinkPreview, firstUrl, type LinkPreview } from './linkPreview'

export type Team = { id: string; name: string; createdBy: string }
export type Member = { uid: string; name: string }
export type Message = {
  id: string
  uid: string
  name: string
  type: 'text' | 'image' | 'poll'
  // For polls this is the question
  text: string
  // JPEG data URL, compressed on device (no Storage bucket on the Spark plan)
  image?: string
  options?: string[]
  // uid -> chosen option index
  votes?: Record<string, number>
  // OG preview of the first URL, fetched once by the sender
  link?: LinkPreview
  createdAt: Date | null
}

// 'chat' shows messages; 'todo' shows a shared checklist instead
export type ChannelKind = 'chat' | 'todo'
export type Channel = { id: string; name: string; emoji: string; kind: ChannelKind; custom: boolean; createdBy?: string }
export type ChannelId = string

// Every team starts with these (no docs needed). Ids are kept from v1 so old teams keep
// their history; keep the id list in sync with BUILTIN_CHANNELS in firestore.rules.
export const DEFAULT_CHANNELS: Channel[] = [
  { id: 'general', name: 'General', emoji: '💬', kind: 'chat', custom: false },
  { id: 'brainstorming', name: 'Ideas', emoji: '💡', kind: 'chat', custom: false },
  { id: 'tasks', name: 'To-do', emoji: '✅', kind: 'todo', custom: false },
  { id: 'resources', name: 'Links & files', emoji: '📎', kind: 'chat', custom: false },
  { id: 'random', name: 'Chill', emoji: '🎉', kind: 'chat', custom: false },
]

// Built-ins first, then channels people created, oldest first
export function subscribeChannels(teamId: string, cb: (channels: Channel[]) => void) {
  cb(DEFAULT_CHANNELS)
  // Sorted client side: an orderBy query could briefly hide a channel whose
  // createdAt is still a pending server timestamp, right after we create it
  return onSnapshot(
    collection(db, 'teams', teamId, 'channels'),
    (snap) => {
      const custom = snap.docs
        .map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' })
          return {
            channel: {
              id: d.id,
              name: data.name,
              emoji: data.emoji,
              kind: (data.kind === 'todo' ? 'todo' : 'chat') as ChannelKind,
              custom: true,
              createdBy: data.createdBy,
            },
            at: data.createdAt?.toMillis?.() ?? Date.now(),
          }
        })
        .sort((a, b) => a.at - b.at)
        .map((x) => x.channel)
      cb([...DEFAULT_CHANNELS, ...custom])
    },
    () => {},
  )
}

export async function createChannel(teamId: string, name: string, emoji: string, kind: ChannelKind): Promise<string> {
  const user = await ensureUser()
  const ref = await addDoc(collection(db, 'teams', teamId, 'channels'), {
    name: name.trim(),
    emoji,
    kind,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// Admin only: wipes the channel's messages and tasks, then the channel itself
export async function deleteChannel(teamId: string, channelId: string): Promise<void> {
  await deleteAll(await channelContentPaths(teamId, channelId))
  await deleteDoc(doc(db, 'teams', teamId, 'channels', channelId))
}

async function channelContentPaths(teamId: string, channelId: string): Promise<string[][]> {
  const paths: string[][] = []
  for (const sub of ['messages', 'todos']) {
    const ids = await listIds('teams', teamId, 'channels', channelId, sub)
    paths.push(...ids.map((id) => ['teams', teamId, 'channels', channelId, sub, id]))
  }
  return paths
}

export type Todo = {
  id: string
  text: string
  createdBy: string
  done: boolean
  doneBy?: { uid: string; name: string }
  assignee?: { uid: string; name: string }
  createdAt: Date | null
}

function todosRef(teamId: string, channelId: string) {
  return collection(db, 'teams', teamId, 'channels', channelId, 'todos')
}

export function subscribeTodos(teamId: string, channelId: string, cb: (todos: Todo[]) => void) {
  return onSnapshot(
    todosRef(teamId, channelId),
    (snap) =>
      cb(
        snap.docs
          .map((d) => {
            const data = d.data({ serverTimestamps: 'estimate' })
            return {
              id: d.id,
              text: data.text,
              createdBy: data.createdBy,
              done: !!data.done,
              doneBy: data.doneBy ?? undefined,
              assignee: data.assignee ?? undefined,
              createdAt: data.createdAt?.toDate() ?? null,
            }
          })
          .sort((a, b) => (a.createdAt?.getTime() ?? Date.now()) - (b.createdAt?.getTime() ?? Date.now())),
      ),
    () => {},
  )
}

export async function addTodo(teamId: string, channelId: string, text: string): Promise<void> {
  const user = await ensureUser()
  await addDoc(todosRef(teamId, channelId), {
    text: text.trim(),
    createdBy: user.uid,
    done: false,
    doneBy: null,
    assignee: null,
    createdAt: serverTimestamp(),
  })
}

export async function setTodoDone(teamId: string, channelId: string, id: string, me: Member, done: boolean) {
  await updateDoc(doc(todosRef(teamId, channelId), id), {
    done,
    doneBy: done ? { uid: me.uid, name: me.name } : null,
  })
}

// Pass null to drop the task back in the pool
export async function setTodoAssignee(teamId: string, channelId: string, id: string, who: Member | null) {
  await updateDoc(doc(todosRef(teamId, channelId), id), {
    assignee: who ? { uid: who.uid, name: who.name } : null,
  })
}

export async function deleteTodo(teamId: string, channelId: string, id: string) {
  await deleteDoc(doc(todosRef(teamId, channelId), id))
}

const TEAM_LIFETIME_MS = 24 * 60 * 60 * 1000

export async function createTeam(teamName: string, myName: string): Promise<string> {
  const user = await ensureUser()
  const ref = doc(collection(db, 'teams'))
  await setDoc(ref, {
    name: teamName.trim(),
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + TEAM_LIFETIME_MS),
  })
  await joinTeam(ref.id, myName)
  return ref.id
}

export async function getTeam(teamId: string): Promise<Team | null> {
  await ensureUser()
  const snap = await getDoc(doc(db, 'teams', teamId))
  if (!snap.exists() || snap.data().closed) return null
  const data = snap.data()
  return { id: snap.id, name: data.name, createdBy: data.createdBy }
}

export async function getMyMembership(teamId: string): Promise<Member | null> {
  const user = await ensureUser()
  const snap = await getDoc(doc(db, 'teams', teamId, 'members', user.uid))
  return snap.exists() ? { uid: user.uid, name: snap.data().name } : null
}

export async function amIBanned(teamId: string): Promise<boolean> {
  const user = await ensureUser()
  const snap = await getDoc(doc(db, 'teams', teamId, 'banned', user.uid))
  return snap.exists()
}

// Live team doc so a rename shows up for everyone; null once the admin deletes it
export function subscribeTeam(teamId: string, cb: (team: Team | null) => void) {
  return onSnapshot(
    doc(db, 'teams', teamId),
    (snap) => {
      const data = snap.data()
      cb(data && !data.closed ? { id: snap.id, name: data.name, createdBy: data.createdBy } : null)
    },
    () => cb(null),
  )
}

// Fires false when the admin removes us
export function subscribeMyMembership(teamId: string, uid: string, cb: (isMember: boolean) => void) {
  return onSnapshot(
    doc(db, 'teams', teamId, 'members', uid),
    (snap) => cb(snap.exists()),
    () => cb(false),
  )
}

export async function renameTeam(teamId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId), { name: name.trim() })
}

export async function leaveTeam(teamId: string, me: Member): Promise<void> {
  await removeMember(teamId, me)
}

async function deleteAll(paths: string[][]) {
  // Firestore batches cap at 500 writes
  for (let i = 0; i < paths.length; i += 450) {
    const batch = writeBatch(db)
    for (const p of paths.slice(i, i + 450)) batch.delete(doc(db, p.join('/')))
    await batch.commit()
  }
}

async function listIds(...path: string[]): Promise<string[]> {
  const snap = await getDocs(collection(db, path.join('/')))
  return snap.docs.map((d) => d.id)
}

// Firestore does not cascade deletes and there are no Cloud Functions on Spark,
// so the admin's browser wipes everything. Order matters for the rules:
// 1. mark closed (everyone sees 'deleted' instantly), 2. messages and bans,
// 3. other members, 4. the admin's own membership, 5. the team doc last
// (isAdmin / isMember checks need those docs alive until the end).
export async function deleteTeam(teamId: string): Promise<void> {
  const user = await ensureUser()
  await updateDoc(doc(db, 'teams', teamId), { closed: true })

  const customIds = await listIds('teams', teamId, 'channels')
  const channelIds = [...DEFAULT_CHANNELS.map((c) => c.id), ...customIds]
  const messagePaths: string[][] = []
  for (const c of channelIds) messagePaths.push(...(await channelContentPaths(teamId, c)))
  const bannedIds = await listIds('teams', teamId, 'banned')
  const nameIds = await listIds('teams', teamId, 'names')
  await deleteAll([
    ...messagePaths,
    ...customIds.map((id) => ['teams', teamId, 'channels', id]),
    ...bannedIds.map((id) => ['teams', teamId, 'banned', id]),
    ...nameIds.map((id) => ['teams', teamId, 'names', id]),
  ])

  const memberIds = (await listIds('teams', teamId, 'members')).filter((id) => id !== user.uid)
  await deleteAll(memberIds.map((id) => ['teams', teamId, 'members', id]))
  await deleteAll([['teams', teamId, 'members', user.uid]])
  await deleteDoc(doc(db, 'teams', teamId))
}

// Remove (or leave): they are out and their name is free again; they can rejoin with the QR
export async function removeMember(teamId: string, member: Member): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'teams', teamId, 'members', member.uid))
  batch.delete(doc(db, 'teams', teamId, 'names', nameKey(member.name)))
  await batch.commit()
}

// Ban: remove and block rejoining (same browser) until the admin unbans
export async function banMember(teamId: string, member: Member): Promise<void> {
  const batch = writeBatch(db)
  batch.set(doc(db, 'teams', teamId, 'banned', member.uid), { name: member.name, at: serverTimestamp() })
  batch.delete(doc(db, 'teams', teamId, 'members', member.uid))
  batch.delete(doc(db, 'teams', teamId, 'names', nameKey(member.name)))
  await batch.commit()
}

export async function unbanMember(teamId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, 'teams', teamId, 'banned', uid))
}

// Admin only (rules deny everyone else)
export function subscribeBanned(teamId: string, cb: (banned: Member[]) => void) {
  return onSnapshot(
    collection(db, 'teams', teamId, 'banned'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, name: d.data().name }))),
    () => {},
  )
}

// Doc id for the names index: case-insensitive, and '/' is not allowed in Firestore ids
export function nameKey(name: string): string {
  return 'n_' + name.trim().toLowerCase().replace(/\//g, '_')
}

export class NameTakenError extends Error {}

// Claims the name and creates the membership atomically, so two people tapping Join
// with the same name at the same moment cannot both get it (rules enforce the pairing)
export async function joinTeam(teamId: string, name: string): Promise<void> {
  const user = await ensureUser()
  const clean = name.trim()
  const key = nameKey(clean)
  const taken = await getDoc(doc(db, 'teams', teamId, 'names', key))
  if (taken.exists() && taken.data().uid !== user.uid) throw new NameTakenError(clean)
  const batch = writeBatch(db)
  batch.set(doc(db, 'teams', teamId, 'names', key), { uid: user.uid })
  batch.set(doc(db, 'teams', teamId, 'members', user.uid), {
    name: clean,
    nameKey: key,
    joinedAt: serverTimestamp(),
  })
  try {
    await batch.commit()
  } catch (err) {
    // Lost the race: someone claimed the name between our check and the commit
    const now = await getDoc(doc(db, 'teams', teamId, 'names', key)).catch(() => null)
    if (now?.exists() && now.data().uid !== user.uid) throw new NameTakenError(clean)
    throw err
  }
}

export function subscribeMembers(teamId: string, cb: (members: Member[]) => void) {
  return onSnapshot(
    collection(db, 'teams', teamId, 'members'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, name: d.data().name }))),
    () => {},
  )
}

function messagesRef(teamId: string, channel: ChannelId) {
  return collection(db, 'teams', teamId, 'channels', channel, 'messages')
}

export function subscribeMessages(
  teamId: string,
  channel: ChannelId,
  cb: (messages: Message[]) => void,
) {
  const q = query(messagesRef(teamId, channel), orderBy('createdAt'), limitToLast(200))
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        // 'estimate' fills pending server timestamps so own messages render immediately
        const data = d.data({ serverTimestamps: 'estimate' })
        return {
          id: d.id,
          uid: data.uid,
          name: data.name,
          type: data.type,
          text: data.text ?? '',
          image: data.image,
          options: data.options,
          votes: data.votes,
          link: data.link,
          createdAt: data.createdAt?.toDate() ?? null,
        }
      }),
    )
  })
}

export async function sendMessage(
  teamId: string,
  channel: ChannelId,
  name: string,
  content: { text?: string; image?: string },
): Promise<void> {
  const user = await ensureUser()
  const text = content.text?.trim() ?? ''
  const ref = await addDoc(messagesRef(teamId, channel), {
    uid: user.uid,
    name,
    type: content.image ? 'image' : 'text',
    text,
    ...(content.image ? { image: content.image } : {}),
    createdAt: serverTimestamp(),
  })
  // Fire and forget: the message is already sent, the preview card fills in when the scrape returns
  const url = firstUrl(text)
  if (url) {
    fetchLinkPreview(url)
      .then((preview) => preview && updateDoc(ref, { link: preview }))
      .catch((err) => console.warn('link preview skipped', err))
  }
}

export async function sendPoll(
  teamId: string,
  channel: ChannelId,
  name: string,
  question: string,
  options: string[],
): Promise<void> {
  const user = await ensureUser()
  await addDoc(messagesRef(teamId, channel), {
    uid: user.uid,
    name,
    type: 'poll',
    text: question.trim(),
    options: options.map((o) => o.trim()).filter(Boolean),
    votes: {},
    createdAt: serverTimestamp(),
  })
}

// Single choice; pass null to take the vote back
export async function vote(
  teamId: string,
  channel: ChannelId,
  messageId: string,
  option: number | null,
): Promise<void> {
  const user = await ensureUser()
  await updateDoc(doc(messagesRef(teamId, channel), messageId), {
    [`votes.${user.uid}`]: option === null ? deleteField() : option,
  })
}
