/* Hope Clinic — offline-only roleplay app
   Data stored locally in localStorage under one key.
*/
const STORAGE_KEY = "hopeClinicData";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowLocalInputValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? safeParse(raw) : null;
  if (parsed && typeof parsed === "object") return normalizeData(parsed);
  return normalizeData({ patients: [], assessments: [] });
}

function normalizeData(data) {
  return {
    version: 1,
    patients: Array.isArray(data.patients) ? data.patients : [],
    assessments: Array.isArray(data.assessments) ? data.assessments : [],
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => el.classList.add("hidden"), 2200);
}

const state = {
  data: loadData(),
  selectedPatientId: null,
  activeTab: "overview",
  editingPatientId: null,
  editingAssessmentId: null,
  confirmAction: null,
  toastTimer: null,
};

// ---------- Render ----------
function render() {
  renderPatientList();
  renderSelectedHeader();
  renderTabsEnabled();
  renderPanels();
}

function renderPatientList() {
  const list = $("#patientList");
  const empty = $("#patientListEmpty");
  list.innerHTML = "";

  const q = $("#patientSearch").value.trim().toLowerCase();
  const patients = state.data.patients
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    .filter(p => !q || (p.name || "").toLowerCase().includes(q));

  empty.classList.toggle("hidden", patients.length !== 0);

  for (const p of patients) {
    const li = document.createElement("li");
    li.className = "patient-item" + (p.id === state.selectedPatientId ? " active" : "");
    li.tabIndex = 0;
    li.role = "button";
    li.setAttribute("aria-label", `Select patient ${p.name}`);

    const meta = `${p.dob ? `DOB ${p.dob}` : "DOB —"}`;

    li.innerHTML = `
      <div class="name">${escapeHtml(p.name || "Unnamed")}</div>
      <div class="meta">${escapeHtml(meta)}</div>
    `;

    li.addEventListener("click", () => selectPatient(p.id));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") selectPatient(p.id);
    });
    list.appendChild(li);
  }
}

function renderSelectedHeader() {
  const p = getSelectedPatient();
  const nameEl = $("#selectedPatientName");
  const metaEl = $("#selectedPatientMeta");

  const btnEdit = $("#btnEditPatient");
  const btnDel = $("#btnDeletePatient");
  const btnNewAssessment = $("#btnNewAssessment");

  if (!p) {
    nameEl.textContent = "Select a patient";
    metaEl.textContent = "Create a profile to begin roleplay visits.";
    btnEdit.disabled = true;
    btnDel.disabled = true;
    btnNewAssessment.disabled = true;
    return;
  }

  nameEl.textContent = p.name || "Unnamed";
  metaEl.textContent = `${p.dob ? `DOB: ${p.dob}` : "DOB: —"} • ${p.pronouns ? p.pronouns : "Pronouns: —"}`;
  btnEdit.disabled = false;
  btnDel.disabled = false;
  btnNewAssessment.disabled = false;
}

function renderTabsEnabled() {
  const hasPatient = !!getSelectedPatient();
  ["overview", "history", "assessments", "documents"].forEach(tab => {
    $(`#tab-${tab}`).disabled = !hasPatient;
  });
}

