# Pages

## Login

Fields

- Email
- Password

Buttons

- Login

---

## Dashboard

Widgets

- Today's Visitors
- Checked In
- Checked Out
- Pending Visitors
- Recent Activities

---

## Visitors

Table

- Photo
- Name
- Phone
- Host
- Status

Actions

- View
- Edit
- Delete

---

## Create Visitor

Fields

- Name
- Phone
- ID Type (NRC, Passport, Driving License, Company ID, Other)
- ID Number
- Photo

Buttons

- Save
- Cancel

---

## Visitor Detail

Show

- Visitor Information
- Visit History
- QR Status

---

## Visits

Table

- Visitor Name
- Host
- Unit
- Purpose
- Status
- Check-In Time
- Check-Out Time

Actions

- View
- Generate QR
- Check Out

---

## Visit Detail

Show

- Visit Information (visitor, host, unit, purpose)
- QR Code Status
- Verification Status
- Vehicle Information
- Timeline (created, expected, checked-in, checked-out)

---

## Invitations

Table

- Visitor Name
- Invited By
- Unit
- Expected Date
- Status (Pending, Approved, Rejected, Expired)

Actions

- View
- Approve / Reject
- Generate QR
- Resend QR Email

---

## Invitation Detail

Show

- Invitation Information (visitor details, type, expected date)
- Approval History
- QR Code Status
- QR Email Delivery Status
- Badge Status

Actions

- Approve / Reject (for admins)
- Generate QR
- Resend QR Email
- Print Badge

---

## Security Scan (QR Camera Scanner)

Functions

- Camera QR Code Scanning
- Manual Token Entry (fallback)
- Token Resolution (QR token or email access token)
- Visit Info Display (after scan)

Layout

- Camera View (top)
- Manual Entry Input (below camera)
- Gate Visitor Summary (after successful scan)

---

## Security Verify

Functions

- Visitor Verification Form
  - Photo Capture
  - Vehicle Number
  - NDA Signed (checkbox)
  - Safety Form Signed (checkbox)
  - Visitor Attachment (link existing visitor)
- Verification Summary
- Check-In / Check-Out Actions

---

## Vehicles

Table

- Plate Number
- Vehicle Type
- Brand
- Color
- Owner (Resident name or Visitor name)
- Status

Actions

- View
- Edit
- Delete

Filters

- Search by plate number
- Filter by owner type (Resident / Visitor)
- Filter by status (Active / Blocked)

---

## Vehicle Detail

Show

- Vehicle Information (plate, type, brand, color)
- Owner Information (resident or visitor)
- Visit History (linked visits)

---

## Create Vehicle

Fields

- Plate Number
- Vehicle Type (dropdown)
- Brand (optional)
- Color (optional)
- Owner Type (Resident / Visitor)
- Owner (dropdown - filtered by owner type)

Buttons

- Save
- Cancel

---

## QR Access (Public)

Visitor-facing page accessed from email QR links.

Show

- Visit Information (date, host, property)
- QR Code Image
- Property Address

Notes

- No authentication required
- Access token validated server-side
- Does not expose raw QR token

---

## History

Table

- Visitor
- Host
- Check In
- Check Out

---

## Reports

Charts

- Daily Visitors
- Weekly Visitors
- Monthly Visitors
- Peak Hours

---

## Settings

- Users
- Roles
- Profile
