# Hope-Hosital
# Hope Clinic — Doctor’s Office Roleplay (Offline)

Static HTML/CSS/JS app for personal roleplay + organization.
**Not medical advice.** It does not diagnose anything.

## Files
- `index.html`
- `styles.css`
- `app.js`

## How to run locally
1. Download the repo (or clone it)
2. Open `index.html` in your browser  
   - Recommended: VS Code extension “Live Server” for easier dev

## Data storage (local-only)
All data is stored on your device in your browser using `localStorage` under:
- `hopeClinicData`

No backend. No analytics. No external APIs.

## Features
- Create / edit / delete patient profiles
- Store medical history (conditions, allergies, meds, etc.)
- Create assessments linked to patients
  - Templates:
    - General Intake
    - Dizziness / POTS-style Check (with optional timepoint vitals)
- Timeline view of assessments
- Export JSON / Import JSON backups
- Demo data button (clearly fake)
- Delete-all with confirmation modal

## GitHub Pages (optional)
If you want it accessible as a website:
1. Repo Settings → Pages
2. Deploy from branch: `main` + `/root`
3. Save

⚠️ If you keep this repo public, anyone can access it.
This app stores data locally on each device, but the *code* is still public.

## Manual test checklist
- Create a patient
- Edit the patient
- Add a “General Intake” assessment
- Add a “Dizziness / POTS-style” assessment
- Export JSON and re-import it
- Delete a patient and verify their assessments disappear
- Use “Delete everything” in Settings
