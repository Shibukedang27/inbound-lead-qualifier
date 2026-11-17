// All the scoring and routing rules live here. No DOM, so it is easy to test.
// The weights are my own guesses at what a BDR would care about for a drone
// autonomy product sold to enterprise teams. Tweak them in one place.

export const INDUSTRIES = {
  core: ["Energy & Utilities", "Oil & Gas", "Mining", "Security", "Critical Infrastructure", "Ports & Logistics Hubs"],
  adjacent: ["Construction", "Agriculture", "Telecom", "Manufacturing", "Public Safety"],
  other: ["Education", "Media", "Retail", "Other"],
};
export const ALL_INDUSTRIES = [...INDUSTRIES.core, ...INDUSTRIES.adjacent, ...INDUSTRIES.other];

export const SIZES = ["1-49", "50-199", "200-999", "1000-4999", "5000+"];
export const BUDGETS = ["Budget approved", "Budget being planned", "No budget yet", "Not shared"];
export const TIMELINES = ["This quarter", "3-6 months", "6-12 months", "Just exploring"];
export const SOURCES = ["Demo request form", "Website chat", "Webinar sign-up", "Trade show", "Inbound email", "Partner referral"];

export const DIRECT_REGIONS = ["India", "North America", "Europe", "Australia"];
export const PARTNER_REGIONS = ["Middle East", "Africa", "Southeast Asia", "Latin America"];
export const REGIONS = [...DIRECT_REGIONS, ...PARTNER_REGIONS];

// regional partners that cover markets we do not sell into directly (made up)
export const PARTNERS = {
  "Middle East": "Falcon Gulf Systems",
  Africa: "SavannaSky Robotics",
  "Southeast Asia": "Archipelago Aerial",
  "Latin America": "Andes Drone Works",
};

// words in the enquiry that tell us what they actually want to do
export const USE_CASES = [
  { key: "inspection", words: ["inspect", "inspection", "thermal", "hotspot", "corrosion", "defect"], label: "asset inspection" },
  { key: "perimeter", words: ["perimeter", "patrol", "intrusion", "fence", "trespass", "security rounds"], label: "perimeter security patrols" },
  { key: "survey", words: ["survey", "stockpile", "volume", "mapping", "topograph", "tailings", "pit"], label: "site survey and stockpile measurement" },
  { key: "linear", words: ["pipeline", "power line", "transmission", "railway", "track", "canal"], label: "long linear asset monitoring" },
  { key: "dock", words: ["dock", "drone-in-a-box", "remote ops", "bvlos", "beyond visual", "autonomous"], label: "docked autonomous flights (BVLOS)" },
  { key: "emergency", words: ["emergency", "incident", "fire", "flood", "response"], label: "incident response" },
];

const SENIOR = ["chief", "cxo", "ceo", "cto", "coo", "vp", "vice president", "director", "head"];
const MID = ["manager", "lead", "superintendent", "in-charge", "incharge", "officer"];
const JUNIOR = ["engineer", "analyst", "executive", "specialist", "coordinator", "associate"];
const NOT_BUYER = ["student", "intern", "researcher", "freelance", "hobby"];

const URGENT_WORDS = ["urgent", "asap", "rfp", "tender", "pilot", "this month", "deadline", "po "];
const EARLY_WORDS = ["exploring", "collecting info", "just curious", "mostly curious", "early stage"];
const JUNK_WORDS = ["job", "internship", "resume", "cv", "career", "vacancy"];
const RESELL_WORDS = ["reseller", "distributor", "dealership", "partner with you", "resell"];
const FREE_MAIL = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "rediffmail.com"];

const has = (text, words) => words.some((w) => text.includes(w));

export function detectUseCases(message = "") {
  const t = message.toLowerCase();
  return USE_CASES.filter((u) => has(t, u.words));
}

