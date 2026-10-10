# Assemblie (hackathon, Commit Athens, Oct 2026)

Product name is "Assemblie" (with -ie, because of the domain; was "Assembly", before that "Team Assembly"). Domain: https://assemblie.link (Cloudflare DNS, A 199.36.158.100 + TXT hosting-site=teamassembly-853e4, proxy OFF / grey cloud; Firebase Hosting custom domain). Fallback URL: https://teamassembly-853e4.web.app. PWA: full manifest (id, scope, maskable icons with extra padding, shortcuts) + no-op network-only `public/sw.js` for installability. Logo: violet chat bubble with QR, icons in app/public (icon-32/48/192/512, apple-touch-icon) generated with `sips` from the PNG in ~/Downloads (padded square, bg #5b3df5). Brand: primary #5b3df5, accent coral #ff6b5e (theme secondary).

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
teams/{teamId}/banned/{uid}    name, at   (written by admin on kick; blocks rejoin via rules)
teams/{teamId}/channels/{channelId}/messages/{id}
                               uid, name, type('text'|'image'|'poll'), text (poll: question),
                               image?(JPEG data URL), options?(2..6), votes?{uid: optionIndex}, createdAt
```
Polls: single choice, tap again to undo. Votes are a map on the poll message; rules allow an update only if it touches `votes.<caller uid>` and nothing else. Each option shows voter avatars (MUI AvatarGroup, `people.ts` colors/initials).
Links: `components/Linkify.tsx` turns http(s):// and www. into links (trailing punctuation excluded).
Link previews (OG): sender calls Microlink (`linkPreview.ts`, free ~50/day, no key) after sending, then writes `link {url,title,description,image,site}` onto the message ONCE (rules: author only, link absent before). Receivers never call Microlink. Chosen because no Blaze = no Cloud Functions.
teamId = Firestore auto id (unguessable, this is the invite secret).

Channels: 5 built-ins with NO doc (ids general/brainstorming/tasks/resources/random kept from v1, shown as 💬 General · 💡 Ideas · ✅ To-do · 📎 Links & files · 🎉 Chill; no "#", operator wants it friendly, not Discord-like). `DEFAULT_CHANNELS` in api.ts must match the id list in firestore.rules `channelExists`. ANY member can create a channel (`channels/{id}` doc: name, emoji, createdBy, createdAt); only the admin can delete one (wipes its messages). Operator: the app should not be too security oriented.

Images: no billing on the project (Spark) so no Storage. Decision: compress on device (`app/src/image.ts`, max 1280px JPEG, <700KB) and store the data URL inside the message doc (rules cap 800KB, Firestore doc limit 1MiB). If Blaze is enabled later, swap `sendMessage` to upload to Storage and store a URL instead.

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
- Voice notes (short Opus clips could fit inline too; real fix is Blaze + Storage).
- Firestore TTL policy on `teams.expiresAt` (gcloud) so rooms self-destruct.

## Admin (team creator = `createdBy`)
- OPERATOR CORRECTION: the admin must ALWAYS be able to manage the team. Any new team-level feature needs an admin control, not just rules.
- Rename: `TeamDialog` (gear icon in header, admin only, or tap team name). Rules: admin may update only `name`.
- Remove vs Ban (operator chose option B): member row menu in `TeamDialog`. Remove = delete member doc, user sees "removed" + "Join again". Ban = batch write `banned/{uid}` + delete member, user sees "banned", rules block rejoin. Admin sees a "Banned" list with Unban (deletes banned doc). Admin cannot ban self. Ban is per team, keyed on anonymous uid, NOT IP (rules cannot see IP, and a hackathon shares one public IP).
- Limit: anonymous uid lives in browser storage; a kicked user clearing site data gets a new uid and could rejoin. Fine for a hackathon.
- Delete team (admin) / Leave team (member): buttons at the bottom of `TeamDialog`, both confirmed. OPERATOR: teams are temporary and deleting must wipe ALL data.
  `deleteTeam` (api.ts) runs in the admin's browser (no cascade in Firestore, no Functions on Spark): set `closed:true` (rules allow only this or `name`) -> all clients show "deleted" -> batch-delete messages in every channel + banned -> other members -> admin's own member doc -> team doc LAST (rules need isAdmin/isMember alive). Closed teams reject new joins.
  Room uses `selfExit` ref so our own leave/delete does not flash the "removed" screen.
  If the admin closes the tab mid-delete, leftovers remain under a closed team (invisible to users). Auto-expiry would need a scheduled Cloud Function (Blaze); a TTL policy alone would NOT delete subcollections.
- Unique names per team (operator rule): `teams/{t}/names/{nameKey}` {uid}, nameKey = 'n_' + lowercase trimmed name ('/' -> '_'). `joinTeam` batch-writes names doc + member doc (member has `nameKey`); rules pair them with getAfter both ways, and names `create` fails if the doc exists, so concurrent joins with the same name cannot both win. Join form shows "already taken" (NameTakenError). Remove/ban/leave/deleteTeam delete the names doc. Members who joined before this change have no names doc (their names are not reserved).
- Checklist channels (operator idea: To-do should not be a chat): channel `kind` 'chat' | 'todo'. Built-in `tasks` (✅ To-do) is 'todo'; New channel dialog has a Chat/Checklist toggle. Todo channels render `components/TodoBoard.tsx` instead of messages: add field at bottom, checkbox (doneBy), "I'll take it" (assignee), progress bar, Done section. Data: `teams/{t}/channels/{c}/todos/{id}` {text, createdBy, done, doneBy, assignee, createdAt}. Rules: any member adds and claims (assignee); ONLY THE ADMIN ticks done/doneBy (operator rule); creator or admin deletes. Members see a disabled checkbox + hint. deleteChannel/deleteTeam also wipe todos (`channelContentPaths`). Chose a widget over slash commands: slash is undiscoverable on mobile.
