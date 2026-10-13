# Assemblie

Assemblie is a mobile-first app for temporary team rooms. Create a team, share the QR code, and let people join with only a display name.

## What It Does

- Creates short-lived team rooms with QR invite links
- Supports real-time chat, image messages, polls, link previews, and shared todo boards
- Includes built-in and custom channels
- Gives admins controls for renaming teams, managing members, banning users, deleting channels, and deleting teams
- Uses silent Firebase anonymous auth, so users do not see a login flow

## Stack

React, TypeScript, Vite, Material UI, React Router, Firebase Auth, Firestore, and `qrcode.react`.

## Run Locally

```bash
cd app
npm install
npm run dev
```

## Build

```bash
cd app
npm run build
npm run lint
```

Firebase client config lives in `app/src/firebase.ts`; access is enforced by `firestore.rules`.
