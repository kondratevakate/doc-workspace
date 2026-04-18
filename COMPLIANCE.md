# Compliance Reference — HIPAA · GDPR · DHA

> **This document is a mandatory gate for every PR that touches patient data.**
> Applicable regulations: HIPAA (US), GDPR (EU), DHA — Dubai Health Authority (UAE).

---

## Data Classification

| Class | Examples | Storage rule |
|---|---|---|
| **PHI** (Protected Health Information) | Transcript, diagnosis, treatment, audio | Encrypted at rest, signed URLs, TTL |
| **PII** (Personally Identifiable Information) | Full name, phone, email, DOB, address | Do not store. Use pseudonym + age band |
| **De-identified** | caseToken, ageBand, conditionKey | Safe to store, index, display |
| **Operational** | physician_id, session token, timestamps | Standard protection |

**Current model deliberately avoids PII:**
- `caseToken` — opaque pseudonym, never the patient's real name
- `ageBand` — cohort bucket (20–29, 30–39…), not exact date of birth
- No phone, email, or address fields in the schema

---

## Mandatory Pre-PR Checklist

Run this before merging any change that reads, writes, or displays patient data:

```
[ ] No direct identifiers in new fields (name, phone, email, address, DOB)
[ ] Logs contain only IDs — no field values that could be PHI
[ ] Every API SELECT filters by physician_id — cross-physician access is structurally impossible
[ ] New endpoint enforces requirePhysicianAuth()
[ ] No PHI appears in URL query params (use opaque IDs)
[ ] Audio URLs are signed with TTL — not permanent public links
[ ] New data fields have a defined retention policy
[ ] localStorage holds only demo fixtures or fully de-identified data
[ ] AI provider processing audio has a signed BAA (see critical issues below)
```

---

## Three Questions Before Adding Any Field

> 1. Is this field required for a **clinical decision**? (not "might be useful")
> 2. **How long** does it need to be retained? What is the deletion trigger?
> 3. **Who** is authorized to read it — and is that enforced at the DB query level?

No answer → field is not added.

---

## HIPAA

| Safeguard | Requirement | Implementation status |
|---|---|---|
| Access Control | Role-based, minimum necessary | ✅ physician_id filter on all queries |
| Audit Controls | Log every read/write of PHI | ⚠️ audit_log table not yet created |
| Transmission Security | TLS for all PHI in transit | ✅ HTTPS enforced |
| Encryption at Rest | PHI fields encrypted in DB | ❌ transcript stored plaintext in SQLite |
| Minimum Necessary | Collect only what care requires | ✅ caseToken, ageBand pattern |
| Breach Notification | Notify HHS within 60 days | ❌ no procedure defined |
| Business Associate Agreement | Required for any vendor processing PHI | ❌ Google Gemini / OpenAI — no BAA |

---

## GDPR

| Article | Requirement | Implementation status |
|---|---|---|
| Art. 5 | Data minimization | ✅ by design — no PII fields |
| Art. 6/9 | Lawful basis — medical necessity (Art. 9(2)(h)) | ⚠️ must be documented per deployment |
| Art. 17 | Right to erasure | ❌ DELETE /cases/:id endpoint missing |
| Art. 20 | Data portability | ⚠️ admin export exists, patient-facing export missing |
| Art. 25 | Privacy by design and by default | ✅ pseudonymization built into model |
| Art. 32 | Encryption at rest + in transit | ❌ SQLite plaintext |
| Art. 33 | Breach notification within 72 hours | ❌ no procedure defined |
| Art. 44 | Data residency — EU data stays in EU | ⚠️ depends on deployment region |

---

## DHA — Dubai Health Authority

| Requirement | Implementation status |
|---|---|
| Data localisation — patient data of UAE residents must reside on UAE infrastructure | ⚠️ AWS `me-central-1` required if deploying in UAE |
| Patient consent for electronic health record storage | ⚠️ physician responsibility; no in-app consent flow |
| Audit trail — all record modifications logged with timestamp and actor | ❌ audit_log missing |
| Access segregation — physician sees only own patients | ✅ enforced at query level |
| Breach notification to DHA within 72 hours | ❌ no procedure defined |

---

## Open Compliance Issues (prioritised)

| Issue | Regulation | Severity | Target sprint |
|---|---|---|---|
| Google Gemini / OpenAI process audio — no BAA signed | HIPAA | 🔴 Critical | Sprint 8 |
| Transcript stored plaintext in SQLite | HIPAA / GDPR | 🔴 High | Sprint 8 |
| No `audit_log` table | HIPAA / DHA | 🟡 Medium | Sprint 8 |
| Audio served via permanent URL, not signed TTL | HIPAA | 🟡 Medium | Sprint 8 |
| No `DELETE /cases/:id` endpoint | GDPR Art. 17 | 🟡 Medium | Sprint 8 |
| PHI could reach application logs via transcript | HIPAA / GDPR | 🟡 Medium | Sprint 8 |
| No retention policy on case data | GDPR Art. 5 | 🟢 Low | Backlog |
| No breach notification procedure | HIPAA / GDPR / DHA | 🟢 Low | Backlog |

---

## Architectural Decisions Driven by Compliance

| Decision | Rationale |
|---|---|
| `caseToken` as patient pseudonym | HIPAA minimum necessary + GDPR pseudonymization |
| `ageBand` instead of exact DOB | Removes a direct identifier from all queries and displays |
| No phone / email fields in schema | PII not collected = PII cannot be breached |
| Audio TTL 1 year + `audio_expires_at` | GDPR data minimization, HIPAA retention limits |
| `physician_id` filter on every SELECT | Structural isolation — misconfigured route cannot leak cross-physician data |
| Demo mode = localStorage only | Demo fixtures never reach the backend or any network |
| Signed S3 URLs (target) | Audio accessible only to authenticated session, not permanently indexed |

---

## AI Provider Risk

Any vendor that processes patient audio or transcript is a **Business Associate** under HIPAA and requires a signed BAA before production use.

| Provider | BAA available | Notes |
|---|---|---|
| Google Gemini | ✅ Yes (Google Cloud Healthcare API tier) | Must use the Healthcare-compliant endpoint, not consumer API |
| OpenAI | ✅ Yes (Enterprise / API with BAA) | Requires Enterprise agreement |
| Whisper (local) | N/A — self-hosted | No PHI leaves the server; preferred for strictest compliance |

**Recommendation:** for production, either obtain BAA agreements before go-live, or run Whisper locally and use AI providers only for non-PHI tasks.
