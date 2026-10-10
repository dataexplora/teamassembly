import {
  addDoc,
  collection,
  doc,
  getDoc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db, ensureUser } from './firebase'

export type Team = { id: string; name: string; createdBy: string }
export type Member = { uid: string; name: string }
export type Message = {
  id: string
  uid: string
  name: string
  type: 'text'
  text: string
  createdAt: Date | null
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
  if (!snap.exists()) return null
  const data = snap.data()
  return { id: snap.id, name: data.name, createdBy: data.createdBy }
}

export async function getMyMembership(teamId: string): Promise<Member | null> {
  const user = await ensureUser()
  const snap = await getDoc(doc(db, 'teams', teamId, 'members', user.uid))
  return snap.exists() ? { uid: user.uid, name: snap.data().name } : null
}

export async function joinTeam(teamId: string, name: string): Promise<void> {
  const user = await ensureUser()
  await setDoc(doc(db, 'teams', teamId, 'members', user.uid), {
    name: name.trim(),
    joinedAt: serverTimestamp(),
  })
}

export function subscribeMembers(teamId: string, cb: (members: Member[]) => void) {
  return onSnapshot(collection(db, 'teams', teamId, 'members'), (snap) => {
    cb(snap.docs.map((d) => ({ uid: d.id, name: d.data().name })))
  })
}

export function subscribeMessages(teamId: string, cb: (messages: Message[]) => void) {
  const q = query(
    collection(db, 'teams', teamId, 'messages'),
    orderBy('createdAt'),
    limitToLast(300),
  )
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
          createdAt: data.createdAt?.toDate() ?? null,
        }
      }),
    )
  })
}

export async function sendText(teamId: string, name: string, text: string): Promise<void> {
  const user = await ensureUser()
  await addDoc(collection(db, 'teams', teamId, 'messages'), {
    uid: user.uid,
    name,
    type: 'text',
    text: text.trim(),
    createdAt: serverTimestamp(),
  })
}
