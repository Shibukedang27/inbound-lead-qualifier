// Made-up inbound enquiries for a made-up drone autonomy company (Aerovane Autonomy).
// Every company, person and email here is fictional.
import { scoreLead, routeLead, buildFollowUps } from "./rules.js";

const RAW = [
  ["Meera Nair", "Head of Asset Management", "meera.nair@sunridgepower.in", "Sunridge Power", "Energy & Utilities", "5000+", "India", "Demo request form", "Budget being planned", "This quarter",
    "We run 14 solar plants and 40 substations across Rajasthan and Gujarat. Manual thermal inspection takes weeks. Looking for docked drones that can do scheduled thermal inspection, budget for a pilot is being finalised this quarter."],
  ["Arjun Rao", "Security Manager", "arjun.rao@deccanports.com", "Deccan Ports Ltd", "Ports & Logistics Hubs", "1000-4999", "India", "Website chat", "Budget being planned", "3-6 months",
    "Need perimeter patrol at night for our container yard, around 6 km fence. Intrusion alerts from cameras should trigger a drone. Can you share pricing?"],
  ["Kavya Iyer", "Mining Engineer", "kavya.iyer@redstonemin.com", "Redstone Minerals", "Mining", "1000-4999", "India", "Webinar sign-up", "Not shared", "6-12 months",
    "Attended the webinar. Our survey team measures stockpile volume manually every week at 3 mines. Interested in how mapping works."],
  ["Daniel Brooks", "VP Operations", "dbrooks@ironvalecopper.com", "Ironvale Copper", "Mining", "5000+", "North America", "Trade show", "Budget approved", "3-6 months",
    "Met your team at the expo. We want autonomous drone-in-a-box for tailings dam monitoring and pit survey at 2 sites. RFP goes out next month, would like a call before."],
  ["Fatima Al Suwaidi", "Director, HSE", "fatima@gulfpetroleum.ae", "Gulf Petroleum Services", "Oil & Gas", "5000+", "Middle East", "Demo request form", "Budget being planned", "3-6 months",
    "Looking at drones for pipeline inspection and leak detection over 300 km of pipeline. Want BVLOS capable system."],
  ["Rohit Sharma", "Student", "rohit.s2004@gmail.com", "NIT Warangal", "Education", "1-49", "India", "Website chat", "Not shared", "Just exploring",
    "Hi I am a final year student, are there any internship openings? I have built a quadcopter for my project."],
  ["Laura Fischer", "Innovation Lead", "l.fischer@nordnetz.de", "NordNetz", "Energy & Utilities", "1000-4999", "Europe", "Inbound email", "Budget being planned", "6-12 months",
    "We are exploring automated inspection of transmission lines. Early stage, collecting info from vendors for next year's budget."],
  ["Suresh Babu", "Plant Head", "suresh.b@coastalcement.in", "Coastal Cement", "Manufacturing", "200-999", "India", "Demo request form", "No budget yet", "Just exploring",
    "Want to know if drones can do stockpile volume for limestone and coal yard."],
  ["Nguyen Van An", "Operations Director", "an.nguyen@mekongenergy.vn", "Mekong Energy", "Energy & Utilities", "1000-4999", "Southeast Asia", "Partner referral", "Budget approved", "This quarter",
    "Referred by a partner. We have 8 hydro and solar sites and need autonomous thermal inspection plus security patrols. Ready to start a pilot."],
  ["Ankit Verma", "Business Owner", "ankit@skyvisiondrones.in", "SkyVision Drones", "Other", "1-49", "India", "Inbound email", "Not shared", "Just exploring",
    "We are a drone services company in Pune and want to become a reseller / distributor for your docks in Maharashtra."],
  ["Priyanka Das", "Chief Security Officer", "priyanka.das@metrorailcorp.in", "Metro Rail Corp", "Critical Infrastructure", "5000+", "India", "Demo request form", "Budget being planned", "This quarter",
    "We need patrols along depot perimeter and inspection of elevated track sections. 4 depots. Tender is being drafted, want a demo urgently."],
  ["Tom Walsh", "Site Superintendent", "twalsh@buildright.com.au", "BuildRight Constructions", "Construction", "200-999", "Australia", "Webinar sign-up", "No budget yet", "6-12 months",
    "Interested in progress mapping on a large highway project. Mostly curious about cost."],
  ["Grace Mwangi", "Operations Manager", "grace.m@rift-geothermal.co.ke", "Rift Geothermal", "Energy & Utilities", "200-999", "Africa", "Inbound email", "Not shared", "6-12 months",
    "Exploring drones for inspection of our geothermal pipelines and wells. Just collecting information."],
  ["Vikram Singh", "Head of Security", "vikram.singh@aravallisteel.com", "Aravalli Steel", "Security", "5000+", "India", "Demo request form", "Budget approved", "This quarter",
    "Plant has a 12 km perimeter and we face regular trespass. Want autonomous patrol drones launched from docks with thermal at night. Approved budget, need to move this quarter."],
  ["Emily Carter", "Analyst", "emily.carter@gmail.com", "Freelance", "Other", "1-49", "North America", "Website chat", "Not shared", "Just exploring",
    "Do you sell to individuals? Looking for a drone for my farm."],
  ["Rahul Menon", "GM Projects", "rahul.menon@southernwater.in", "Southern Water Board", "Critical Infrastructure", "1000-4999", "India", "Trade show", "Budget being planned", "3-6 months",
    "We manage canals and 22 pumping stations. Interested in regular inspection flights and flood response mapping."],
  ["Sofia Ramirez", "Gerente de Operaciones", "sramirez@andescobre.cl", "Andes Cobre", "Mining", "1000-4999", "Latin America", "Demo request form", "Budget being planned", "3-6 months",
    "Need stockpile volume and pit survey automation at 2 mines in Chile."],
  ["Harish Kumar", "Engineer, O&M", "harish.k@greenwindenergy.in", "GreenWind Energy", "Energy & Utilities", "200-999", "India", "Webinar sign-up", "Not shared", "6-12 months",
    "Can drones inspect wind turbine blades for defects? We have about 120 turbines."],
  ["Oliver Grant", "Head of Innovation", "ogrant@northseaoffshore.co.uk", "North Sea Offshore", "Oil & Gas", "5000+", "Europe", "Inbound email", "Budget approved", "3-6 months",
    "Looking for BVLOS autonomous inspection on 3 offshore platforms. Budget approved for a trial next quarter."],
  ["Neha Kulkarni", "Agronomist", "neha.k@farmfresh.in", "FarmFresh Agro", "Agriculture", "50-199", "India", "Website chat", "No budget yet", "Just exploring",
    "Do you do crop spraying drones?"],
  ["Sanjay Patil", "Director Operations", "sanjay.patil@konkanlogistics.in", "Konkan Logistics Park", "Ports & Logistics Hubs", "200-999", "India", "Demo request form", "Budget being planned", "3-6 months",
    "We run a 200 acre logistics park. Night security rounds are a problem. Want to see drone patrol with alerts."],
  ["Aisha Bello", "Security Lead", "aisha.bello@lagosterminal.ng", "Lagos Container Terminal", "Ports & Logistics Hubs", "1000-4999", "Africa", "Trade show", "Budget being planned", "This quarter",
    "Met at the trade show. Need perimeter patrol and intrusion detection at our terminal, 5 km fence."],
  ["Deepak Joshi", "Manager - Telecom Infra", "deepak.joshi@towerlink.in", "TowerLink Infra", "Telecom", "1000-4999", "India", "Inbound email", "Not shared", "6-12 months",
    "We have 3000 towers. Want to understand tower inspection using drones."],
  ["Chloe Martin", "Procurement Officer", "c.martin@alpineutilities.fr", "Alpine Utilities", "Energy & Utilities", "1000-4999", "Europe", "Demo request form", "Budget approved", "This quarter",
    "We have issued an RFP for substation inspection drones with docking. Please send product details and request a demo."],
  ["Imran Qureshi", "Head - Mine Planning", "imran.q@deccancoal.in", "Deccan Coal Fields", "Mining", "5000+", "India", "Website chat", "Budget being planned", "This quarter",
    "Daily stockpile volume and haul road survey at 5 mines. Want drone-in-a-box. Need pilot by March."],
  ["Lucas Silva", "Coordinator", "lucas@brasilsolar.com.br", "Brasil Solar", "Energy & Utilities", "50-199", "Latin America", "Webinar sign-up", "No budget yet", "Just exploring",
    "Interested in solar panel thermal inspection, small company."],
];