export function scoreLead(lead) {
  const msg = (lead.message || "").toLowerCase();
  const title = (lead.title || "").toLowerCase();
  const domain = (lead.email || "").split("@")[1] || "";
  const notes = [];

  // FIT (30): industry + company size
  let industry = 3;
  if (INDUSTRIES.core.includes(lead.industry)) industry = 20;
  else if (INDUSTRIES.adjacent.includes(lead.industry)) industry = 11;
  const sizePts = { "1-49": 1, "50-199": 4, "200-999": 7, "1000-4999": 9, "5000+": 10 }[lead.companySize] ?? 2;
  const fit = industry + sizePts;
  notes.push(`${lead.industry || "Unknown industry"} (${industry}/20), ${lead.companySize || "?"} people (${sizePts}/10)`);

  // NEED (25): clear use case in their own words
  const uses = detectUseCases(lead.message);
  let need = Math.min(18, uses.length * 9);
  if (/\b\d+\s*(sites|plants|substations|mines|km|locations|towers)\b/.test(msg)) need += 7;
  else if (msg.length > 120) need += 3;
  need = Math.min(25, need);
  notes.push(uses.length ? `Use case: ${uses.map((u) => u.label).join(", ")}` : "No clear use case in the message");

  // URGENCY / TIMELINE (20)
  let urgency = { "This quarter": 16, "3-6 months": 11, "6-12 months": 6, "Just exploring": 2 }[lead.timeline] ?? 4;
  if (has(msg, URGENT_WORDS)) urgency += 4;
  if (has(msg, EARLY_WORDS)) urgency -= 4;
  urgency = Math.max(0, Math.min(20, urgency));

  // BUDGET (15)
  let budget = { "Budget approved": 15, "Budget being planned": 10, "No budget yet": 3, "Not shared": 5 }[lead.budget] ?? 5;
  if (lead.budget !== "Budget approved" && has(msg, ["rfp", "tender", "purchase order", "procure"])) budget = Math.max(budget, 12);

  // AUTHORITY (10)
  let authority = 3;
  if (has(title, SENIOR)) authority = 10;
  else if (has(title, MID)) authority = 7;
  else if (has(title, JUNIOR)) authority = 4;
  if (has(title, NOT_BUYER)) authority = 0;

  const flags = [];
  if (has(msg, JUNK_WORDS) || has(title, ["student", "intern"])) flags.push("job-or-student");
  if (has(msg, RESELL_WORDS)) flags.push("reseller");
  if (FREE_MAIL.includes(domain)) flags.push("free-email");

  let total = fit + need + urgency + budget + authority;
  if (flags.includes("free-email")) total -= 8;
  total = Math.max(0, Math.min(100, total));

  return { total, grade: grade(total), parts: { fit, need, urgency, budget, authority }, uses, flags, notes };
}

export function grade(total) {
  if (total >= 75) return "A";
  if (total >= 55) return "B";
  if (total >= 35) return "C";
  return "D";
}

// who should own this lead next
export function routeLead(lead, score = scoreLead(lead)) {
  if (score.flags.includes("job-or-student")) {
    return { route: "Disqualify", owner: "BDR", reason: "Job or student enquiry, send careers / education page" };
  }
  if (score.flags.includes("reseller")) {
    return { route: "Partner team", owner: "Channel team", reason: "Wants to resell, goes to the channel team" };
  }
  if (PARTNER_REGIONS.includes(lead.region)) {
    if (score.total >= 50) {
      return { route: "Regional partner", owner: PARTNERS[lead.region], reason: `Good fit but ${lead.region} is covered by ${PARTNERS[lead.region]}` };
    }
    return { route: "Nurture", owner: "Marketing", reason: `Early stage, ${lead.region} partner can pick up later` };
  }
  const soon = ["This quarter", "3-6 months"].includes(lead.timeline) || lead.budget === "Budget approved";
  if (score.total >= 70 && soon) return { route: "Account Executive", owner: aeFor(lead), reason: "Strong fit, clear need and near-term timeline" };
  if (score.total >= 70) return { route: "Nurture", owner: "Marketing", reason: "Good fit but buying is 6+ months out, nurture and recheck" };
  if (score.total >= 55 && (lead.timeline === "This quarter" || lead.budget === "Budget approved")) {
    return { route: "Account Executive", owner: aeFor(lead), reason: "Mid score but they have budget or want to move this quarter" };
  }
  if (score.total >= 30) return { route: "Nurture", owner: "Marketing", reason: "Interested but not ready, keep warm with useful content" };
  return { route: "Nurture", owner: "Marketing", reason: "Low fit, light-touch newsletter track" };
}

