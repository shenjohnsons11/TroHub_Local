# Invite Code CLI Design

## Goal

Add a portable `npm run gen-code` command under `backend/` that creates a unique six-digit, one-time landlord registration code in MongoDB. Replace the current environment-based reusable code list with database-backed validation.

## Current State

- Landlord registration accepts codes from `LANDLORD_INVITE_CODES` or a development fallback list.
- Codes are reusable and have no usage record.
- The backend already uses CommonJS, `dotenv`, Mongoose, and a shared MongoDB connection helper.

## Architecture

### InviteCode model

Create `backend/src/models/InviteCode.js` with:

- `code`: required six-digit string with a unique index.
- `isUsed`: boolean, default `false`.
- `createdAt`: date, default current time.
- `usedAt`: optional date.
- `usedBy`: optional `Account` reference.

The dedicated collection keeps invitation lifecycle data separate from accounts and lets MongoDB enforce uniqueness.

### CLI command

Create `backend/scripts/generateInviteCode.js` and register it as:

```json
"gen-code": "node scripts/generateInviteCode.js"
```

The script will:

1. Resolve and load `backend/.env` independently of the caller's current directory.
2. Connect using the existing MongoDB helper.
3. Generate a value from `100000` through `999999` with Node's `crypto.randomInt`.
4. Save it through `InviteCode`, retrying only on a duplicate-key collision.
5. Print a restrained ANSI-colored success banner or a clear error.
6. Disconnect Mongoose in `finally` and return a non-zero exit status on failure.

No new dependency is required.

### Registration flow

Remove the environment and development invite-code lists. For landlord registration:

1. Validate account fields and the six-digit code format.
2. Reject an existing phone, email, or identity number before consuming a code.
3. Construct the new `Account` to obtain its MongoDB identifier.
4. Atomically claim one unused code with `findOneAndUpdate`, setting `isUsed`, `usedAt`, and `usedBy`.
5. Save the account and return the existing registration response.
6. If account persistence fails, release only the code claimed by that account identifier.

This prevents two concurrent requests from using the same code. A used, missing, or malformed code returns the existing `INVALID_LANDLORD_INVITE` response without revealing its state.

## Verification

- Parse all changed JavaScript and package manifests.
- Run `npm run gen-code` from `backend/` and confirm a six-digit record is created.
- Register one unique landlord through `POST /api/auth/register` with that code and confirm HTTP 201.
- Submit a second unique landlord registration with the same code and confirm HTTP 403.
- Confirm MongoDB records `isUsed: true` and the successful account in `usedBy`.
- Run the existing production typecheck, lint, and WebAdmin build checks; no test files will be added.

## Usage Contract

On any machine with Node.js, installed backend dependencies, a reachable MongoDB instance, and `backend/.env` configured:

```bash
cd backend
npm install
npm run gen-code
```

Each invocation creates exactly one new one-time code.
