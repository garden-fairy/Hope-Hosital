diff --git a/app.js b/app.js
index 5f9019034c0f46769ff9deb2784e9cf13e07d005..a07fd4dda330b24a40429933ac8145babd38099e 100644
--- a/app.js
+++ b/app.js
@@ -256,89 +256,100 @@ function renderAssessments() {
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
 
+function syncBodyScrollLock() {
+  const hasOpenModal = $$(".modal-backdrop").some((modal) => !modal.classList.contains("hidden"));
+  document.body.classList.toggle("modal-open", hasOpenModal);
+}
+
+function setModalVisibility(id, isVisible) {
+  const modal = $(id);
+  if (!modal) return;
+  modal.classList.toggle("hidden", !isVisible);
+  syncBodyScrollLock();
+}
+
 function openPatientModal(mode) {
-  const modal = $("#modalPatient");
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
 
-  modal.classList.remove("hidden");
+  setModalVisibility("#modalPatient", true);
   $("#p_name").focus();
 }
 
 function closePatientModal() {
-  $("#modalPatient").classList.add("hidden");
+  setModalVisibility("#modalPatient", false);
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
@@ -535,51 +546,50 @@ function vitalsBlock(title, key) {
 
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
 
-  const modal = $("#modalAssessment");
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
@@ -594,56 +604,56 @@ function openAssessmentModal(mode, assessmentId = null) {
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
 
-  modal.classList.remove("hidden");
+  setModalVisibility("#modalAssessment", true);
   $("#a_template").focus();
 }
 
 function closeAssessmentModal() {
-  $("#modalAssessment").classList.add("hidden");
+  setModalVisibility("#modalAssessment", false);
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
 
@@ -752,64 +762,64 @@ function confirmDeleteAssessment(id) {
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
 
-  $("#modalConfirm").classList.remove("hidden");
+  setModalVisibility("#modalConfirm", true);
 
   // if view only, ok just closes
   okBtn.onclick = () => {
     if (!viewOnly && typeof state.confirmAction === "function") state.confirmAction();
     closeConfirmModal();
   };
 
   cancelBtn.classList.toggle("hidden", viewOnly);
   cancelBtn.onclick = () => closeConfirmModal();
 }
 
 function closeConfirmModal() {
-  $("#modalConfirm").classList.add("hidden");
+  setModalVisibility("#modalConfirm", false);
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
@@ -985,26 +995,25 @@ function initEvents() {
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
-