// AE territory split (made up)
export function aeFor(lead) {
  if (lead.region === "India") return INDUSTRIES.core.slice(0, 3).includes(lead.industry) ? "Priya (AE, India energy & mining)" : "Karan (AE, India infra & security)";
  if (lead.region === "North America") return "Jordan (AE, North America)";
  if (lead.region === "Europe") return "Lena (AE, Europe)";
  return "Sam (AE, ANZ)";
}

// first response targets in minutes, tighter for better leads
export const SLA_MIN = { A: 15, B: 60, C: 240, D: 1440 };

export function slaStatus(lead, grade, now = Date.now()) {
  const limit = SLA_MIN[grade] * 60000;
  const start = new Date(lead.receivedAt).getTime();
  if (lead.firstResponseAt) {
    const took = new Date(lead.firstResponseAt).getTime() - start;
    return { state: took <= limit ? "met" : "missed", minutes: Math.round(took / 60000), limitMin: SLA_MIN[grade] };
  }
  const left = start + limit - now;
  let state = "open";
  if (left < 0) state = "breached";
  else if (left < limit * 0.25) state = "at-risk";
  return { state, minutesLeft: Math.round(left / 60000), limitMin: SLA_MIN[grade] };
}

export function fmtMinutes(m) {
  const a = Math.abs(m);
  if (a < 60) return `${a}m`;
  if (a < 1440) return a % 60 ? `${Math.floor(a / 60)}h ${a % 60}m` : `${a / 60}h`;
  return a % 1440 >= 60 ? `${Math.floor(a / 1440)}d ${Math.floor((a % 1440) / 60)}h` : `${Math.floor(a / 1440)}d`;
}

// follow-up steps per route, day offsets from the first reply
export const SEQUENCES = {
  "Account Executive": [
    { day: 0, what: "Reply with 2-3 time slots and a short agenda" },
    { day: 1, what: "Warm intro email to the AE with the handoff card" },
    { day: 3, what: "Call if no meeting booked yet" },
    { day: 7, what: "Last check-in, share a case study from their industry" },
  ],
  Nurture: [
    { day: 0, what: "Reply with a relevant case study" },
    { day: 5, what: "Send a short use-case video for their industry" },
    { day: 14, what: "Invite to the next webinar / site demo day" },
    { day: 30, what: "Check if timeline or budget has changed" },
  ],
  "Regional partner": [
    { day: 0, what: "Reply and explain the local partner will reach out" },
    { day: 1, what: "Send lead details to the partner" },
    { day: 5, what: "Confirm partner has contacted them" },
  ],
  "Partner team": [
    { day: 0, what: "Reply and forward to channel team" },
    { day: 3, what: "Check channel team picked it up" },
  ],
  Disqualify: [{ day: 0, what: "Polite reply with the right link" }],
};

export function buildFollowUps(route, fromIso) {
  const base = new Date(fromIso).getTime();
  return (SEQUENCES[route] || []).map((s, i) => ({
    step: i + 1,
    what: s.what,
    due: new Date(base + s.day * 86400000).toISOString(),
    done: false,
  }));
}

const INDUSTRY_LINES = {
  "Energy & Utilities": "Most utility teams we talk to start by replacing manual walk-downs at substations and solar plants with scheduled thermal flights.",
  "Oil & Gas": "For oil and gas sites the quick win is usually routine leak and corrosion checks along pipelines without sending crews out every time.",
  Mining: "Mining teams mostly use it for daily stockpile volumes and pit / tailings checks, so the survey team gets numbers without climbing the stockpile.",
  Security: "Security teams usually set up automatic patrol routes that launch from a dock when an alarm or camera picks up something on the fence line.",
  "Critical Infrastructure": "On critical sites the main ask is repeatable, logged inspections that run on schedule even when the team is stretched.",
  "Ports & Logistics Hubs": "At ports and large yards the drones mostly do perimeter rounds at night and quick yard counts during the day.",
};

