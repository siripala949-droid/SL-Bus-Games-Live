# Security Specification — Sri Lanka Bus Gaming Live

## 1. Data Invariants
1. **Channel Profile Ownership (`/channels/{channelId}`)**:
   - A channel profile's `channelId` path variable and `ownerId` field must strictly match `request.auth.uid`.
   - Only a signed-in user with `request.auth.token.email_verified == true` can create or update their own channel profile.
   - `ownerId` and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
   - Zero PII (no email, phone, or physical address) is stored in `/channels/{channelId}`.
2. **Stream Broadcasts (`/streams/{streamId}`)**:
   - Public streams (`resource.data.isPublic == true`) can be read and listed by viewers, while private drafts can only be read by their `creatorId`.
   - Creating a stream requires a verified signed-in user where `incoming().creatorId == request.auth.uid`, valid 11-char `videoId`, valid `status` in `['LIVE', 'UPCOMING', 'PAST']`, and `createdAt == request.time`.
   - Updating a stream's broadcast metadata (`status`, `title`, `description`, `scheduledFor`, `viewerCount`, `totalViews`, `endedAt`, `isPublic`, `updatedAt`) is restricted to the stream's owner (`existing().creatorId == request.auth.uid`) or verified auto-sync/gift actions.
   - Immutable fields (`videoId`, `creatorId`, `createdAt`) cannot be altered on update.
3. **Stream Chat Messages (`/streams/{streamId}/messages/{messageId}`)**:
   - Messages can only be created under an existing parent `/streams/{streamId}` document (`exists(/databases/$(database)/documents/streams/$(streamId))`).
   - `senderId` must equal `request.auth.uid` and `streamId` must equal the path `{streamId}`.
   - Messages are immutable once posted (`allow update, delete: if false`).

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoofing on Channel Create**: Authenticated user `uid_A` attempts to create `/channels/uid_B` with `ownerId: "uid_B"`. -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: User with `email_verified: false` attempts to create a stream in `/streams/stream_1`. -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Stream Create**: Payload includes `isAdmin: true` or `featured: true` not in `hasOnly()` allowlist. -> `PERMISSION_DENIED`.
4. **Oversized String DoS**: Payload sets `description` to a 10,000-character string (exceeding `maxLength: 3000`). -> `PERMISSION_DENIED`.
5. **Invalid Status Enum**: Payload sets `status: "HACKED"` instead of `['LIVE', 'UPCOMING', 'PAST']`. -> `PERMISSION_DENIED`.
6. **Foreign Stream Takeover Update**: User `uid_B` attempts to change `title` or `status` of a stream owned by `uid_A`. -> `PERMISSION_DENIED`.
7. **Immutable Field Mutation**: Owner `uid_A` attempts to mutate `creatorId` or `createdAt` during an update on `/streams/stream_1`. -> `PERMISSION_DENIED`.
8. **Forged Client Timestamp**: Payload supplies a past or future `createdAt` timestamp not equal to `request.time`. -> `PERMISSION_DENIED`.
9. **Invalid Path ID Poisoning**: Attempting to create a document with an invalid ID containing spaces or special characters. -> `PERMISSION_DENIED`.
10. **Orphaned Subcollection Write**: Attempting to create `/streams/non_existent_stream/messages/msg_1` when parent stream does not exist. -> `PERMISSION_DENIED`.
11. **Chat Message Spoofing**: User `uid_A` attempts to post a chat message with `senderId: "uid_B"`. -> `PERMISSION_DENIED`.
12. **Unfiltered Private Stream List**: Querying `/streams` without filtering `isPublic == true` or `creatorId == request.auth.uid`. -> `PERMISSION_DENIED`.