function renderPanels() {
  // tab visibility
  $$(".tab-panel").forEach(p => p.classList.add("hidden"));
  $(`#panel-${state.activeTab}`).classList.remove("hidden");

  // active tab buttons
  $$(".tab").forEach(b => b.classList.remove("active"));
  const activeBtn = $(`.tab[data-tab="${state.activeTab}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  // content
  renderOverview();
  renderHistory();
  renderAssessments();
}

function renderOverview() {
  const p = getSelectedPatient();
  const box = $("#overviewContent");
  if (!p) {
    box.textContent = "Pick a patient to see their details here.";
    return;
  }

  box.innerHTML = `
    <div class="row" style="gap:12px; margin-top:10px; flex-wrap:wrap;">
      <div><strong>Name:</strong> ${escapeHtml(p.name || "—")}</div>
      <div><strong>DOB:</strong> ${escapeHtml(p.dob || "—")}</div>
      <div><strong>Pronouns:</strong> ${escapeHtml(p.pronouns || "—")}</div>
    </div>
    <div style="margin-top:12px;">
      <div><strong>Sex at birth:</strong> ${escapeHtml(p.sexAtBirth || "—")}</div>
      <div><strong>Gender identity:</strong> ${escapeHtml(p.genderIdentity || "—")}</div>
      <div><strong>Contact notes:</strong> ${escapeHtml(p.contactNotes || "—")}</div>
      <div><strong>Emergency contact:</strong> ${escapeHtml(p.emergencyContact || "—")}</div>
    </div>
    <div style="margin-top:12px;">
      <strong>Quick notes:</strong>
      <div class="muted" style="margin-top:6px; white-space:pre-wrap;">${escapeHtml(p.history?.notes || "") || "—"}</div>
    </div>
  `;
}

function renderHistory() {
  const p = getSelectedPatient();
  const box = $("#historyContent");
  if (!p) {
    box.textContent = "Pick a patient to see history.";
    return;
  }

  const h = p.history || {};
  box.innerHTML = `
    ${historyBlock("Conditions", h.conditions)}
    ${historyBlock("Allergies", h.allergies)}
    ${historyBlock("Medications", h.medications)}
    ${historyBlock("Surgeries", h.surgeries)}
    ${historyBlock("Family history", h.familyHistory)}
    ${historyBlock("Social history", h.socialHistory)}
    ${historyBlock("Other notes", h.notes)}
  `;
}

function historyBlock(title, text) {
  const safe = escapeHtml(text || "").trim();
  return `
    <div style="margin-top:10px; padding:12px; border:1px solid var(--line); border-radius:14px; background:#fbfbff;">
      <div style="font-weight:800;">${escapeHtml(title)}</div>
      <div class="muted" style="margin-top:6px; white-space:pre-wrap;">${safe || "—"}</div>
    </div>
  `;
}

function renderAssessments() {
  const p = getSelectedPatient();
  const list = $("#assessmentList");
  const empty = $("#assessmentsEmpty");

  list.innerHTML = "";

  if (!p) {
    empty.classList.add("hidden");
    return;
  }

  const assessments = state.data.assessments
    .filter(a => a.patientId === p.id)
    .slice()
    .sort((a, b) => (b.datetime || "").localeCompare(a.datetime || ""));

  empty.classList.toggle("hidden", assessments.length !== 0);

  for (const a of assessments) {
    const li = document.createElement("li");
    li.className = "assessment-item";
    const title = a.template === "dizziness" ? "Dizziness / POTS-style Check" : "General Intake";
    const snippet = (a.chiefComplaint || a.notes || "").slice(0, 160);

    li.innerHTML = `
      <div class="top">
        <div>
          <div class="title">${escapeHtml(title)}</div>
          <div class="date">${escapeHtml(formatDateTime(a.datetime))} • ${escapeHtml(a.clinician || "Clinician —")}</div>
        </div>
        <div class="muted">ID: ${escapeHtml(a.id)}</div>
      </div>
      <div class="snippet">${escapeHtml(snippet || "—")}</div>
      <div class="row">
        <button class="ghost" data-action="view">View</button>
        <button class="ghost" data-action="edit">Edit</button>
        <button class="danger" data-action="delete">Delete</button>
      </div>
    `;

    li.querySelector('[data-action="view"]').addEventListener("click", () => viewAssessment(a.id));
    li.querySelector('[data-action="edit"]').addEventListener("click", () => openAssessmentModal("edit", a.id));
    li.querySelector('[data-action="delete"]').addEventListener("click", () => confirmDeleteAssessment(a.id));

    list.appendChild(li);
  }
}

// ---------- Patient CRUD ----------
function selectPatient(id) {
  state.selectedPatientId = id;
  // default tab to overview if currently on a disabled tab and no patient
  if (!id && state.activeTab !== "settings") state.activeTab = "overview";
  render();
}

function getSelectedPatient() {
  return state.data.patients.find(p => p.id === state.selectedPatientId) || null;
}

function openPatientModal(mode) {
  const modal = $("#modalPatient");
  const title = $("#modalPatientTitle");
  const form = $("#patientForm");

  state.editingPatientId = null;
  form.reset();

  if (mode === "new") {
    title.textContent = "New patient";
  } else {
    const p = getSelectedPatient();
    if (!p) return;
    title.textContent = "Edit patient";
    state.editingPatientId = p.id;

    $("#p_name").value = p.name || "";
    $("#p_dob").value = p.dob || "";
    $("#p_sex").value = p.sexAtBirth || "";
    $("#p_gender").value = p.genderIdentity || "";
    $("#p_pronouns").value = p.pronouns || "";
    $("#p_contact").value = p.contactNotes || "";
    $("#p_emergency").value = p.emergencyContact || "";

    $("#h_conditions").value = p.history?.conditions || "";
    $("#h_allergies").value = p.history?.allergies || "";
    $("#h_meds").value = p.history?.medications || "";
    $("#h_surgeries").value = p.history?.surgeries || "";
    $("#h_family").value = p.history?.familyHistory || "";
    $("#h_social").value = p.history?.socialHistory || "";
    $("#h_notes").value = p.history?.notes || "";
  }

  modal.classList.remove("hidden");
  $("#p_name").focus();
}

function closePatientModal() {
  $("#modalPatient").classList.add("hidden");
}

function upsertPatientFromForm(form) {
  const name = form.name.value.trim();
  const dob = form.dob.value;
  if (!name) return toast("Name is required.");
  if (!dob) return toast("DOB is required.");

  const patient = {
    id: state.editingPatientId || uid("pat"),
    name,
    dob,
    sexAtBirth: form.sexAtBirth.value.trim(),
    genderIdentity: form.genderIdentity.value.trim(),
    pronouns: form.pronouns.value.trim(),
    contactNotes: form.contactNotes.value.trim(),
    emergencyContact: form.emergencyContact.value.trim(),
    history: {
      conditions: $("#h_conditions").value.trim(),
      allergies: $("#h_allergies").value.trim(),
      medications: $("#h_meds").value.trim(),
      surgeries: $("#h_surgeries").value.trim(),
      familyHistory: $("#h_family").value.trim(),
      socialHistory: $("#h_social").value.trim(),
      notes: $("#h_notes").value.trim(),
    },
    updatedAt: new Date().toISOString(),
  };

  const idx = state.data.patients.findIndex(p => p.id === patient.id);
  if (idx >= 0) {
    state.data.patients[idx] = patient;
    toast("Patient updated.");
  } else {
    state.data.patients.push(patient);
    state.selectedPatientId = patient.id;
    toast("Patient created.");
  }

  saveData();
  closePatientModal();
  render();
}

function confirmDeletePatient() {
  const p = getSelectedPatient();
  if (!p) return;

  openConfirmModal(
    "Delete patient",
    `Delete "${p.name}" and all their assessments? This cannot be undone.`,
    () => {
      // remove patient
      state.data.patients = state.data.patients.filter(x => x.id !== p.id);
      // remove assessments
      state.data.assessments = state.data.assessments.filter(a => a.patientId !== p.id);
      state.selectedPatientId = null;
      saveData();
      toast("Patient deleted.");
      render();
    }
  );
}

// ---------- Assessment Templates ----------
const TEMPLATE_GENERAL = {
  symptoms: [
    "Fever / chills",
    "Fatigue",
    "Headache",
    "Chest discomfort",
    "Shortness of breath",
    "Nausea / vomiting",
    "Abdominal pain",
    "Dizziness / lightheadedness",
    "Pain (general)",
    "Anxiety / panic feelings"
  ],
};

const TEMPLATE_DIZZINESS = {
  symptoms: [
    "Lightheaded on standing",
    "Vision greys out / tunnel vision",
    "Palpitations",
    "Shakiness / tremor",
    "Nausea",
    "Brain fog",
    "Shortness of breath",
    "Chest tightness",
    "Leg heaviness / pooling",
    "Head pressure"
  ],
  triggers: [
    "Standing still",
    "Heat",
    "After meals",
    "Dehydration",
    "Poor sleep",
    "Stress / adrenaline",
    "Exertion",
    "Period / hormonal changes"
  ]
};

function assessmentFieldsHTML(template) {
  if (template === "dizziness") {
    return `
      <h4>Orthostatic / dizziness template</h4>

      <div class="grid-2">
        <div>
          <label>Orthostatic symptoms (tick all that apply)</label>
          <div class="checks">
            ${TEMPLATE_DIZZINESS.symptoms.map(s => checkbox("symptoms", s)).join("")}
          </div>
        </div>
        <div>
          <label>Common triggers</label>
          <div class="checks">
            ${TEMPLATE_DIZZINESS.triggers.map(t => checkbox("triggers", t)).join("")}
          </div>
        </div>
      </div>

      <h4>Vitals (roleplay)</h4>
      <p class="muted">Optional. Useful for a roleplay “stand test” style note.</p>

      <div class="grid-3">
        ${vitalsBlock("Lying (0 min)", "v0")}
        ${vitalsBlock("Standing (1 min)", "v1")}
        ${vitalsBlock("Standing (3 min)", "v3")}
      </div>

      <div class="grid-2">
        <div>
          <label for="a_hydration">Hydration / food notes</label>
          <textarea id="a_hydration" name="hydrationNotes" rows="3" placeholder="Hydration, salty foods, appetite…"></textarea>
        </div>
        <div>
          <label for="a_notes">Free notes</label>
          <textarea id="a_notes" name="notes" rows="3" placeholder="Anything else…"></textarea>
        </div>
      </div>

      <div>
        <label for="a_plan">Impression / plan (roleplay language only)</label>
        <textarea id="a_plan" name="plan" rows="3" placeholder="Possible considerations, next steps, comfort measures…"></textarea>
        <p class="muted" style="margin-top:6px;">Keep it roleplay: “possible considerations” rather than definitive diagnosis.</p>
      </div>
    `;
  }

  // general
  return `
    <h4>General intake template</h4>

    <div>
      <label>Symptoms (tick all that apply)</label>
      <div class="checks">
        ${TEMPLATE_GENERAL.symptoms.map(s => checkbox("symptoms", s)).join("")}
      </div>
    </div>

    <h4>Vitals (optional)</h4>
    <div class="grid-3">
      ${simpleVital("Heart rate (bpm)", "hr")}
      ${simpleVital("Blood pressure (e.g., 120/80)", "bp")}
      ${simpleVital("SpO₂ (%)", "spo2")}
    </div>

    <div class="grid-2">
      <div>
        <label for="a_notes">Clinical notes</label>
        <textarea id="a_notes" name="notes" rows="4" placeholder="History of presenting complaint, observations…"></textarea>
      </div>
      <div>
        <label for="a_plan">Impression / plan (roleplay)</label>
        <textarea id="a_plan" name="plan" rows="4" placeholder="Possible considerations, next steps, self-care, referrals…"></textarea>
      </div>
    </div>
  `;
}

function checkbox(group, label) {
  const id = uid("chk");
  return `
    <div class="check">
      <input type="checkbox" id="${id}" name="${group}" value="${escapeAttr(label)}" />
      <label for="${id}">${escapeHtml(label)}</label>
    </div>
  `;
}

function vitalsBlock(title, key) {
  return `
    <div style="border:1px solid var(--line); border-radius:14px; padding:12px; background:#fbfbff;">
      <div style="font-weight:800; margin-bottom:8px;">${escapeHtml(title)}</div>
      <div class="row" style="gap:10px;">
        <div style="flex:1;">
          <label for="${key}_hr">HR</label>
          <input id="${key}_hr" name="${key}_hr" inputmode="numeric" placeholder="bpm" />
        </div>
        <div style="flex:1;">
          <label for="${key}_bp">BP</label>
          <input id="${key}_bp" name="${key}_bp" placeholder="120/80" />
        </div>
        <div style="flex:1;">
          <label for="${key}_spo2">SpO₂</label>
          <input id="${key}_spo2" name="${key}_spo2" inputmode="numeric" placeholder="%" />
        </div>
      </div>
    </div>
  `;
}

function simpleVital(label, key) {
  return `
    <div>
      <label for="a_${key}">${escapeHtml(label)}</label>
      <input id="a_${key}" name="${key}" />
    </div>
  `;
}

// Extra styling hook for checklists
const checklistStyle = document.createElement("style");
checklistStyle.textContent = `
  .checks{display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:8px; padding:10px; border:1px solid var(--line); border-radius:14px; background:#fbfbff;}
  .check{display:flex; gap:8px; align-items:flex-start;}
  .check input{width:auto; margin-top:3px;}
  @media (max-width:900px){.checks{grid-template-columns:1fr;}}
`;
document.head.appendChild(checklistStyle);

// ---------- Assessment CRUD ----------
function openAssessmentModal(mode, assessmentId = null) {
  const p = getSelectedPatient();
  if (!p) return;

  const modal = $("#modalAssessment");
  const title = $("#modalAssessmentTitle");
  const form = $("#assessmentForm");
  const fields = $("#assessmentFields");

  state.editingAssessmentId = null;
  form.reset();

  $("#a_datetime").value = nowLocalInputValue();
  $("#a_template").value = "general";
  fields.innerHTML = assessmentFieldsHTML("general");

  if (mode === "new") {
    title.textContent = "New assessment";
  } else {
    const a = state.data.assessments.find(x => x.id === assessmentId);
    if (!a) return;
    title.textContent = "Edit assessment";
    state.editingAssessmentId = a.id;

    $("#a_template").value = a.template || "general";
    fields.innerHTML = assessmentFieldsHTML(a.template || "general");

    $("#a_clinician").value = a.clinician || "";
    $("#a_datetime").value = a.datetime ? toLocalInput(a.datetime) : nowLocalInputValue();
    $("#a_chief").value = a.chiefComplaint || "";

    // restore checkboxes + fields
    tickCheckboxes(form, "symptoms", a.symptoms || []);
    tickCheckboxes(form, "triggers", a.triggers || []);

    if (a.template === "general") {
      $("#a_hr").value = a.vitals?.hr || "";
      $("#a_bp").value = a.vitals?.bp || "";
      $("#a_spo2").value = a.vitals?.spo2 || "";
    } else {
      // dizziness vitals blocks
      const v = a.vitals || {};
      setIf(`#v0_hr`, v.v0?.hr);
      setIf(`#v0_bp`, v.v0?.bp);
      setIf(`#v0_spo2`, v.v0?.spo2);
      setIf(`#v1_hr`, v.v1?.hr);
      setIf(`#v1_bp`, v.v1?.bp);
      setIf(`#v1_spo2`, v.v1?.spo2);
      setIf(`#v3_hr`, v.v3?.hr);
      setIf(`#v3_bp`, v.v3?.bp);
      setIf(`#v3_spo2`, v.v3?.spo2);

      const hyd = $("#a_hydration");
      if (hyd) hyd.value = a.hydrationNotes || "";
    }

    const notes = $("#a_notes");
    if (notes) notes.value = a.notes || "";

    const plan = $("#a_plan");
    if (plan) plan.value = a.plan || "";
  }

  modal.classList.remove("hidden");
  $("#a_template").focus();
}

