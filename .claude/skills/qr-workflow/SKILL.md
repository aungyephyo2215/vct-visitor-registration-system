QR Workflow Skill

Purpose

Implement secure visitor QR workflow.

Walk-in Flow

Guard

↓

Register Visitor

↓

Generate QR

↓

Check-In

↓

Check-Out

Pre-register Flow

Resident

↓

Register Visitor

↓

Generate QR

↓

Guard Scan

↓

Check-In

↓

Check-Out

QR Security

* Secure random token
* Single use
* Replay protection
* Expire automatically
* Revoke support
* Never expose database ID

QR Status

* active
* used
* expired
* revoked

Check-In Validation

Validate:

* QR exists
* QR active
* QR not expired
* QR not used
* Visitor not blocked
* Property matches

After Success

* update checkin_time
* mark QR used
* create audit log

Check-Out Validation

Validate:

* visitor checked in
* not already checked out

After Success

* update checkout_time
* create audit log