import * as R from "./rules.js";
import { load, save, reset } from "./store.js";

let leads = load();
let selected = leads[0]?.id;
const ui = { q: "", grade: "", status: "" };
const $ = (s) => document.querySelector(s);
const ROUTES = ["Account Executive", "Nurture", "Regional partner", "Partner team", "Disqualify"];
const ROUTE_CLS = { "Account Executive": "ae", Nurture: "nur", "Regional partner": "par", "Partner team": "par", Disqualify: "dq" };

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("show"), 2200);
}
function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  return m < 1 ? "just now" : R.fmtMinutes(m) + " ago";
}
function persist() {
  save(leads);
  renderAll();
}

// score + suggested route, cached per render
function info(l) {
  const score = R.scoreLead(l);
  const suggested = R.routeLead(l, score);
  const route = l.route ? { ...suggested, route: l.route, owner: l.owner || suggested.owner } : suggested;
  const sla = R.slaStatus(l, score.grade);
  return { score, suggested, route, sla };
}

function slaChip(sla) {
  if (sla.state === "met") return `<span class="sla met">replied in ${R.fmtMinutes(sla.minutes)}</span>`;
  if (sla.state === "missed") return `<span class="sla missed">replied in ${R.fmtMinutes(sla.minutes)} · SLA missed</span>`;
  if (sla.state === "breached") return `<span class="sla breached">⚠ overdue ${R.fmtMinutes(-sla.minutesLeft)}</span>`;
  return `<span class="sla ${sla.state}">⏱ ${R.fmtMinutes(sla.minutesLeft)} left</span>`;
}

// ---------------- inbox ----------------
function renderList() {
  const q = ui.q.toLowerCase();
  const rows = leads
    .map((l) => ({ l, ...info(l) }))
    .filter((x) => !ui.grade || x.score.grade === ui.grade)
    .filter((x) => !ui.status || x.l.status === ui.status)
    .filter((x) => !q || [x.l.company, x.l.name, x.l.message, x.l.industry].join(" ").toLowerCase().includes(q))
    // unanswered first (most urgent SLA first), then newest
    .sort((a, b) => {
      const ua = !a.l.firstResponseAt, ub = !b.l.firstResponseAt;
      if (ua !== ub) return ua ? -1 : 1;
      if (ua && ub) return a.sla.minutesLeft - b.sla.minutesLeft;
      return b.l.receivedAt.localeCompare(a.l.receivedAt);
    });

  $("#leadList").innerHTML =
    rows
      .map(
        ({ l, score, route, sla }) => `<li class="${l.id === selected ? "sel" : ""} ${l.firstResponseAt ? "" : "unread"}" data-id="${l.id}">
      <div class="score g${score.grade}"><b>${score.total}</b><small>${score.grade}</small></div>
      <div class="li-body">
        <div class="li-top"><b>${esc(l.company)}</b><span class="muted">${ago(l.receivedAt)}</span></div>
        <div class="li-sub">${esc(l.name)} · ${esc(l.title)}</div>
        <div class="li-tags">${slaChip(sla)}<span class="route ${ROUTE_CLS[route.route]}">${l.route ? "" : "→ "}${route.route}</span><span class="status">${l.status}</span></div>
      </div></li>`
      )
      .join("") || `<li class="empty">No leads match.</li>`;
  $("#newCount").textContent = leads.filter((l) => !l.firstResponseAt).length || "";
}

function bars(parts) {
  const max = { fit: 30, need: 25, urgency: 20, budget: 15, authority: 10 };
  const label = { fit: "Fit", need: "Need", urgency: "Urgency / timeline", budget: "Budget", authority: "Authority" };
  return Object.entries(parts)
    .map(([k, v]) => `<div class="sbar"><span>${label[k]}</span><span class="strack"><span style="width:${(v / max[k]) * 100}%"></span></span><b>${v}/${max[k]}</b></div>`)
    .join("");
}

