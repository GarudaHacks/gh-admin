# Check-In

Check-in can only be performed by and admin.
The purpose of check-in is to validate the hacker's detail
and give a convenient way for committee to give freebies, stickers, etc.

A check-in adds fields:
- `checkedInAt` (ISO String): For easy verification for the response returned by backend.
- `checkedInAtServer`: As firestore timestamp.
- `checkedInBy`: Which admin scans it.
- `checkedInByEmail`: Human-readable admin who scans it.

### Already Check-In

Idempotent result by Check by field `checkedInAt`.