# Invite Code CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a portable `npm run gen-code` command that creates a unique six-digit MongoDB invite and make landlord registration consume that invite exactly once.

**Architecture:** A dedicated Mongoose `InviteCode` model owns invite lifecycle data. The CLI uses Node's standard `crypto` module and the existing MongoDB configuration, while the registration controller atomically claims a code before saving the landlord and releases it only if that save fails.

**Tech Stack:** Node.js CommonJS, Mongoose, MongoDB, dotenv, Express

---

## File Map

- Create `backend/src/models/InviteCode.js`: schema and database uniqueness contract.
- Create `backend/scripts/generateInviteCode.js`: portable CLI entry point.
- Modify `backend/src/controllers/authController.js`: replace reusable environment codes with atomic database consumption.
- Modify `backend/package.json`: expose `npm run gen-code`.
- No persistent test file is added because this repository intentionally excludes test artifacts; verification runs against the real CLI and registration endpoint.

### Task 1: Add the invite model and CLI

**Files:**
- Create: `backend/src/models/InviteCode.js`
- Create: `backend/scripts/generateInviteCode.js`
- Modify: `backend/package.json:6-10`

- [ ] **Step 1: Create the `InviteCode` model**

```js
const mongoose = require('mongoose');

const inviteCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        match: /^\d{6}$/,
    },
    isUsed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    usedAt: { type: Date },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
});

module.exports = mongoose.model('InviteCode', inviteCodeSchema);
```

- [ ] **Step 2: Create the CLI with collision retry and guaranteed disconnect**

```js
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('../src/configs/db');
const InviteCode = require('../src/models/InviteCode');

const color = process.stdout.isTTY
    ? { reset: '\x1b[0m', success: '\x1b[1;32m', code: '\x1b[1;33m', error: '\x1b[1;31m' }
    : { reset: '', success: '', code: '', error: '' };

async function createInviteCode() {
    await InviteCode.init();

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const code = String(crypto.randomInt(100000, 1000000));
        try {
            return await InviteCode.create({ code });
        } catch (error) {
            if (error?.code !== 11000) throw error;
        }
    }

    throw new Error('Không thể tạo mã mời duy nhất sau 10 lần thử.');
}

async function main() {
    await connectDB();
    try {
        const invite = await createInviteCode();
        const separator = '====================================================';
        console.log(`\n${color.success}${separator}`);
        console.log('🎉 ĐÃ TẠO THÀNH CÔNG MÃ MỜI ĐĂNG KÝ CHỦ TRỌ MỚI!');
        console.log(`${color.code}👉 MÃ MỜI: ${invite.code}${color.success} (Hạn dùng: 1 lần)`);
        console.log(`${separator}${color.reset}\n`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error(`${color.error}❌ Không thể tạo mã mời: ${error.message}${color.reset}`);
    process.exitCode = 1;
});
```

- [ ] **Step 3: Register the package command**

