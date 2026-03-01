# Ark’s Landscaping Internal Operations System — Chat Context Summary

This file captures the authoritative requirements derived from product planning discussions. This is the primary context reference for agents and engineers.

---

# Company Profile

Business name: Ark’s Landscaping  
Address: 1565 Britannia Rd E #38, Mississauga, ON L4W 2V6, Canada  
Primary phone: 416-495-6624  
Hours: Mon–Sun, 8:00 AM – 6:00 PM  
Timezone: America/Toronto  

Service areas include:
Mississauga, Toronto, Brampton, Halton Hills, Milton, Rexdale, Oakville, Erin Mills, Streetsville, Caledon, Etobicoke, Lorne Park, Port Credit, Erindale, Cooksville.

Service catalog (initial):
- Lawn care
- Interlocking
- Sod installation
- Property maintenance
- Cleanup
- Lawn cutting
- Concrete
- Power washing
- Fencing

System must support adding new services dynamically.

---

# Roles and Permissions

## Admin
Full system access. Can:
- finalize quotes and invoices
- manage users and permissions
- access all tenant data
- override workflows
- revoke magic links

## Office Staff
Can:
- create/edit jobs
- schedule/reschedule jobs
- send draft quotes and invoices
- communicate with customers
- create change orders
Cannot:
- finalize quotes or invoices

## Crew
Can:
- see only assigned jobs and related customers
- update ETA
- update visit status
- message customers
- upload attachments

Cannot:
- access unrelated jobs or customers
- finalize financial documents

## Customer
Can:
- access via magic link
- see all records tied to their email
- view jobs, visits, quotes, invoices, messages
- submit quote requests
- message staff

Cannot:
- modify financial records
- mark invoices paid

---

# Authentication

Customer authentication uses magic links only.

Magic link properties:
- reusable until expiration
- expiration time: 14 days
- stored hashed in database
- auto-login on click
- revocable by Admin

Staff authentication uses secure login.

---

# Job Scheduling

Jobs may contain multiple visits.

Visit properties:
- scheduled start time
- arrival window = start time + 1 hour
- ETA updates allowed
- per-visit status tracking

Allowed statuses:
- scheduled
- in_progress
- completed
- cancelled

System warns (but allows) scheduling outside business hours.

Crew cannot be double-booked except on same customer job.

---

# Messaging

Messaging exists fully in-app.

Requirements:
- threaded conversations
- realtime updates
- staff-to-customer messaging
- staff internal messaging optional later

No SMS integration for MVP.

---

# Quotes

Quotes consist of line items:
- description
- quantity
- price

Additional properties:
- HST tax only
- discounts allowed as line item
- attachments allowed
- customer approval requires typed name, checkbox, timestamp

Change orders:
- separate document
- require customer e-sign

Office can send draft quotes.
Only Admin can finalize.

---

# Invoices

Invoices:
- created from quotes or manually
- support deposits
- show deposit applied and balance due
- marked paid manually by Admin

Payment integrations deferred.

---

# File Uploads

Allowed file types:
- PDF
- JPG
- JPEG
- PNG
- HEIC

Maximum size:
25MB

Storage requirements:
- private storage
- signed access URLs
- signature validation

Malware scanning deferred.

Retention policy:
Delete attachments and references after 1 year.

---

# Notifications

MVP uses in-app notifications only.

Triggers include:
- draft sent requiring Admin finalization
- new message
- ETA update
- job assignment

---

# Accessibility

Target baseline:
WCAG 2.1 AA

---

# MVP Scope Exclusions

Deferred integrations:
- Postmark
- Twilio
- Stripe
- external email sending

All communications remain in-app.

---

# Architecture

Frontend:
Next.js App Router

Backend:
Supabase (Postgres, Auth, Realtime, Storage)

Deployment:
Vercel

---

# This document must remain synchronized with SPEC.md