function closeAssessmentModal() {
  $("#modalAssessment").classList.add("hidden");
}

function tickCheckboxes(form, name, values) {
  const set = new Set(values || []);
  form.querySelectorAll(`input[type="checkbox"][name="${name}"]`).forEach(cb => {
    cb.checked = set.has(cb.value);
  });
}

function toLocalInput(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return nowLocalInputValue();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setIf(sel, val) {
  const el = $(sel);
  if (el) el.value = val || "";
}

function readChecked(form, name) {
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(x => x.value);
}

function upsertAssessmentFromForm(form) {
  const p = getSelectedPatient();
  if (!p) return;

  const template = form.template.value;
  const clinician = form.clinician.value.trim();
  const datetimeLocal = form.datetime.value;
  const datetime = datetimeLocal ? new Date(datetimeLocal).toISOString() : new Date().toISOString();
  const chiefComplaint = form.chiefComplaint.value.trim();

  const symptoms = readChecked(form, "symptoms");
  const triggers = template === "dizziness" ? readChecked(form, "triggers") : [];

  const notes = (form.notes?.value || "").trim();
  const plan = (form.plan?.value || "").trim();

  let vitals = {};
  let hydrationNotes = "";

  if (template === "general") {
    vitals = {
      hr: (form.hr?.value || "").trim(),
      bp: (form.bp?.value || "").trim(),
      spo2: (form.spo2?.value || "").trim(),
    };
  } else {
    vitals = {
      v0: { hr: $("#v0_hr")?.value.trim() || "", bp: $("#v0_bp")?.value.trim() || "", spo2: $("#v0_spo2")?.value.trim() || "" },
      v1: { hr: $("#v1_hr")?.value.trim() || "", bp: $("#v1_bp")?.value.trim() || "", spo2: $("#v1_spo2")?.value.trim() || "" },
      v3: { hr: $("#v3_hr")?.value.trim() || "", bp: $("#v3_bp")?.value.trim() || "", spo2: $("#v3_spo2")?.value.trim() || "" },
    };
    hydrationNotes = (form.hydrationNotes?.value || "").trim();
  }

  const assessment = {
    id: state.editingAssessmentId || uid("assess"),
    patientId: p.id,
    template,
    clinician,
    datetime,
    chiefComplaint,
    symptoms,
    triggers,
    vitals,
    hydrationNotes,
    notes,
    plan,
    updatedAt: new Date().toISOString(),
  };

  const idx = state.data.assessments.findIndex(a => a.id === assessment.id);
  if (idx >= 0) {
    state.data.assessments[idx] = assessment;
    toast("Assessment updated.");
  } else {
    state.data.assessments.push(assessment);
    toast("Assessment saved.");
  }

  saveData();
  closeAssessmentModal();
  render();
  state.activeTab = "assessments";
  renderPanels();
}

function viewAssessment(id) {
  const a = state.data.assessments.find(x => x.id === id);
  const p = getSelectedPatient();
  if (!a || !p) return;

  const title = a.template === "dizziness" ? "Dizziness / POTS-style Check" : "General Intake";

  const vitalsText = a.template === "general"
    ? `HR: ${a.vitals?.hr || "—"} | BP: ${a.vitals?.bp || "—"} | SpO₂: ${a.vitals?.spo2 || "—"}`
    : `Lying: HR ${a.vitals?.v0?.hr || "—"} BP ${a.vitals?.v0?.bp || "—"} SpO₂ ${a.vitals?.v0?.spo2 || "—"}
Standing 1m: HR ${a.vitals?.v1?.hr || "—"} BP ${a.vitals?.v1?.bp || "—"} SpO₂ ${a.vitals?.v1?.spo2 || "—"}
Standing 3m: HR ${a.vitals?.v3?.hr || "—"} BP ${a.vitals?.v3?.bp || "—"} SpO₂ ${a.vitals?.v3?.spo2 || "—"}`;

  openConfirmModal(
    `${title} (view)`,
    [
      `Patient: ${p.name}`,
      `When: ${formatDateTime(a.datetime)}`,
      `Clinician: ${a.clinician || "—"}`,
      `Chief complaint: ${a.chiefComplaint || "—"}`,
      `Symptoms: ${a.symptoms?.length ? a.symptoms.join(", ") : "—"}`,
      a.template === "dizziness" ? `Triggers: ${a.triggers?.length ? a.triggers.join(", ") : "—"}` : null,
      `Vitals:\n${vitalsText}`,
      a.hydrationNotes ? `Hydration/Food: ${a.hydrationNotes}` : null,
      `Notes:\n${a.notes || "—"}`,
      `Plan:\n${a.plan || "—"}`,
    ].filter(Boolean).join("\n\n"),
    null,
    { viewOnly: true }
  );
}

function confirmDeleteAssessment(id) {
  openConfirmModal(
    "Delete assessment",
    "Delete this assessment? This cannot be undone.",
    () => {
      state.data.assessments = state.data.assessments.filter(a => a.id !== id);
      saveData();
      toast("Assessment deleted.");
      render();
    }
  );
}

// ---------- Confirm Modal ----------
function openConfirmModal(title, text, onOk, options = {}) {
  $("#modalConfirmTitle").textContent = title;
  $("#confirmText").textContent = text;

  const okBtn = $("#confirmOk");
  const cancelBtn = $("#confirmCancel");

  const viewOnly = options.viewOnly === true;

  okBtn.textContent = viewOnly ? "Close" : "Yes, do it";
  okBtn.classList.toggle("danger", !viewOnly);
  okBtn.classList.toggle("primary", viewOnly);

  state.confirmAction = onOk;

  $("#modalConfirm").classList.remove("hidden");

  // if view only, ok just closes
  okBtn.onclick = () => {
    if (!viewOnly && typeof state.confirmAction === "function") state.confirmAction();
    closeConfirmModal();
  };

  cancelBtn.classList.toggle("hidden", viewOnly);
  cancelBtn.onclick = () => closeConfirmModal();
}

function closeConfirmModal() {
  $("#modalConfirm").classList.add("hidden");
  state.confirmAction = null;
}

// ---------- Export / Import ----------
function exportJSON() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hope-clinic-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Exported JSON.");
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = safeParse(reader.result);
    if (!parsed || typeof parsed !== "object") return toast("Invalid JSON.");
    const normalized = normalizeData(parsed);
    state.data = normalized;
    state.selectedPatientId = normalized.patients[0]?.id || null;
    saveData();
    toast("Imported data.");
    render();
  };
  reader.readAsText(file);
}