function renderDetail() {
  const l = leads.find((x) => x.id === selected);
  if (!l) {
    $("#detail").innerHTML = `<div class="empty-detail">Pick a lead on the left.</div>`;
    return;
  }
  const { score, suggested, route, sla } = info(l);
  const reply = R.draftReply(l, score, route);
  const handoff = R.handoffCard(l, score, route);
  const flags = score.flags.map((f) => `<span class="flag">${{ "job-or-student": "job / student enquiry", reseller: "wants to resell", "free-email": "personal email" }[f]}</span>`).join("");
  const query = encodeURIComponent(l.company);

  $("#detail").innerHTML = `
  <div class="d-head">
    <div>
      <h2>${esc(l.company)}</h2>
      <p class="muted">${esc(l.name)} · ${esc(l.title)} · <a href="mailto:${esc(l.email)}">${esc(l.email)}</a></p>
      <div class="meta"><span>${esc(l.industry)}</span><span>${esc(l.companySize)} people</span><span>${esc(l.region)}</span><span>${esc(l.source)}</span><span>${esc(l.budget)}</span><span>${esc(l.timeline)}</span></div>
    </div>
    <div class="big-score g${score.grade}"><b>${score.total}</b><span>grade ${score.grade}</span></div>
  </div>

  <div class="d-grid">
    <div class="card">
      <h3>What they wrote</h3>
      <blockquote>${esc(l.message)}</blockquote>
      <p class="muted">Received ${new Date(l.receivedAt).toLocaleString()} · ${slaChip(sla)}</p>
      ${flags ? `<div class="flags">${flags}</div>` : ""}
    </div>
    <div class="card">
      <h3>Qualification</h3>
      ${bars(score.parts)}
      <ul class="why">${score.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
    </div>
  </div>

  <div class="card route-card">
    <div class="route-main">
      <div>
        <h3>Routing</h3>
        <p><span class="route big ${ROUTE_CLS[route.route]}">${route.route}</span> → <b>${esc(route.owner)}</b></p>
        <p class="muted">${esc(suggested.reason)}${l.route && l.route !== suggested.route ? ` · <b>manually changed</b> from ${suggested.route}` : ""}</p>
      </div>
      <div class="route-actions">
        <label>Route<select id="routeSel">${ROUTES.map((r) => `<option ${r === route.route ? "selected" : ""}>${r}</option>`).join("")}</select></label>
        <label>Status<select id="statusSel">${R.STATUSES.map((s) => `<option ${s === l.status ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        ${l.firstResponseAt ? "" : `<button class="btn primary" id="sendBtn">Mark replied + start sequence</button>`}
      </div>
    </div>
  </div>

  <div class="d-grid">
    <div class="card">
      <div class="card-head"><h3>Reply draft</h3><button class="mini" data-copy="reply">Copy</button></div>
      <textarea id="replyText" rows="14">${esc(reply)}</textarea>
      <p class="muted">Before sending: <a target="_blank" rel="noopener" href="https://www.google.com/search?q=${query}">search the company</a> ·
        <a target="_blank" rel="noopener" href="https://www.google.com/search?q=${query}+news">recent news</a> ·
        <a target="_blank" rel="noopener" href="https://www.linkedin.com/search/results/companies/?keywords=${query}">LinkedIn page</a></p>
    </div>
    <div class="card">
      <div class="card-head"><h3>${route.route === "Account Executive" ? "AE handoff card" : "Lead summary"}</h3><button class="mini" data-copy="handoff">Copy</button></div>
      <pre id="handoffText" class="handoff">${esc(handoff)}</pre>
      <label class="notes">BDR notes<textarea id="notes" rows="3" placeholder="anything from research or the first call">${esc(l.notes)}</textarea></label>
    </div>
  </div>

  <div class="card">
    <h3>Follow-up sequence</h3>
    ${
      l.followUps?.length
        ? `<ol class="steps">${l.followUps
            .map(
              (s, i) => `<li class="${s.done ? "done" : new Date(s.due) < Date.now() ? "late" : ""}">
          <label><input type="checkbox" data-step="${i}" ${s.done ? "checked" : ""}/> ${esc(s.what)}</label>
          <span>${new Date(s.due).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span></li>`
            )
            .join("")}</ol>`
        : `<p class="muted">Starts when you mark the first reply as sent. Planned steps for <b>${route.route}</b>: ${R.SEQUENCES[route.route].map((s) => `day ${s.day}: ${s.what.toLowerCase()}`).join(" → ")}</p>`
    }
  </div>`;
}

// ---------------- follow-ups ----------------
function renderFollowups() {
  const now = Date.now();
  const all = [];
  for (const l of leads) (l.followUps || []).forEach((s, i) => !s.done && all.push({ l, s, i }));
  all.sort((a, b) => a.s.due.localeCompare(b.s.due));
  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);
  const groups = [
    ["Overdue", all.filter((x) => new Date(x.s.due) < now - 3600000)],
    ["Due today", all.filter((x) => new Date(x.s.due) >= now - 3600000 && new Date(x.s.due) <= endToday)],
    ["Coming up", all.filter((x) => new Date(x.s.due) > endToday)],
  ];
  $("#fuCount").textContent = groups[0][1].length || "";
  $("#fuBoard").innerHTML = groups
    .map(
      ([title, list]) => `<div class="fu-col"><h3>${title} <span class="muted">${list.length}</span></h3>${
        list
          .map(
            ({ l, s, i }) => `<div class="fu-card ${title === "Overdue" ? "late" : ""}">
        <div class="fu-top"><b>${esc(l.company)}</b><span class="route ${ROUTE_CLS[l.route]}">${l.route}</span></div>
        <p>${esc(s.what)}</p>
        <div class="fu-foot"><span class="muted">${esc(l.name)} · due ${new Date(s.due).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
        <span><button class="mini" data-open="${l.id}">Open</button> <button class="mini ok" data-fu="${l.id}:${i}">Done</button></span></div></div>`
          )
          .join("") || `<p class="muted">Nothing here.</p>`
      }</div>`
    )
    .join("");
}

// ---------------- dashboard ----------------
function renderDashboard() {
  const resp = R.responseMinutes(leads);
  const withInfo = leads.map((l) => ({ l, ...info(l) }));
  const slaDone = withInfo.filter((x) => x.l.firstResponseAt);
  const met = slaDone.filter((x) => x.sla.state === "met").length;
  const f = R.funnel(leads);
  const kpis = [
    ["Leads", leads.length, "last 6 weeks"],
    ["Median first reply", R.fmtMinutes(R.median(resp)), "from form to first email"],
    ["SLA met", Math.round((met / (slaDone.length || 1)) * 100) + "%", `${met} of ${slaDone.length} replied leads`],
    ["Qualified", Math.round((f[2].n / leads.length) * 100) + "%", `${f[2].n} leads`],
    ["Meetings booked", f[3].n, `${Math.round((f[3].n / leads.length) * 100)}% of all leads`],
    ["Waiting now", leads.filter((l) => !l.firstResponseAt).length, "no reply yet"],
  ];
  $("#kpis").innerHTML = kpis.map(([k, v, s]) => `<div class="kpi"><span>${k}</span><b>${v}</b><small>${s}</small></div>`).join("");

  const top = f[0].n || 1;
  $("#funnel").innerHTML = f
    .map(
      (s, i) => `<div class="fn-row"><span class="fn-name">${s.name}</span><span class="fn-bar" style="--w:${(s.n / top) * 100}%"><b>${s.n}</b></span>
      <span class="fn-conv">${i ? Math.round((s.n / (f[i - 1].n || 1)) * 100) + "% of prev" : ""}</span></div>`
    )
    .join("");

  // weekly stacked bars
  const weeks = [];
  for (let w = 5; w >= 0; w--) weeks.push({ label: w ? `${w}w ago` : "this wk", counts: {} });
  for (const x of withInfo) {
    const w = Math.floor((Date.now() - new Date(x.l.receivedAt)) / (7 * 86400000));
    if (w > 5) continue;
    const slot = weeks[5 - w];
    slot.counts[x.route.route] = (slot.counts[x.route.route] || 0) + 1;
  }
  const maxW = Math.max(...weeks.map((w) => Object.values(w.counts).reduce((a, b) => a + b, 0)), 1);
  $("#weekly").innerHTML = `<div class="stack">${weeks
    .map(
      (w) => `<div class="stack-col"><div class="stack-bar" style="height:${(Object.values(w.counts).reduce((a, b) => a + b, 0) / maxW) * 100}%">${ROUTES.map((r) =>
        w.counts[r] ? `<span class="${ROUTE_CLS[r]}" style="flex:${w.counts[r]}" title="${r}: ${w.counts[r]}"></span>` : ""
      ).join("")}</div><small>${w.label}</small></div>`
    )
    .join("")}</div>`;
  $("#legend").innerHTML = ["Account Executive", "Nurture", "Regional partner", "Disqualify"].map((r) => `<span><i class="${ROUTE_CLS[r]}"></i>${r}</span>`).join("");

  const buckets = [["< 15 min", 0, 15], ["15-60 min", 15, 60], ["1-4 h", 60, 240], ["4 h +", 240, 1e9]];
  const bc = buckets.map(([n, a, b]) => [n, resp.filter((m) => m >= a && m < b).length]);
  const bmax = Math.max(...bc.map((b) => b[1]), 1);
  $("#respHist").innerHTML = bc.map(([n, c], i) => `<div class="hrow"><span>${n}</span><span class="htrack"><span class="h${i}" style="width:${(c / bmax) * 100}%"></span></span><b>${c}</b></div>`).join("");

  $("#slaGrade").innerHTML = ["A", "B", "C", "D"]
    .map((g) => {
      const list = slaDone.filter((x) => x.score.grade === g);
      const ok = list.filter((x) => x.sla.state === "met").length;
      const p = list.length ? Math.round((ok / list.length) * 100) : 0;
      return `<div class="hrow"><span><span class="gdot g${g}">${g}</span> ${R.fmtMinutes(R.SLA_MIN[g])}</span><span class="htrack"><span class="${p >= 80 ? "h0" : p >= 50 ? "h2" : "h3"}" style="width:${p}%"></span></span><b>${list.length ? p + "%" : "-"}</b></div>`;
    })
    .join("");

  const split = {};
  withInfo.forEach((x) => (split[x.route.route] = (split[x.route.route] || 0) + 1));
  let acc = 0;
  const colors = { ae: "#2563eb", nur: "#f59e0b", par: "#8b5cf6", dq: "#94a3b8" };
  const segs = Object.entries(split).map(([r, n]) => {
    const start = acc;
    acc += (n / leads.length) * 360;
    return `${colors[ROUTE_CLS[r]]} ${start}deg ${acc}deg`;
  });
  $("#routeSplit").innerHTML = `<div class="donut-wrap"><div class="donut" style="background:conic-gradient(${segs.join(",")})"><span>${leads.length}<small>leads</small></span></div>
    <ul>${Object.entries(split).map(([r, n]) => `<li><i class="${ROUTE_CLS[r]}"></i>${r}<b>${n}</b></li>`).join("")}</ul></div>`;

  const table = (rows) =>
    `<thead><tr><th></th><th>Leads</th><th>Qualified</th><th>Meetings</th><th>Lead → meeting</th></tr></thead><tbody>${rows
      .map((g) => `<tr><td>${esc(g.key)}</td><td>${g.leads}</td><td>${g.qualified}</td><td>${g.meetings}</td><td><span class="pbar"><span style="width:${(g.meetings / g.leads) * 100}%"></span></span>${Math.round((g.meetings / g.leads) * 100)}%</td></tr>`)
      .join("")}</tbody>`;
  $("#bySource").innerHTML = table(R.groupConversion(leads, "source"));
  $("#byIndustry").innerHTML = table(R.groupConversion(leads, "industry").slice(0, 8));
}

// ---------------- add form ----------------
function formLead() {
  return Object.fromEntries(new FormData($("#addForm")));
}
function renderPreview() {
  const l = formLead();
  const s = R.scoreLead(l);
  const r = R.routeLead(l, s);
  $("#preview").innerHTML = `<h3>Live score</h3><div class="big-score g${s.grade}"><b>${s.total}</b><span>grade ${s.grade}</span></div>
    ${bars(s.parts)}<p><span class="route big ${ROUTE_CLS[r.route]}">${r.route}</span></p><p class="muted">${esc(r.reason)}</p>
    <p class="muted">First reply due within <b>${R.fmtMinutes(R.SLA_MIN[s.grade])}</b></p>`;
}

// ---------------- csv ----------------
function exportCSV() {
  const cols = ["id", "receivedAt", "firstResponseAt", "company", "name", "title", "email", "industry", "companySize", "region", "source", "budget", "timeline", "status", "route", "score", "grade", "message"];
  const q = (v) => (/[",\n]/.test(String(v ?? "")) ? `"${String(v).replace(/"/g, '""')}"` : v ?? "");
  const rows = leads.map((l) => {
    const { score, route } = info(l);
    return cols.map((c) => q(c === "score" ? score.total : c === "grade" ? score.grade : c === "route" ? route.route : l[c])).join(",");
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([[cols.join(","), ...rows].join("\n")], { type: "text/csv" }));
  a.download = "inbound-leads.csv";
  a.click();
}

// ---------------- wiring ----------------
function renderAll() {
  renderList();
  renderDetail();
  renderFollowups();
  renderDashboard();
}

function fill(sel, list) {
  sel.replaceChildren(...list.map((v) => new Option(v, v)));
}

function init() {
  const f = $("#addForm");
  fill(f.elements.industry, R.ALL_INDUSTRIES);
  fill(f.elements.companySize, R.SIZES);
  fill(f.elements.region, R.REGIONS);
  fill(f.elements.source, R.SOURCES);
  fill(f.elements.budget, R.BUDGETS);
  fill(f.elements.timeline, R.TIMELINES);
  f.elements.industry.value = "Oil & Gas";
  f.elements.companySize.value = "1000-4999";
  f.elements.budget.value = "Budget being planned";
  f.elements.timeline.value = "This quarter";
  f.addEventListener("input", renderPreview);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const l = formLead();
    l.id = "L" + Date.now().toString().slice(-6);
    l.receivedAt = new Date().toISOString();
    l.status = "New";
    l.firstResponseAt = null;
    l.route = null;
    l.followUps = [];
    l.notes = "";
    leads.unshift(l);
    selected = l.id;
    persist();
    switchTab("inbox");
    toast("Added. SLA timer started.");
  });
  fill($("#statusFilter"), ["", ...R.STATUSES]);
  $("#statusFilter").options[0].text = "Any status";

  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) switchTab(b.dataset.tab);
  });
  $("#q").addEventListener("input", (e) => { ui.q = e.target.value; renderList(); });
  $("#statusFilter").addEventListener("change", (e) => { ui.status = e.target.value; renderList(); });
  $("#gradeFilter").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    ui.grade = b.dataset.g;
    document.querySelectorAll("#gradeFilter button").forEach((x) => x.classList.toggle("on", x === b));
    renderList();
  });
  $("#leadList").addEventListener("click", (e) => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;
    selected = li.dataset.id;
    renderList();
    renderDetail();
  });

  $("#detail").addEventListener("change", (e) => {
    const l = leads.find((x) => x.id === selected);
    if (e.target.id === "routeSel") {
      l.route = e.target.value;
      l.owner = e.target.value === "Account Executive" ? R.aeFor(l) : e.target.value === "Regional partner" ? R.PARTNERS[l.region] || "Regional partner" : e.target.value === "Nurture" ? "Marketing" : "BDR";
      if (l.firstResponseAt) l.followUps = R.buildFollowUps(l.route, new Date().toISOString());
      persist();
    }
    if (e.target.id === "statusSel") { l.status = e.target.value; persist(); }
    if (e.target.dataset.step != null) { l.followUps[e.target.dataset.step].done = e.target.checked; persist(); }
    if (e.target.id === "notes") { l.notes = e.target.value; save(leads); renderDetail(); }
  });
  $("#detail").addEventListener("click", (e) => {
    const l = leads.find((x) => x.id === selected);
    if (e.target.id === "sendBtn") {
      const { route } = info(l);
      l.firstResponseAt = new Date().toISOString();
      l.route = route.route;
      l.owner = route.owner;
      l.status = route.route === "Disqualify" ? "Disqualified" : route.route.includes("artner") ? "Handed to partner" : route.route === "Nurture" ? "Nurture" : "Contacted";
      l.followUps = R.buildFollowUps(route.route, l.firstResponseAt);
      l.followUps[0].done = true;
      persist();
      toast("Reply logged, sequence started");
    }
    if (e.target.dataset.copy) {
      const txt = e.target.dataset.copy === "reply" ? $("#replyText").value : $("#handoffText").textContent;
      navigator.clipboard?.writeText(txt).then(() => toast("Copied"), () => toast("Copy failed, select and copy manually"));
    }
  });
  $("#fuBoard").addEventListener("click", (e) => {
    if (e.target.dataset.fu) {
      const [id, i] = e.target.dataset.fu.split(":");
      leads.find((l) => l.id === id).followUps[i].done = true;
      persist();
      toast("Step done");
    }
    if (e.target.dataset.open) {
      selected = e.target.dataset.open;
      switchTab("inbox");
      renderAll();
    }
  });
  $("#exportBtn").addEventListener("click", exportCSV);
  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("Reset to the sample leads?")) return;
    leads = reset();
    selected = leads[0].id;
    renderAll();
  });

  renderAll();
  renderPreview();
  // keep the SLA timers moving
  setInterval(renderList, 30000);
}

function switchTab(name) {
  document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x.dataset.tab === name));
  document.querySelectorAll(".tab").forEach((s) => s.classList.toggle("active", s.id === name));
}

init();
