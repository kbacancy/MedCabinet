# HIPAA Compliance Status — MedCabinet

## Current Status: In Progress

MedCabinet stores Protected Health Information (PHI) and is working toward full HIPAA compliance.
This document tracks what is implemented, what is pending, and required external actions.

---

## Implemented

| Safeguard | Implementation | File |
|---|---|---|
| Row Level Security | All PHI tables have RLS with `auth.uid()` scoped policies | `supabase/migrations.sql` |
| Caregiver access scoping | Caregivers can only read explicitly linked family member data | `supabase/migrations.sql:180-194` |
| Generic push notifications | No PHI (medicine names, dosages) in notification payloads | `lib/notifications.ts` |
| Session inactivity timeout | Auto-logout after 15 minutes of inactivity | `app/_layout.tsx` |
| Background app logout | Session timer paused/reset on app state change | `app/_layout.tsx` |
| Audit logging (client) | LOGIN, LOGOUT, SESSION_TIMEOUT events logged to `audit_logs` | `lib/audit.ts` |
| Audit log table | Append-only, RLS-protected, indexed by user + time | `supabase/audit_logs.sql` |
| No PHI in console logs | Zero console.log calls in app source code | Verified by grep |

---

## Pending — Required Before Launch

### 1. Sign Supabase Business Associate Agreement (BAA)
- Supabase supports HIPAA on paid plans
- Sign BAA at: https://supabase.com/hipaa
- Without this, storing PHI in Supabase is a HIPAA violation regardless of technical controls

### 2. Expand Audit Logging to All PHI Access
- Call `logAuditEvent()` from `lib/audit.ts` when reading/writing:
  - `medicines` (READ on list/detail screens)
  - `medical_id` (READ/UPDATE)
  - `dose_logs` (CREATE)
  - `symptom_logs` (CREATE/READ)
  - `caregiver_links` (CAREGIVER_ACCESS events)

### 3. Add Multi-Factor Authentication (MFA)
- Supabase supports TOTP-based MFA
- Required for HIPAA: "unique user identification" + "automatic logoff"

### 4. Password Complexity Enforcement
- Enforce minimum 8 chars, 1 uppercase, 1 number in `app/(auth)/signup.tsx`

### 5. Caregiver Invite Expiry
- Add `expires_at` column to `caregiver_links` (recommend 7-day expiry)
- Reject invites past expiry in `accept_caregiver_invite` RPC

---

## PHI Stored in This Application

| Data | Table | Sensitivity |
|---|---|---|
| Medicine names, dosages, quantities | `medicines` | High |
| Dose timestamps | `dose_logs` | Medium |
| Blood type, allergies, emergency contacts | `medical_id` | High |
| Doctor/pharmacist phone, address | `contacts` | Medium |
| Family member names, date of birth | `family_members` | Medium |
| Daily health ratings, notes | `symptom_logs` | Medium |

---

## Third-Party Subprocessors

| Service | Purpose | BAA Available |
|---|---|---|
| Supabase | Database & Auth | Yes — must be signed |
| Groq AI | Drug interaction checking | Verify before launch |
| Expo (EAS) | Build & push notifications | Review Expo's HIPAA stance |

---

## References
- HIPAA Security Rule: 45 CFR Part 164
- Supabase HIPAA Guide: https://supabase.com/docs/guides/platform/hipaa
