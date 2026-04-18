# Physician Workspace — Product Roadmap

> Version: April 2026. Author: Kate.
> **All documentation in English. All architectural decisions at senior security-architect level.**

---

## Performance Targets

> Performance is a hard constraint. Every PR is rejected if it regresses these numbers.

| Metric | Target | Tool |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.0 s on 3G | Lighthouse / WebPageTest |
| INP (Interaction to Next Paint) | < 150 ms | Chrome DevTools |
| CLS (Cumulative Layout Shift) | < 0.05 | Lighthouse |
| JS bundle — initial load | < 200 KB gzipped | `npm run analyze` |
| API response — GET /cases/today | < 100 ms (p95) | `X-Response-Time` header |
| API response — POST /voice-drafts/commit | < 300 ms (p95, excl. AI) | `X-Response-Time` header |
| SQLite query | < 200 ms → `SLOW_QUERY` warn in logs | slow-query wrapper |
| Audio upload — 2 min voice | < 5 s on 10 Mbps | progress bar |

**How to measure:**
```bash
# Bundle size
npm run analyze          # opens .next/analyze/client.html

# API latency — visible in every response header
curl -I http://localhost:8080/cases/today   # X-Response-Time: 43ms

# Slow queries — appear in backend stdout as WARN slow_query {ms, sql}
```

---

## Compliance Foundation

> **Before every PR that touches patient data** → open [COMPLIANCE.md](COMPLIANCE.md) and run the checklist.
> Applicable regulations: HIPAA (US) · GDPR (EU) · DHA — Dubai Health Authority (UAE).
>
> **Never store without legal basis:** patient name, phone, email, date of birth, address.
> Use instead: `caseToken` (pseudonym), `ageBand` (cohort bucket), de-identified identifiers only.

---

## Five Principal Risks — Ordered by Severity

### 1. Data Loss → Irreversible Trust Failure

**Threat vectors:** browser close mid-commit, network drop during audio upload, server crash between upload and processing, accidental navigation.

**Defence-in-depth response:**

```
Layer 1 — Browser (offline-capable)
  Every T9 field and transcript fragment → localStorage immediately
  On /capture load: detect uncommitted draft → offer restore
  Draft survives until explicit deletion — no expiry

Layer 2 — Network
  Audio: chunked upload with resume — partial upload is never lost
  voice_jobs: status "received" written immediately on server arrival
  File exists even if processing queue has not started

Layer 3 — UI contract
  Commit button: disabled during send + "Saving…" label
  Post-commit: explicit confirmation screen "Visit saved ✓"
  Every state has a label: pending / saved / failed — never silent
```

**Control metric:** `draft_loss_rate = uncommitted_drafts_older_24h / total_drafts` → target < 1%

---

### 2. Data Breach → Project Termination

**Data isolation:**
- Every `case` bound to `physician_id` — all SELECTs structurally filter by owner
- Audio served via signed S3 URLs (TTL 15 min) — no permanent public links
- Demo mode: localStorage only, zero network calls; forbidden in `APP_ENV=production`

**Session security:**
- Cookie: `HttpOnly` + `SameSite=Strict` + `Secure` (HTTPS only)
- Magic link: single-use, TTL 20 min, stored as hash — never as plaintext
- Rate limit: 5 `/auth/request-magic-link` attempts per hour per email

**Logging discipline:**
- Logs contain only: `physician_id`, `action`, `case_id`, `timestamp`
- Transcripts and patient identifiers must never appear in stdout or log files
- `audit_log` table: records every mutation with actor and timestamp

**Retention:**
- Audio: `audio_expires_at` = 1 year + scheduled deletion job
- Case data retention policy: open question — define before production

---

### 3. Silent Recording Failure → Physician Repeats the Entire Visit

**Before recording starts:**
- Request `getUserMedia()` — do not render the record button until permission is granted
- Detect browser capability — display explicit warning for Safari/Firefox before the attempt

**During recording — multiple simultaneous signals (peripheral vision coverage):**
```
1. Pulsing red indicator         ← detectable in peripheral vision
2. Elapsed timer "Recording: 00:43"
3. Volume level bar (AudioAnalyser API)
   → flat for 10 s → "Microphone not picking up audio"
4. Word count in live transcript  ← confirms the system is hearing
   → 0 words for 10 s → warning overlay
```