// statuses that make sense for each route once a lead has been worked
const LATER = {
  "Account Executive": ["Meeting booked", "Opportunity", "Qualified", "Meeting booked", "Contacted"],
  Nurture: ["Nurture", "Nurture", "Contacted"],
  "Regional partner": ["Handed to partner"],
  "Partner team": ["Handed to partner"],
  Disqualify: ["Disqualified"],
};

function rng(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

export function buildSample(now = Date.now()) {
  const r = rng(1027);
  const leads = RAW.map((x, i) => {
    const [name, title, email, company, industry, companySize, region, source, budget, timeline, message] = x;
    return { id: "L" + (1001 + i), name, title, email, company, industry, companySize, region, source, budget, timeline, message, notes: "" };
  });

  // a few fresh ones still waiting for a first reply so the SLA timers are live
  const freshIdx = [0, 3, 13, 5, 7, 18];
  const freshAgo = [6, 11, 52, 95, 170, 30];

  leads.forEach((l, i) => {
    const score = scoreLead(l);
    const route = routeLead(l, score);
    const f = freshIdx.indexOf(i);
    if (f >= 0) {
      l.receivedAt = new Date(now - freshAgo[f] * 60000).toISOString();
      l.status = "New";
      l.firstResponseAt = null;
      l.route = null;
      l.followUps = [];
      return;
    }
    const daysAgo = 1 + Math.floor(r() * 40);
    const received = now - daysAgo * 86400000 - Math.floor(r() * 8) * 3600000;
    // most replies are quick, a few are slow so the SLA chart is honest
    const slow = r() < 0.18;
    const respMin = slow ? 90 + Math.floor(r() * 600) : 4 + Math.floor(r() * (score.grade === "A" ? 12 : 50));
    l.receivedAt = new Date(received).toISOString();
    l.firstResponseAt = new Date(received + respMin * 60000).toISOString();
    l.route = route.route;
    l.owner = route.owner;
    const opts = LATER[route.route];
    l.status = opts[Math.floor(r() * opts.length)];
    l.followUps = buildFollowUps(route.route, l.firstResponseAt).map((s) => ({ ...s, done: new Date(s.due).getTime() < now - 86400000 ? r() < 0.85 : false }));
  });

  return leads.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
