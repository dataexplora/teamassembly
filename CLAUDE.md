# Team Assembly (hackathon, Commit Athens, Oct 2026)

Temporary collaboration rooms. Admin creates a team, shows a QR, strangers scan it, type a name, and land in a Discord-lite chat. Mobile first, max 3 screens, NO visible login.

## Stack
- `app/`: Vite 8 + React 19 + TS, MUI 9, react-router 7, qrcode.react. PWA via plain `public/manifest.webmanifest` (vite-plugin-pwa install hung, skipped).
- Firebase project `teamassembly-853e4` (account dataexploragreece@gmail.com). Web app id `1:815026458532:web:54e4ab8fed54d491d13b31`. Config hardcoded in `app/src/firebase.ts` (public by design).
- Auth: Anonymous only, silent (`ensureUser()`). Gives a uid so rules work; user never sees it.
- Firestore `eur3`. Rules in `firestore.rules`. Hosting serves `app/dist` (site `teamassembly-853e4`, SPA rewrite).
- Storage NOT enabled yet: needs Blaze plan. `storage.rules` draft lives in this file's history (members write under `teams/{teamId}/{uid}/`, 20MB cap, membership checked via `firestore.exists`).
- Stray GCP project `teamassembly-commitathens` was created by a failed MCP attempt (ToS not accepted). Unused, can be deleted.

## Data model
```
teams/{teamId}                 name, createdBy(uid), createdAt, expiresAt(+24h)
teams/{teamId}/members/{uid}   name, joinedAt
teams/{teamId}/messages/{id}   uid, name, type('text'), text, createdAt
```
teamId = Firestore auto id (unguessable, this is the invite secret).

## Routes
`/` create team (team name + your name) -> `/t/:id/share` big QR -> `/t/:id` room (join form if not a member, else chat).

## Commands
- `cd app && npm run dev` / `npm run build`
- Deploy: Firebase MCP `firebase_deploy` (only: firestore,hosting) or `npx firebase-tools deploy`.

## Gotchas
- MUI 9 removed system props: `fontWeight`, `textAlign`, `alignItems` go in `sx`, not as props.
- troth-bash refuses `rm -rf`; delete files individually.
- No em dashes anywhere (operator rule).
- Never add Claude as co-author in commits.

## Next
- Attachments + voice notes (needs Blaze + Storage).
- Firestore TTL policy on `teams.expiresAt` (gcloud) so rooms self-destruct.