**After stopping:**
- Display file size: "Captured 2.3 MB" — physician confirms something was recorded
- If < 5 KB → "Recording appears empty — check microphone"

**During upload:**
- Progress bar with percentage — not a spinner alone
- 30 s timeout → "Upload failed — retry?" + Retry button
- Retry re-sends the same audio blob — no re-recording required

**If backend transcription fails:**
- Do not hide the failure: "Auto-transcription failed"
- Show audio player: physician listens and manually fills key fields
- Saved as a manual draft — data is not lost

---

### 4. Alert Fatigue → Physician Stops Reading the Screen

**Principle: 3 prioritised actions per day, not 15.**

**Priority scoring algorithm (deterministic, no ML):**
```
score = (overdue_days × 3) + (non_responder × 2) + (unread_draft × 1)
Display top 3 with explicit reason: "Non-responder for 3 months + 5 days overdue"
Remaining cases hidden behind "Show N more"
```

**Re-display rules:**
- Physician opened the case card today → removed from top 3
- Physician selected "Remind later" → disappears until specified date
- Maximum 1 alert per case per day

---

### 5. Chaos Without System → No Long-Term Learning, No Network Growth

**Deferred.** Systematic decision-support features (pattern recognition, referral tracking, cohort trajectory) are intentionally excluded from the current roadmap. The system's job right now is to be fast, stable, and trustworthy. Decision-support is a later layer built on top of reliable data capture.

---

## Roles and Access Control

| Role | Permitted | Denied |
|---|---|---|
| **physician** | Own patients, voice recording, commit, pings, tasks | Other physicians' patients, pack configuration |
| **admin** | Create physicians, export data, manage packs | Audio content (metadata only) |
| **viewer** *(future)* | Read-only cohort view for department head | Any write operation |

Sessions: magic link → session cookie (12 h) → auto-logout. Refresh token in backlog.

---

## Data Storage Architecture

```
SQLite (WAL mode)
  physicians, auth_*         users and sessions
  cases, case_updates        patient records + each visit
  follow_up_tasks            tasks / pings with dueAt and completed_at
  voice_jobs, voice_results  audio processing queue
  audit_log                  all mutations with actor + timestamp (to add)

Object Store (S3 / ./data/objects/)
  audio/{date}/{id}          visit audio files (TTL 1 year)

localStorage (browser)
  draft_recovery             uncommitted draft for crash recovery
  demo state                 demo fixtures — never leave the browser
```

---

## Process Mining & Habit Design

### Research basis

**BJ Fogg B=MAP model** (Tiny Habits, 2020): behaviour happens when Motivation + Ability + Prompt align at the same moment.
- Anchor voice capture to the natural end of a visit — highest motivation point
- Keep the action tiny: 10-second clip is enough to start, not a full summary
- Celebrate completion — positive feeling after action drives neurological habit loop, guilt does not

**Nir Eyal Hook Model** (Hooked, 2014): Trigger → Action (low friction) → Variable reward → Investment.
- Investment: each completed visit increases the physician's data asset — this is the reward

**Streak design psychology** (Smashing Magazine, 2026; healthcare gamification meta-analysis, Sage Journals 2023):
- Streaks days 1–7: pride. Days 8–30: loss aversion. Days 31+: anxiety monument.
- **Do not use cumulative streaks.** Use weekly reset cycles instead.
- Show effort accomplished, not deficit: "12 visits recorded this week" not "3 visits missing"
- Never: "You missed your daily goal", leaderboards, point systems unrelated to care quality

**Healthcare gamification research** (PMC NHS, 2024): 59% positive, 41% mixed/negative outcomes.
Works: immediate feedback, mastery badges, role-appropriate goals.
Backfires: competition, opaque scoring, burden added without time saved.

### Event schema (frontend → product_events table)

Two event categories only (recording + pings):

```
recording_started   { conditionKey, source: 'voice'|'t9' }
recording_stopped   { durationSec }
audio_uploaded      { fileSizeMb, uploadMs }
transcript_received { wordCount, processingMs }
visit_committed     { caseId, isNewCase, conditionKey }

ping_viewed         { taskId, caseId, overdueDays }
ping_called         { taskId, caseId }
ping_rescheduled    { taskId, newDate }
ping_dismissed      { taskId }
```

