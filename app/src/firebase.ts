import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, type User } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Web config is public by design; access is enforced by firestore.rules
const app = initializeApp({
  apiKey: 'AIzaSyDU7KWsIA3HwcKaK0KzJjaJwvA5dEx7lbQ',
  authDomain: 'teamassembly-853e4.firebaseapp.com',
  projectId: 'teamassembly-853e4',
  storageBucket: 'teamassembly-853e4.firebasestorage.app',
  messagingSenderId: '815026458532',
  appId: '1:815026458532:web:54e4ab8fed54d491d13b31',
})

export const auth = getAuth(app)
export const db = getFirestore(app)

// Silent anonymous sign-in: the user never sees a login screen.
// Firebase persists the anonymous uid in the browser, so a refresh keeps the same identity.
let userPromise: Promise<User> | null = null
export function ensureUser(): Promise<User> {
  if (!userPromise) {
    userPromise = auth.authStateReady().then(async () => {
      if (auth.currentUser) return auth.currentUser
      const cred = await signInAnonymously(auth)
      return cred.user
    })
    userPromise.catch(() => {
      userPromise = null
    })
  }
  return userPromise
}

