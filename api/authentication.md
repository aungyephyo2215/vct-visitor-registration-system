# Authentication & Authorization

## Authentication Method

- JWT Access Token
- Refresh Token
- Password Hash: bcrypt
- Session Timeout: 24 Hours

---

## User Roles

### Super Admin

Permissions:

- Manage Properties
- Manage Users
- View All Reports
- System Settings

---

### Property Admin

Permissions:

- Manage Residents
- Manage Visitors
- View Reports
- Manage Security Guards

---

### Security Guard

Permissions:

- Scan QR
- Check In Visitor
- Check Out Visitor
- View Today's Visitors

---

### Resident

Permissions:

- Invite Visitor
- View Visitor History
- Cancel Invitation

---

## Login Flow

User

↓

POST /api/auth/login

↓

Validate Email & Password

↓

Generate JWT

↓

Return Access Token

↓

Frontend Store Token

↓

Authenticated APIs

---

## Password Policy

Minimum 8 characters

Require:

- Uppercase
- Lowercase
- Number
- Special Character

---

## Account Lock

5 Failed Attempts

↓

Lock Account

↓

5 Minutes