Set the backend scripts object to:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "gen-code": "node scripts/generateInviteCode.js"
}
```

- [ ] **Step 4: Verify parsing before database access**

Run:

```bash
node --check backend/src/models/InviteCode.js
node --check backend/scripts/generateInviteCode.js
node -e "JSON.parse(require('fs').readFileSync('backend/package.json', 'utf8')); console.log('package-json-ok')"
```

Expected: both syntax checks exit `0`, then `package-json-ok`.

- [ ] **Step 5: Commit the model and CLI**

```bash
git add backend/src/models/InviteCode.js backend/scripts/generateInviteCode.js backend/package.json
git commit -m "feat: add landlord invite code CLI"
```

### Task 2: Consume invite codes atomically during registration

**Files:**
- Modify: `backend/src/controllers/authController.js:1-120`

- [ ] **Step 1: Replace the static invite source with the model**

Add beside the `Account` import:

```js
const InviteCode = require('../models/InviteCode');
```

Delete `DEVELOPMENT_LANDLORD_INVITES` and the complete `getLandlordInviteCodes()` function.

- [ ] **Step 2: Track a claimed invite around the registration operation**

Start `register` with:

```js
exports.register = async (req, res) => {
    const role = Number(req.body?.role);
    const isLandlordRegistration = role === 1 && (typeof req.body?.propertyAddress === 'string' || typeof req.body?.inviteCode === 'string');
    let claimedInviteCode;
    let landlordAccount;
    let landlordAccountSaved = false;
    try {
```

- [ ] **Step 3: Validate, construct, and atomically claim before saving**

In the landlord branch, normalize the invite with the other fields:

```js
const cleanInviteCode = typeof inviteCode === 'string' ? inviteCode.trim() : '';
```

Replace the reusable-list validation and direct account save with:

```js
if (!/^\d{6}$/.test(cleanInviteCode)) {
    return res.status(403).json({ success: false, code: 'INVALID_LANDLORD_INVITE', message: 'Mã mời đăng ký Chủ trọ không hợp lệ.' });
}

const coordinates = normalizeCoordinates(propertyLatitude, propertyLongitude);
const existing = await Account.findOne({ $or: [{ phone: cleanPhone }, { email: cleanEmail }, { idCard: cleanIdCard }] });
if (existing) return res.status(400).json({ success: false, code: 'ACCOUNT_ALREADY_EXISTS', message: 'Số điện thoại, Email hoặc CCCD đã được đăng ký.' });

landlordAccount = new Account({
    username: cleanPhone,
    password: await bcrypt.hash(password, 10),
    fullName: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
    idCard: cleanIdCard,
    role: 1,
    status: 1,
    propertyAddress: cleanAddress,
    propertyLatitude: coordinates?.latitude,
    propertyLongitude: coordinates?.longitude,
});

claimedInviteCode = await InviteCode.findOneAndUpdate(
    { code: cleanInviteCode, isUsed: false },
    { $set: { isUsed: true, usedAt: new Date(), usedBy: landlordAccount._id } },
    { new: true }
);
if (!claimedInviteCode) {
    return res.status(403).json({ success: false, code: 'INVALID_LANDLORD_INVITE', message: 'Mã mời đăng ký Chủ trọ không hợp lệ.' });
}

const account = await landlordAccount.save();
landlordAccountSaved = true;
const token = jwt.sign({ id: account._id, role: account.role }, JWT_SECRET, { expiresIn: '30d' });
return res.status(201).json({ success: true, message: 'Đăng ký tài khoản Chủ trọ thành công!', token, user: serializeUser(account) });
```

- [ ] **Step 4: Release only a failed account's claim**

At the start of the existing catch block, add:

```js
if (claimedInviteCode && landlordAccount && !landlordAccountSaved) {
    try {
        await InviteCode.updateOne(
            { _id: claimedInviteCode._id, usedBy: landlordAccount._id },
            { $set: { isUsed: false }, $unset: { usedAt: 1, usedBy: 1 } }
        );
    } catch (rollbackError) {
        console.error('[INVITE_CODE_ROLLBACK]', rollbackError.message);
    }
}
```

- [ ] **Step 5: Verify controller syntax and removal of static codes**

Run:

```bash
node --check backend/src/controllers/authController.js
rg -n "LANDLORD_INVITE_CODES|DEVELOPMENT_LANDLORD_INVITES|getLandlordInviteCodes" backend/src backend/.env.example
```

Expected: syntax exits `0`; `rg` returns no matches.

- [ ] **Step 6: Commit registration integration**

```bash
git add backend/src/controllers/authController.js
git commit -m "feat: consume landlord invite codes once"
```

### Task 3: Verify the real CLI and registration flow

**Files:**
- No repository files changed.

- [ ] **Step 1: Generate an invite against configured MongoDB**

From `backend/`, run:

```bash
INVITE_OUTPUT=$(npm run --silent gen-code)
printf '%s\n' "$INVITE_OUTPUT"
INVITE_CODE=$(printf '%s\n' "$INVITE_OUTPUT" | sed -nE 's/.*MÃ MỜI: ([0-9]{6}).*/\1/p')
test "${#INVITE_CODE}" -eq 6
```

Expected: exit `0`, a highlighted six-digit code, and `(Hạn dùng: 1 lần)`.

- [ ] **Step 2: Start the backend with the same environment**

From `backend/`, run:

```bash
npm start
```

Expected: MongoDB connects and the API listens on the configured `PORT`.

- [ ] **Step 3: Register a unique landlord**

Send `POST /api/auth/register` with unique identity fields and the generated invite code:

```bash
STAMP=$(date +%s)
PHONE="09${STAMP: -8}"
ID_CARD="079${STAMP: -9}"
HTTP_CODE=$(curl -sS -o /private/tmp/trohub-invite-register.json -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"TroHub Invite Verification\",\"phone\":\"$PHONE\",\"email\":\"invite-$STAMP@trohub.local\",\"idCard\":\"$ID_CARD\",\"password\":\"TroHub@2026\",\"role\":1,\"propertyAddress\":\"TroHub CLI Verification\",\"inviteCode\":\"$INVITE_CODE\"}" \
  http://127.0.0.1:5000/api/auth/register)
test "$HTTP_CODE" = 201
node -e "const r=require('/private/tmp/trohub-invite-register.json'); if(!r.success||r.user?.role!==1) process.exit(1); console.log('landlord-registration-ok')"
```

Expected: `landlord-registration-ok`.

- [ ] **Step 4: Prove the same code cannot be reused**

Repeat the request with different identity fields and the same invite:

```bash
REUSE_HTTP_CODE=$(curl -sS -o /private/tmp/trohub-invite-reuse.json -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"TroHub Invite Reuse Verification\",\"phone\":\"08${STAMP: -8}\",\"email\":\"invite-reuse-$STAMP@trohub.local\",\"idCard\":\"078${STAMP: -9}\",\"password\":\"TroHub@2026\",\"role\":1,\"propertyAddress\":\"TroHub CLI Verification\",\"inviteCode\":\"$INVITE_CODE\"}" \
  http://127.0.0.1:5000/api/auth/register)
test "$REUSE_HTTP_CODE" = 403
node -e "const r=require('/private/tmp/trohub-invite-reuse.json'); if(r.code!=='INVALID_LANDLORD_INVITE') process.exit(1); console.log('invite-reuse-blocked-ok')"
```

Expected: HTTP `403` with `code: "INVALID_LANDLORD_INVITE"`.

- [ ] **Step 5: Confirm the persisted lifecycle record**

Query the generated code through Mongoose and assert all required state:

```bash
node -e "require('dotenv').config(); const mongoose=require('mongoose'); const connectDB=require('./src/configs/db'); const InviteCode=require('./src/models/InviteCode'); (async()=>{await connectDB(); const item=await InviteCode.findOne({code:process.argv[1]}).lean(); if(!item?.isUsed||!item?.usedBy) throw new Error('invite-not-consumed'); console.log('invite-consumed-ok'); await mongoose.disconnect();})().catch(async e=>{console.error(e.message); await mongoose.disconnect(); process.exitCode=1;});" "$INVITE_CODE"
```

Expected: `invite-consumed-ok`.

### Task 4: Run production verification and finish

**Files:**
- No repository files changed unless verification exposes a defect.

- [ ] **Step 1: Verify all tracked backend JavaScript**

```bash
git ls-files -z 'backend/**/*.js' | xargs -0 -n1 node --check
```

Expected: exit `0` with no output.

- [ ] **Step 2: Verify Mobile and WebAdmin**

```bash
npx tsc --noEmit
npm run lint
cd webadmin && npm run lint
cd webadmin && npm run build
```

Expected: every command exits `0`; existing non-blocking lint warnings may remain.

- [ ] **Step 3: Inspect the final diff and repository state**

```bash
git diff --check
git status --short --branch
git log -3 --oneline
```

Expected: no whitespace error, no uncommitted implementation change, and the invite-code commits at the top of the feature branch.

- [ ] **Step 4: Provide the usage handoff**

Report these portable steps:

```bash
cd TroHub_Local/backend
cp .env.example .env
npm install
npm run gen-code
```

Explain that `.env` must contain a reachable `MONGODB_URI` (and optional `MONGODB_DATABASE`), each run creates one six-digit one-time landlord code, and the code is entered in the landlord registration form.
