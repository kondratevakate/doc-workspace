# Physician Workspace Web

Web-first physician workspace for case capture, draft review, due queues, and light cohort review.

## Stack

- Next.js 15
- React 19
- MUI 7
- Zustand 5

## Product boundary

- Generic physician case engine on the backend
- Disease-pack aware frontend shell
- Only the `migraine` pack is enabled at launch
- No messenger transport for clinical payload in v1

## Local run

### Demo mode without backend

Create `.env.local` with:

```bash
NEXT_PUBLIC_DEMO_MODE=0
NEXT_PUBLIC_API_BASE_URL=/api
```

Then open `/login` and switch the mode toggle to `Demo`.

For the most reliable local demo run:

```bash
npm install
npm run demo
```

Open `http://localhost:3003/today`.

Demo mode does not require authentication and does not call the backend. It uses local fixture data stored in `localStorage`.

The mode toggle and the `EN/RU` language toggle are available in the UI. `NEXT_PUBLIC_DEMO_MODE` now controls only the default mode on first load.

If you need hot reload while editing, `npm run dev` is also available on the same port.

### Real mode with backend

Create `.env.local` with:

```bash
NEXT_PUBLIC_DEMO_MODE=0
NEXT_PUBLIC_API_BASE_URL=/api
BACKEND_URL=http://127.0.0.1:8080
```

Then start the compatible backend separately and run:

```bash
npm install
npm run dev
```

The app serves on `http://localhost:3003`.

In real mode the frontend proxies `/api/*` to `BACKEND_URL`.

## Key routes

- `/login`
- `/today`
- `/capture`
- `/drafts`
- `/cohort`
- `/cases/:id`

## Patient Visual Identity System

Each patient receives a stable visual identity based on the Philips Visual Patient Avatar principle:

> *"Shape encodes stable identity. Color encodes current state."*

| Visual variable | Encodes | Changes? |
|---|---|---|
| Animal emoji (🦊🐻🦅🐺…) | sex + age band — stable patient characteristics | Never |
| Avatar color | responseStatus (naive / stable / partial / non-responder) | When treatment response changes |
| Treatment badge (💉🫀🌿⚡🎯) | currentPreventive medication class | When medication changes |
| Avatar shape | sex (circle = F, rounded square = M) | Never |

This allows a doctor to recognize a patient at a glance, see treatment status change via color shift, and track medication changes via badge — without losing the mnemonic anchor when therapy is switched.

### Design research sources

- [Philips Visual Patient Avatar](https://www.usa.philips.com/healthcare/technology/visual-patient-avatar) — core principle: peripheral vision encoding via shape + color + animation
- [Improving Visual Patient Avatar Design (PMC 2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8871093/) — user testing: shape without intuitive analogy fails (10% accuracy), redesign improved to 87–90%
- [Survey on Visual Patient Avatar in Clinical Practice (Nature 2024)](https://www.nature.com/articles/s41598-024-72338-7) — clinician perspectives on avatar-based monitoring
- [Decision-Centered Design for Chronic Pain Care (PMC 2019)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6760988/) — spatial organization of treatment timeline; color as redundant cue; ≤6 colors per display
- [Co-designing Clinical Dashboards for Chronic Disease (CHI 2024)](https://dl.acm.org/doi/full/10.1145/3613904.3642618) — trajectory over snapshot; personalization; multidisciplinary workflow
- [Clinical Dashboard Design Components (JMIR 2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11483256/) — PRO dashboards support early detection of quality-of-life changes
- [Building Patient Avatars for Precision Medicine (PMC 2015)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4635220/) — foundational computational avatar framework

## Treatment Trajectory & Process Mining

Research basis for the case detail timeline and state-transition visualization:

- [Sankey Diagrams for Symptom Trajectories (PMC 2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9232856/) — Sankey is the standard for showing clinical state transitions and population flow between treatment stages
- [Patient Path Through Sankey Diagram (PubMed 2020)](https://pubmed.ncbi.nlm.nih.gov/32570378/) — proof-of-concept for patient journey visualization via Sankey
- [Process Mining in mHealth (Nature Digital Medicine 2024)](https://www.nature.com/articles/s41746-024-01297-0) — sequential patterns and state transitions in symptom progression
- [Mapping Patient Journey via Process Mining (PMC 2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7557979/) — discovers trajectories, bottlenecks, and deviations from EHR event logs
- [Clinical Event Pattern Mining from EHR (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1532046414000094) — interactive visual analysis of sequential clinical events