All events carry: `physician_id`, `event_type`, `ts`, `session_id` (anonymous per-tab).
No patient name, no transcript content, no PHI in event payload.

### Physician weekly summary card (Today screen)

Small card at the bottom of Today. Weekly reset every Monday 00:00.

```
┌─────────────────────────────────┐
│ This week                       │
│ 12 visits recorded              │
│ 8 of 11 follow-ups completed    │
│ 2 drafts still open             │
│                                 │
│ You're staying on top of care.  │
└─────────────────────────────────┘
```

Rules:
- Narrative line is always positive or neutral — never deficit language
- Colour: neutral baseline, warm tones only when all follow-ups done (not red for incomplete)
- "Drafts still open" is a factual reminder, not a guilt trigger — links directly to /drafts
- No streak counter. No "best week" comparison. No targets.

### Admin cabinet (separate from physician view)

Admin sees raw `product_events` per physician:
- Funnel: `recording_started` → `visit_committed` (drop-off detection)
- Ping completion rate per physician
- Average visit recording duration
- Sessions per day — is anyone using it?

This is for product iteration, not performance review of physicians.

---

## Engineering Principles

1. **Performance and reliability are constraint #1** — any architectural decision is evaluated against: "does this add latency or a new failure point?" Features that do either are simplified or deferred.
2. **No silent failure** — every action has an explicit state: pending / success / error
3. **Draft-first persistence** — data is written locally before being sent, not after
4. **Fail visible** — an error is better than silence; the physician must always know what is happening
5. **3 priorities, not 15** — scoring instead of exhaustive lists; process backlog in batches of 1–3
6. **Pack-driven extensibility** — new disease = new file in `/packs`, zero changes to core
7. **Stable visual identity** — patient avatar never changes when treatment changes (shape = identity, colour = state)
8. **Demo-first development** — every feature works without a backend

---

## Sprint Roadmap

### ✅ Completed (Sprint 0–2)
- [x] Voice capture → transcript → case commit
- [x] Today queue (due, overdue, non-responders, drafts)
- [x] Case detail with visit history
- [x] Patient Visual Identity (animal, response colour, medication badge)
- [x] Cohort map (bucket × frequency grid)
- [x] Treatment trajectory timeline
- [x] Sidebar navigation (desktop permanent + mobile drawer)
- [x] EN/RU localisation
- [x] Demo mode without backend

---

### 🛡 Sprint 3 — Recording Reliability (Priority 1)

> Goal: physician always knows exactly what is happening with their recording

| # | Task | Size |
|---|---|---|
| 3.1 | Microphone permission gate — do not render record button until `getUserMedia` resolves | XS |
| 3.2 | AudioAnalyser volume bar — live waveform during recording | S |
| 3.3 | Chunked real-time transcript — words appear during speech via `SpeechRecognition` interim results, not after | S |
| 3.4 | "Not hearing anything" warning — if 0 words for 10 s | S |
| 3.5 | File size display after stop — "Captured 2.3 MB" | XS |
| 3.6 | Upload progress bar with percentage | S |
| 3.7 | Retry on upload failure — resend same blob, no re-recording | S |
| 3.8 | Draft recovery — on /capture load, detect and offer to restore uncommitted draft | M |
| 3.9 | Manual fallback on transcription failure — audio player + manual field entry | M |
| 3.10 | Safari/Firefox capability warning before record attempt | XS |

---

### 🔥 Sprint 4 — Core UX

> Goal: physician completes a real visit with minimal friction

| # | Task | Size |
|---|---|---|
| 4.1 | T9 and voice in one panel — not separate tabs | M |
| 4.2 | Email button post-commit — formatted transcript ready to paste into EMR | S |
| 4.3 | Multiple medications — dot badges, not single badge | S |
| 4.4 | Per-disease mandatory fields — validation on commit | M |
| 4.5 | Filter by date of last visit — physician finds patients they saw N days ago | M |
| 4.6 | Attack count field (last month) — mandatory for migraine pack | S |

---

### 🔔 Sprint 5 — Smart Ping List

> Goal: physician sees 3 actionable items, not 15 banners

> **Cognitive load research basis:**
> - Miller (1956): working memory holds 7±2 units → show max 3 actions at once
> - Danziger et al. (2011, judges): decision quality degrades after 15+ choices → batch the backlog
> - Raymond (1992, attentional blink): after one salient stimulus, attention is suppressed 200–500 ms → do not place two critical items adjacent