// ---------- Demo Data ----------
function makeDemoData() {
  const demo = normalizeData({ patients: [], assessments: [] });

  const p1 = {
    id: uid("pat"),
    name: "Jamie Example (FAKE)",
    dob: "2001-04-12",
    sexAtBirth: "—",
    genderIdentity: "—",
    pronouns: "they/them",
    contactNotes: "Fake patient for demo.",
    emergencyContact: "—",
    history: {
      conditions: "Example condition A\nExample condition B",
      allergies: "Example allergy",
      medications: "Example med 10mg daily",
      surgeries: "—",
      familyHistory: "—",
      socialHistory: "—",
      notes: "This is demo data. Not real.",
    },
    updatedAt: new Date().toISOString(),
  };

  const p2 = {
    id: uid("pat"),
    name: "Taylor Demo (FAKE)",
    dob: "1998-09-30",
    sexAtBirth: "",
    genderIdentity: "",
    pronouns: "she/her",
    contactNotes: "",
    emergencyContact: "",
    history: {
      conditions: "—",
      allergies: "—",
      medications: "—",
      surgeries: "Appendectomy (demo)",
      familyHistory: "—",
      socialHistory: "—",
      notes: "Demo profile.",
    },
    updatedAt: new Date().toISOString(),
  };

  demo.patients.push(p1, p2);

  demo.assessments.push({
    id: uid("assess"),
    patientId: p1.id,
    template: "general",
    clinician: "Dr. Pixel (FAKE)",
    datetime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    chiefComplaint: "Headache and fatigue (demo)",
    symptoms: ["Fatigue", "Headache"],
    triggers: [],
    vitals: { hr: "92", bp: "118/76", spo2: "99" },
    hydrationNotes: "",
    notes: "Roleplay note. Demo data.",
    plan: "Possible considerations: rest, fluids, follow-up if needed (roleplay).",
    updatedAt: new Date().toISOString(),
  });

  demo.assessments.push({
    id: uid("assess"),
    patientId: p2.id,
    template: "dizziness",
    clinician: "Nurse Byte (FAKE)",
    datetime: new Date().toISOString(),
    chiefComplaint: "Dizzy on standing (demo)",
    symptoms: ["Lightheaded on standing", "Brain fog"],
    triggers: ["Standing still", "Dehydration"],
    vitals: {
      v0: { hr: "78", bp: "110/70", spo2: "99" },
      v1: { hr: "118", bp: "108/68", spo2: "99" },
      v3: { hr: "126", bp: "106/66", spo2: "99" },
    },
    hydrationNotes: "Had very little to drink today (demo).",
    notes: "Roleplay check-in. Demo data.",
    plan: "Possible considerations: hydration + salt, pacing, discuss with clinician (roleplay).",
    updatedAt: new Date().toISOString(),
  });

  state.data = demo;
  state.selectedPatientId = demo.patients[0].id;
  saveData();
  toast("Demo data created.");
  render();
}

