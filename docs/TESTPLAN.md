# TEST PLAN — Ark’s Landscaping Platform

---

# Golden Flow Tests

## Test 1: Admin Login
Admin can access dashboard.

## Test 2: Office Create Job
Office creates job successfully.

## Test 3: Crew Access Restriction
Crew cannot access unassigned job.

## Test 4: Customer Magic Link Login
Customer receives reusable magic link and logs in.

## Test 5: Magic Link Reuse
Magic link remains valid until expiration.

## Test 6: Messaging
Customer and staff exchange messages realtime.

## Test 7: Draft Quote Workflow
Office sends draft quote.
Customer sees draft.
Admin finalizes.

## Test 8: Upload Validation
Reject invalid file types.
Accept valid file types.

## Test 9: Retention Cleanup
Expired attachments removed.

## Test 10: RLS Isolation
Users cannot access unauthorized data.

---

# Negative Tests

Unauthorized access attempts must fail.

---

# CI Tests

npm run build must succeed  
npm run test must succeed  

---

# Pass Criteria

All golden flows pass  
All permission isolation enforced  
CI green