export function draftReply(lead, score, route) {
  const first = (lead.name || "there").split(" ")[0];
  const useLine = score.uses.length
    ? `You mentioned ${score.uses.map((u) => u.label).join(" and ")}, which is exactly what our autonomy stack is built for.`
    : "I'd love to understand a bit more about what you're hoping to automate.";
  const indLine = INDUSTRY_LINES[lead.industry] || "Teams in your space often start with one site and one repeated mission, then expand once it works.";

  let ask;
  if (route.route === "Account Executive") ask = `Would a 30-minute call this week work? ${route.owner.split(" (")[0]}, who looks after ${lead.region}, can walk you through a live mission and talk about a pilot. Here are a few slots: Tue 11:00, Wed 15:00 or Thu 10:30 (your time).`;
  else if (route.route === "Regional partner") ask = `Since you're in ${lead.region}, our partner ${route.owner} handles deployments and support locally. I've shared your note with them and they'll reach out within one working day. I'll stay in the loop too.`;
  else if (route.route === "Partner team") ask = "I've passed this to our channel team who handles reseller partnerships. They'll be in touch with the partner programme details.";
  else if (route.route === "Disqualify") ask = "This inbox is for customer enquiries, but you can find open roles and student programmes on our careers page. All the best!";
  else ask = "No rush at all. I'll send over a short case study from a similar team, and when the timing is right we can set up a proper walkthrough.";

  const lines = [`Hi ${first},`, "", `Thanks for reaching out about ${lead.company}'s plans.`];
  if (route.route !== "Disqualify") lines.push(useLine, indLine);
  lines.push("", ask);
  if (route.route !== "Disqualify") lines.push("", "Quick question so we come prepared: how many sites are you looking at to start, and who else would be part of the decision?");
  lines.push("", "Best,", "Mithilesh", "Business Development, Aerovane Autonomy");
  return lines.join("\n");
}

export function handoffCard(lead, score, route) {
  const s = score.parts;
  return [
    `AE HANDOFF - ${lead.company}`,
    `Contact: ${lead.name}, ${lead.title} (${lead.email})`,
    `Industry / size / region: ${lead.industry} / ${lead.companySize} / ${lead.region}`,
    `Score: ${score.total}/100 (grade ${score.grade})  Fit ${s.fit}/30, Need ${s.need}/25, Urgency ${s.urgency}/20, Budget ${s.budget}/15, Authority ${s.authority}/10`,
    `Need: ${score.uses.map((u) => u.label).join(", ") || "not clear yet"}`,
    `Budget: ${lead.budget}   Timeline: ${lead.timeline}   Source: ${lead.source}`,
    `What they said: "${(lead.message || "").slice(0, 220)}${(lead.message || "").length > 220 ? "..." : ""}"`,
    `Why routed: ${route.reason}`,
    `Suggested next step: ${route.route === "Account Executive" ? "discovery call + pilot scoping on one site" : "-"}`,
    lead.notes ? `BDR notes: ${lead.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ----- reporting -----
export const STATUSES = ["New", "Contacted", "Qualified", "Meeting booked", "Opportunity", "Nurture", "Handed to partner", "Disqualified"];

export function funnel(leads) {
  const responded = leads.filter((l) => l.firstResponseAt);
  const qualified = leads.filter((l) => ["Qualified", "Meeting booked", "Opportunity", "Handed to partner"].includes(l.status));
  const meetings = leads.filter((l) => ["Meeting booked", "Opportunity"].includes(l.status));
  const opps = leads.filter((l) => l.status === "Opportunity");
  return [
    { name: "Received", n: leads.length },
    { name: "Responded", n: responded.length },
    { name: "Qualified", n: qualified.length },
    { name: "Meeting booked", n: meetings.length },
    { name: "Opportunity", n: opps.length },
  ];
}

export function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function responseMinutes(leads) {
  return leads
    .filter((l) => l.firstResponseAt)
    .map((l) => Math.round((new Date(l.firstResponseAt) - new Date(l.receivedAt)) / 60000));
}

export function groupConversion(leads, field) {
  const map = new Map();
  for (const l of leads) {
    const k = l[field] || "Unknown";
    const g = map.get(k) || { key: k, leads: 0, qualified: 0, meetings: 0 };
    g.leads++;
    if (["Qualified", "Meeting booked", "Opportunity", "Handed to partner"].includes(l.status)) g.qualified++;
    if (["Meeting booked", "Opportunity"].includes(l.status)) g.meetings++;
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => b.leads - a.leads);
}