| # | Task | Size |
|---|---|---|
| 5.0 | Today: preserve current queue structure — only add "Work through backlog" entry point | XS |
| 5.1 | Top-3 by score — `overdue_days × 3 + non_responder × 2 + unread_draft × 1` | M |
| 5.2 | "Work through backlog" — reveals next 1–3 cases with progress counter "3 of 12" | M |
| 5.3 | Reason label — "Non-responder 3 months + 5 days overdue" | S |
| 5.4 | "Called" checkbox + `completed_at` | S |
| 5.5 | "Remind again" + date — case disappears until that date | S |
| 5.6 | "What to say" hint — template from pack by `conditionKey` | M |

---

### 👥 Sprint 6 — Patient Management

> Goal: 15-patient daily list with visit time and order

| # | Task | Size |
|---|---|---|
| 6.1 | Daily list — patients with visit time, sorted chronologically | M |
| 6.2 | Patient search — by `caseToken`, visit date (not open-text name search) | M |

---

### 🏥 Sprint 7 — Multi-Disease Support

> Goal: second condition pack without touching core

| # | Task | Size |
|---|---|---|
| 7.1 | Pack registry — lazy-load packs from `/packs` directory | M |
| 7.2 | Hypertension pack — fields: BP, HR, medications, cardiovascular risk | L |
| 7.3 | Dynamic visit fields — rendered from pack schema, not hardcoded | M |

---

### 🔐 Sprint 8 — Security & Compliance

> All items in this sprint are compliance requirements, not enhancements.

| # | Task | Regulation | Priority |
|---|---|---|---|
| 8.1 | Signed S3 audio URLs with 15-min TTL | HIPAA | 🔴 Critical |
| 8.2 | BAA with AI audio provider (Google Healthcare API or self-hosted Whisper) | HIPAA | 🔴 Critical |
| 8.3 | Transcript encryption at rest (SQLCipher or field-level AES) | HIPAA / GDPR | 🔴 High |
| 8.4 | `audit_log` table — actor, action, entity_id, timestamp on every mutation | HIPAA / DHA | 🟡 Medium |
| 8.5 | `DELETE /cases/:id` endpoint with cascading audio deletion | GDPR Art. 17 | 🟡 Medium |
| 8.6 | Strip PHI from all log outputs | HIPAA / GDPR | 🟡 Medium |
| 8.7 | CSRF token on all mutating requests | General | 🟡 Medium |
| 8.8 | Rate limiting — 60 audio uploads per physician per hour | General | 🟡 Medium |
| 8.9 | Block demo mode when `APP_ENV=production` | General | 🟡 Medium |
| 8.10 | `audio_expires_at` field + scheduled deletion job | GDPR / HIPAA | 🟢 Low |

---

### 🧪 Sprint 9 — Test Coverage

> Currently: zero tests. This is a liability for any refactor.

| # | Test | Type |
|---|---|---|
| 9.1 | `patient-identity` — determinism of animal and colour by fixed inputs | Jest unit |
| 9.2 | Ping scoring algorithm — `overdue × 3` etc | Jest unit |
| 9.3 | Voice draft lifecycle — upload → poll → commit | Integration |
| 9.4 | Auth flow — magic link → verify → me → logout | Integration |
| 9.5 | Draft recovery — uncommitted draft survives page reload | Playwright |
| 9.6 | Silent recording detection — warning appears when waveform is flat | Playwright |
| 9.7 | Ping workflow — mark called, reschedule, "remind again" | Playwright |
| 9.8 | Cross-physician isolation — physician A cannot read physician B's cases | Integration |

---

## Open Questions

- [ ] Patient identification: currently free-text name in transcript. Need a stable pseudonym assignment flow at first visit.
- [ ] EMR integration: direct HL7/FHIR push or email-to-paste is sufficient for now?
- [ ] Audio retention: keep after commit for audit, or delete to minimise PHI surface?
- [ ] Deployment target: web only, PWA, or native mobile?
- [ ] Telegram/WhatsApp bot: maintain in parallel or focus entirely on the web interface?
- [ ] Case data retention period: define before production go-live (GDPR Art. 5 requirement)
- [ ] Physician onboarding: currently requires curl to `/admin/physicians` — needs a proper admin UI