// ---------- Wipe ----------
function wipeAll() {
  openConfirmModal(
    "Delete everything",
    "This will wipe all local patients and assessments. Are you sure?",
    () => {
      localStorage.removeItem(STORAGE_KEY);
      state.data = normalizeData({ patients: [], assessments: [] });
      state.selectedPatientId = null;
      toast("All data deleted.");
      render();
    }
  );
}

// ---------- Utils ----------
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return String(str ?? "").replaceAll('"', "&quot;");
}

// ---------- Events ----------
function setTab(tab) {
  state.activeTab = tab;
  renderPanels();
}

function initEvents() {
  $("#patientSearch").addEventListener("input", renderPatientList);

  $("#btnAddPatient").addEventListener("click", () => openPatientModal("new"));
  $("#btnEditPatient").addEventListener("click", () => openPatientModal("edit"));
  $("#btnDeletePatient").addEventListener("click", confirmDeletePatient);

  $("#closePatientModal").addEventListener("click", closePatientModal);
  $("#cancelPatient").addEventListener("click", closePatientModal);
  $("#patientForm").addEventListener("submit", (e) => {
    e.preventDefault();
    upsertPatientFromForm(e.target);
  });

  // Tabs
  $$(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      setTab(btn.dataset.tab);
    });
  });

  // Assessments
  $("#btnNewAssessment").addEventListener("click", () => openAssessmentModal("new"));
  $("#closeAssessmentModal").addEventListener("click", closeAssessmentModal);
  $("#cancelAssessment").addEventListener("click", closeAssessmentModal);

  $("#a_template").addEventListener("change", (e) => {
    $("#assessmentFields").innerHTML = assessmentFieldsHTML(e.target.value);
  });

  $("#assessmentForm").addEventListener("submit", (e) => {
    e.preventDefault();
    upsertAssessmentFromForm(e.target);
  });

  // Confirm modal close
  $("#closeConfirmModal").addEventListener("click", closeConfirmModal);

  // Settings
  $("#btnDemoData").addEventListener("click", () => makeDemoData());
  $("#btnExport").addEventListener("click", exportJSON);
  $("#importFile").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJSON(file);
    e.target.value = "";
  });
  $("#btnWipeAll").addEventListener("click", wipeAll);
}

// ---------- Boot ----------
function boot() {
  initEvents();
  // If there is at least one patient, auto-select first.
  if (!state.selectedPatientId && state.data.patients[0]) {
    state.selectedPatientId = state.data.patients[0].id;
  }
  render();
}

boot();

