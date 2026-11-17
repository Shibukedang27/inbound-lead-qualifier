import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../js/rules.js";
import { buildSample } from "../js/sample.js";

const base = {
  name: "Test Person",
  title: "Head of Operations",
  email: "test@bigpower.in",
  company: "Big Power",
  industry: "Energy & Utilities",
  companySize: "5000+",
  region: "India",
  source: "Demo request form",
  budget: "Budget approved",
  timeline: "This quarter",
  message: "We have 12 substations and want thermal inspection with docked drones.",
};

test("strong energy lead scores A and goes to an AE", () => {
  const s = R.scoreLead(base);
  assert.equal(s.grade, "A");
  const r = R.routeLead(base, s);
  assert.equal(r.route, "Account Executive");
  assert.match(r.owner, /Priya/);
});

test("use cases are picked up from the message", () => {
  const uses = R.detectUseCases("need perimeter patrol and stockpile survey").map((u) => u.key);
  assert.deepEqual(uses, ["perimeter", "survey"]);
});

test("students and job seekers are disqualified", () => {
  const l = { ...base, title: "Student", email: "a@gmail.com", message: "any internship openings?" };
  assert.equal(R.routeLead(l).route, "Disqualify");
});

test("resellers go to the partner team", () => {
  const l = { ...base, message: "We want to be a distributor for your docks" };
  assert.equal(R.routeLead(l).route, "Partner team");
});

test("good lead in a partner region goes to the regional partner", () => {
  const l = { ...base, region: "Middle East" };
  const r = R.routeLead(l);
  assert.equal(r.route, "Regional partner");
  assert.equal(r.owner, R.PARTNERS["Middle East"]);
});

test("good fit but far-off timeline goes to nurture", () => {
  const l = { ...base, budget: "Not shared", timeline: "6-12 months" };
  const s = R.scoreLead(l);
  assert.ok(s.total >= 55, "still a decent score");
  assert.equal(R.routeLead(l, s).route, "Nurture");
});

test("personal email gets a small penalty", () => {
  const a = R.scoreLead(base).total;
  const b = R.scoreLead({ ...base, email: "x@gmail.com" }).total;
  assert.equal(a - b, Math.min(8, a));
});

test("sla states", () => {
  const now = Date.parse("2026-11-17T10:00:00Z");
  const lead = { receivedAt: "2026-11-17T09:50:00Z" };
  assert.equal(R.slaStatus(lead, "A", now).state, "open");
  assert.equal(R.slaStatus(lead, "A", now + 4 * 60000).state, "at-risk");
  assert.equal(R.slaStatus(lead, "A", now + 10 * 60000).state, "breached");
  assert.equal(R.slaStatus({ ...lead, firstResponseAt: "2026-11-17T09:58:00Z" }, "A").state, "met");
  assert.equal(R.slaStatus({ ...lead, firstResponseAt: "2026-11-17T10:30:00Z" }, "A").state, "missed");
});

test("follow-up sequence dates", () => {
  const steps = R.buildFollowUps("Account Executive", "2026-11-17T10:00:00Z");
  assert.equal(steps.length, 4);
  assert.equal(steps[2].due, "2026-11-20T10:00:00.000Z");
});

test("reply and handoff mention the right things", () => {
  const s = R.scoreLead(base);
  const r = R.routeLead(base, s);
  const reply = R.draftReply(base, s, r);
  assert.match(reply, /^Hi Test,/);
  assert.match(reply, /asset inspection/);
  assert.match(R.handoffCard(base, s, r), /Score: \d+\/100/);
});

test("funnel only goes down", () => {
  const f = R.funnel(buildSample(Date.parse("2026-11-17T10:00:00Z")));
  for (let i = 1; i < f.length; i++) assert.ok(f[i].n <= f[i - 1].n);
});

test("median", () => {
  assert.equal(R.median([5, 1, 3]), 3);
  assert.equal(R.median([1, 2, 3, 4]), 3);
  assert.equal(R.fmtMinutes(95), "1h 35m");
});
