# SYSTEM SPECIFICATION — Ark’s Landscaping Operations Platform

This document is the canonical engineering specification.

If implementation conflicts with this spec, THIS SPEC TAKES PRIORITY.

---

# Core Entities

Tenant  
UserProfile  
Customer  
Job  
JobVisit  
JobAssignment  
Quote  
QuoteLineItem  
ChangeOrder  
Invoice  
InvoiceLineItem  
InvoicePayment  
MessageThread  
Message  
Attachment  
MagicLink  
Notification  
AuditLog  

---

# Authentication Spec

Customer authentication:

Magic link token properties:
- stored hashed
- reusable until expiry
- expires_at = created_at + 14 days
- auto-login
- revocable

Session stored securely via httpOnly cookies.

---

# Authorization Spec (RLS enforced)

Admin:
Full tenant access

Office:
Full tenant access except:
- cannot finalize quotes
- cannot finalize invoices

Crew:
Access limited to assigned jobs and related records

Customer:
Access limited to records linked to their email

---

# Scheduling Spec

Job contains multiple JobVisits.

Visit includes:
- scheduled_start
- arrival_window_start = scheduled_start
- arrival_window_end = scheduled_start + 1 hour

Visit statuses:
scheduled
in_progress
completed
cancelled

ETA updates allowed.

---

# Messaging Spec

Thread model:
MessageThread
Message

Realtime delivery using Supabase Realtime.

RLS enforced.

---

# Quotes Spec

Quote contains QuoteLineItems.

Properties:
- subtotal
- HST tax
- total

States:
draft
sent
finalized
accepted
rejected

Office cannot finalize.

---

# Invoice Spec

Invoice contains InvoiceLineItems.

States:
draft
sent
finalized
paid
overdue

Deposits supported.

Admin marks paid.

---

# Upload Spec

Storage:
Supabase Storage private bucket

Access:
Signed URLs only

Validation:
type validation
signature validation
size validation

Retention:
delete after 1 year

---

# Notification Spec

Notification stored in DB.

Realtime delivery.

---

# Health Endpoint Spec

GET /api/health

Returns:
