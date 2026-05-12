// Product Design case templates. V1 ships ONE case type per the requirements
// doc; multiple cases-per-type are listed here so the case-select screen has
// real choices. Each case is a self-contained prompt the interviewer LLM
// receives at session start.
//
// Prompts are intentionally MINIMAL — one sentence, no context, no hints,
// no probe questions. The interviewer reads this verbatim as the case
// statement and stops; the candidate's clarification turns are what drive
// the discovery of audience, needs, constraints. Adding context or hints
// here would short-circuit that — the candidate would skip the clarification
// step entirely.
//
// `brief` is the short display tag shown on the case-select UI.
// `evalRubric` is the load-bearing eval rubric consumed by the post-session
// coach prompt. It names the tension sides, what strong engagement on each
// side looks like, and the common miss. NEVER references frameworks by name.

export interface CaseTemplate {
  readonly id: string;
  readonly type: "product-design";
  readonly title: string;
  readonly brief: string;
  readonly prompt: string;
  /** Tension-grounded eval criteria consumed by the post-session coach prompt. */
  readonly evalRubric: string;
  /** Estimated session length in minutes. */
  readonly estimatedMinutes: number;
}

export const PRODUCT_DESIGN_CASES: ReadonlyArray<CaseTemplate> = [
  {
    id: "meditation-app",
    type: "product-design",
    title: "Design a meditation app for elderly users",
    brief: "Open-ended; candidate clarifies the audience and core need.",
    prompt: `Design a meditation app for elderly users.`,
    evalRubric: `Tensions: cognitive accessibility (clear UI, slow pacing, voice-over-touch input) vs content-fit (loss-processing, late-life reflection, and faith framing vs the youth-coded mindfulness-for-growth tone of incumbents). Strong engagement names a specific elderly sub-segment — homebound retirees, recent widowers, early-cognitive-decline — and reshapes BOTH interface and session content to that segment. Common miss: treating the case as a UI-accessibility problem only (bigger fonts, voice control) without questioning whether the meditation content itself needs to change.`,
    estimatedMinutes: 30,
  },
  {
    id: "spotify-kids",
    type: "product-design",
    title: "Design Spotify for kids under 10",
    brief: "Music + audio for elementary-school children. Candidate frames safety vs engagement.",
    prompt: `Design Spotify for kids under 10.`,
    evalRubric: `Tensions: safety (curation, ads, predator vectors, parental control) vs engagement (discovery, autonomy, kid-driven taste) vs the parent-as-buyer / child-as-user split. Strong engagement designs distinct surfaces for buyer and user, distinguishes a 6-year-old's listening from a 9-year-old's (control vs autonomy), and grapples with non-music audio (audiobooks, podcasts, sleep stories). Common miss: building "Spotify with a content filter" — treating it as filtering existing Spotify rather than reimagining the discovery model for kids.`,
    estimatedMinutes: 30,
  },
  {
    id: "airbnb-host-noshow",
    type: "product-design",
    title: "Help Airbnb hosts handle no-shows",
    brief: "Host-side feature. Candidate frames the signals + actions + payout angle.",
    prompt: `Design a feature for Airbnb hosts dealing with guest no-shows.`,
    evalRubric: `Tensions: host protection (lost income, calendar gap, cleaning sunk cost) vs guest grace (genuine emergencies, communication failures, partial-trip arrivals) vs platform liability. Strong engagement distinguishes detection signals (no check-in ping, no door-lock event, no message thread) from intervention design (auto-message, partial refund, calendar reopen, payout protection) and weighs the trade-off between speedy host compensation and false-positive damage to guest trust. Common miss: jumping straight to "charge them a fee" without surfacing the detection + policy chain that makes the charge fair.`,
    estimatedMinutes: 30,
  },
  {
    id: "calendar-for-deep-work",
    type: "product-design",
    title: "Design a calendar app for deep work",
    brief: "Protect focus time. Candidate frames meeting-defense vs scheduling.",
    prompt: `Design a calendar app for deep work.`,
    evalRubric: `Tensions: meeting defense (blocking, declining, batching) vs scheduling needs (collaboration, others' availability, urgency) vs the social cost of being unscheduleable. Strong engagement names a sharp deep-worker persona (engineer, writer, researcher) and addresses BOTH the personal-defense surface (auto-decline, focus modes, batching) AND the team coordination problem (how others find time without breaking the defense). Common miss: building a personal calendar that ignores the team-liquidity cost — strong PMs surface the trade-off between protection and coordination.`,
    estimatedMinutes: 30,
  },
  {
    id: "upi-small-merchants",
    type: "product-design",
    title: "Design a UPI feature for small merchants",
    brief: "Tier-2/3 kirana / street-vendor audience. Candidate frames reconciliation vs settlement vs trust.",
    prompt: `Design a feature on a UPI app to help small merchants accepting payments.`,
    evalRubric: `Tensions: reconciliation (matching each incoming UPI to a specific sale) vs settlement (cash-in-bank timing, working-capital lag) vs trust (confirming the buyer paid before handing over goods). Strong engagement frames the kirana / street-vendor reality — phone shared between merchant and cashier, no inventory system, multiple customers paying simultaneously — and weighs trade-offs across voice confirmation, sticker/QR placement, and end-of-day settlement summaries. Common miss: optimizing for a single-transaction confirmation flow that breaks the moment 4 customers pay in 90 seconds.`,
    estimatedMinutes: 30,
  },
  {
    id: "instagram-teen-wellbeing",
    type: "product-design",
    title: "Design Instagram for teen mental wellbeing",
    brief: "Social product, vulnerable audience. Candidate balances engagement metrics against harm.",
    prompt: `Design Instagram for teenagers' mental wellbeing.`,
    evalRubric: `Tensions: engagement metrics (time-spent, return rate, ad inventory) vs harm reduction (comparison anxiety, sleep disruption, body image, parasocial harm). Strong engagement names specific harm vectors backed by research (likes-as-validation, infinite scroll at bedtime, beauty-filter normalization), proposes interventions with stated trade-offs against engagement (nudges, defaults, gates), and resists the false binary "safer = less used." Common miss: shipping a parental-control toggle and calling it done — the real product question is what Instagram itself should do, not what parents should police.`,
    estimatedMinutes: 30,
  },
  {
    id: "maps-visual-impairment",
    type: "product-design",
    title: "Design Google Maps for visually impaired users",
    brief: "Accessibility-first. Candidate frames input modality, audio output, and navigation cues.",
    prompt: `Design Google Maps for visually impaired users.`,
    evalRubric: `Tensions: input modality (voice vs touch vs haptic) vs output channel (audio narration vs vibration patterns vs braille displays) vs context-awareness (indoor vs outdoor, transit vs walking, familiar vs new route). Strong engagement distinguishes the orientation problem (where am I, what's around) from the navigation problem (how do I get there) and reshapes both, with attention to street crossings, transit transfers, and indoor venues where GPS fails. Common miss: bolting voice-over onto the existing visual UI — a strong answer reimagines the information hierarchy for non-visual primary use.`,
    estimatedMinutes: 30,
  },
  {
    id: "homework-help-parents",
    type: "product-design",
    title: "Design an app for parents helping with homework",
    brief: "Indian-context edtech, parent (not student) as primary user. Candidate frames language, subject coverage, time constraints.",
    prompt: `Design an app for parents to help their school-age kids with homework.`,
    evalRubric: `Tensions: parent capability (language, subject knowledge, time available) vs child autonomy (learning by doing vs being shown) vs the moral hazard of "app does it for them." Strong engagement names the Indian-context constraints (parent comfortable in vernacular but homework in English, two working parents with 30 evening minutes, child resistance) and designs for parent-as-coach rather than parent-as-solver, with explicit refusal to be a homework-finishing tool. Common miss: building a doubt-solver that bypasses the parent entirely — defeats the case's stated user.`,
    estimatedMinutes: 30,
  },
  {
    id: "swiggy-delivery-partners",
    type: "product-design",
    title: "Design a peak-hours feature for Swiggy delivery partners",
    brief: "Marketplace supply side, two-wheeler riders. Candidate frames earnings vs rider safety vs restaurant readiness.",
    prompt: `Design a feature for Swiggy delivery partners during peak dinner hours.`,
    evalRubric: `Tensions: earnings (peak surge, more deliveries, longer hours) vs rider safety (fatigue, weather, traffic, rushed cooking pickups) vs restaurant readiness (the rider arriving to a 12-minute wait, blocking another order). Strong engagement separates rider-facing levers (queue visibility, fair surge, rest nudges, route batching) from restaurant-coordination levers (preparation signals, smart batching, delay communication) and grapples with the trade-off between maximizing rider earnings now vs sustainable retention. Common miss: optimizing delivery-speed metrics without addressing rider safety or the restaurant kitchen — the case tests whether the candidate sees all three sides.`,
    estimatedMinutes: 30,
  },
  {
    id: "linkedin-first-job-seekers",
    type: "product-design",
    title: "Design LinkedIn for first-time job seekers in India",
    brief: "Career-onset audience, network-poor. Candidate frames signal vs credentialism, application volume vs quality.",
    prompt: `Design a LinkedIn experience for first-time job seekers in India.`,
    evalRubric: `Tensions: signal (skills, projects, demonstrable work) vs credentialism (school name, company brand, referrals) vs application volume (hundreds of clicks vs few targeted) vs network gap (first-timers have no connections to leverage). Strong engagement names the credentialism trap (first-timers without brand-name schools are filtered out before signal is even seen) and proposes mechanics that surface signal earlier — portfolio over resume, peer endorsements, intro-via-content. Common miss: "better job recommendations" — algorithmic matching against a profile a first-timer cannot build yet.`,
    estimatedMinutes: 30,
  },
  {
    id: "ola-pool-shared-rides",
    type: "product-design",
    title: "Design Ola Pool to make shared rides more popular",
    brief: "Indian carpooling marketplace. Candidate frames passenger trust vs detour cost vs driver economics.",
    prompt: `Design Ola Pool to make shared rides more popular.`,
    evalRubric: `Tensions: passenger trust (sharing with strangers, gendered safety, timing reliability) vs detour cost (longer rides for the discount) vs driver economics (per-ride payout vs per-trip income, deadhead between drops). Strong engagement frames Ola Pool as a three-sided marketplace — rider, co-rider, driver — and addresses the trust problem (verified profiles, gender preference, in-cab safety) WITHOUT collapsing the design to "cheaper but worse Ola." Common miss: focusing only on rider price and skipping the driver-economics question — without driver buy-in the supply side collapses.`,
    estimatedMinutes: 30,
  },
  {
    id: "zomato-late-night-eaters",
    type: "product-design",
    title: "Design a Zomato feature for late-night food orderers",
    brief: "Post-midnight food delivery. Candidate frames restaurant availability vs delivery safety vs user state.",
    prompt: `Design a Zomato feature for people ordering food after midnight.`,
    evalRubric: `Tensions: restaurant availability (limited open kitchens, slim margins, staff fatigue) vs delivery safety (rider risk after midnight, sparse traffic, theft) vs user state heterogeneity (a drunk user, a stressed late-shift worker, and a panicked parent buying medicine have very different needs). Strong engagement segments the late-night user, addresses restaurant supply (curated 24x7 partners, ghost kitchens, simplified menus) AND rider safety (route restrictions, surge pay, panic button), and resists treating midnight as "dinner with a later clock." Common miss: shipping "extend operating hours" without surfacing why the supply and safety equation breaks down past 11 PM.`,
    estimatedMinutes: 30,
  },
  {
    id: "youtube-shorts-monetization",
    type: "product-design",
    title: "Design monetization for YouTube Shorts creators",
    brief: "Short-form creator income. Candidate frames view-quantity vs engagement-quality vs creator survival.",
    prompt: `Design a monetization feature for YouTube Shorts creators.`,
    evalRubric: `Tensions: view quantity (viral reach drives CPM logic) vs engagement quality (saves, follows, comments — but Shorts engagement is shallower than long-form) vs creator survival (creators need predictable income to keep producing, but Shorts ad inventory is structurally thinner). Strong engagement proposes a model that aligns creator incentive with the platform's long-term interest (retention, follow conversion, cross-format graduation) and addresses the trade-off between rev-share parity with long-form and the lower ad load of Shorts. Common miss: "just give them a cut of the ads" — ignores that Shorts ads exist barely enough to share.`,
    estimatedMinutes: 30,
  },
  {
    id: "duolingo-spoken-english-india",
    type: "product-design",
    title: "Design Duolingo for Indian adults learning spoken English",
    brief: "Adult learners, employment-driven. Candidate frames fluency vs grammar vs cultural context.",
    prompt: `Design a Duolingo experience for Indian adults learning spoken English.`,
    evalRubric: `Tensions: fluency (confident speaking under pressure, accent comfort, conversation flow) vs grammar (formal correctness, school-style rules) vs cultural context (interview English vs daily-conversation English vs phone-call-with-customer English). Strong engagement names a specific Indian adult learner (gig worker, call-center applicant, hospitality staff) and reshapes Duolingo's daily-streak game-loop for spoken practice over written, with attention to local accent confidence rather than American-standard pronunciation. Common miss: porting the existing Duolingo course library with a "speak this sentence" microphone bolt-on.`,
    estimatedMinutes: 30,
  },
  {
    id: "amazon-first-time-tier3",
    type: "product-design",
    title: "Design Amazon for first-time tier-3 shoppers",
    brief: "Bharat e-commerce onboarding. Candidate frames trust, payment options, language, return policy.",
    prompt: `Design Amazon for first-time online shoppers in tier-3 Indian cities.`,
    evalRubric: `Tensions: trust (will the product arrive, will it be the real thing, will my money be safe) vs payment options (UPI vs COD vs wallet) vs language (English-default UI vs Hindi/regional vs voice) vs return friction (no last-mile pickup, no nearby drop point). Strong engagement frames the tier-3 first-timer's risk model — recurring small purchases to build confidence before a big-ticket order — and addresses the trust chain (reviews in vernacular, video unboxings, easy return triggers). Common miss: assuming the metro-shopper UI translates by translating UI strings — the missed leg is the trust-building product structure underneath.`,
    estimatedMinutes: 30,
  },
  {
    id: "whatsapp-msme-shopkeepers",
    type: "product-design",
    title: "Design WhatsApp Business for small shopkeepers in India",
    brief: "MSME conversational commerce. Candidate frames inventory vs catalog vs payment receipt.",
    prompt: `Design WhatsApp Business for small shopkeepers in India.`,
    evalRubric: `Tensions: inventory (what's in stock, what's the price today) vs catalog (sharing items, photos, prices with customers) vs payment receipt (confirming the customer paid, sending acknowledgment, end-of-day reconciliation). Strong engagement designs for a single-phone shopkeeper running a kirana / pharmacy / fabric store, integrates with the conversational rhythm of WhatsApp rather than fighting it, and addresses the cross-customer concurrency that breaks linear flows. Common miss: building a CRM-style catalog tool that the shopkeeper has to leave WhatsApp to use — defeats the entire point of being on the channel they're already in.`,
    estimatedMinutes: 30,
  },
  {
    id: "paytm-elderly-bill-pay",
    type: "product-design",
    title: "Design a Paytm experience for elderly bill-payers",
    brief: "Senior fintech, low digital literacy. Candidate frames OTP fatigue, scam protection, voice over text.",
    prompt: `Design a Paytm experience for elderly users paying utility bills.`,
    evalRubric: `Tensions: OTP fatigue (too many codes, forgotten passwords, blocked sessions) vs scam protection (fake bills, vishing calls, family members exploiting access) vs voice-over-text input (elderly users speak more reliably than they type but voice raises new attack surface). Strong engagement names a specific elderly persona (retired, lives alone or with adult children, uses one phone), addresses cognitive load (large fonts, single-task screens, repeated confirmations) AND scam vectors (family-shared OTP, fake-bill detection, audit trail for adult children to review). Common miss: bolting a "senior mode" onto the standard app without changing the security architecture for an audience with fundamentally different risk.`,
    estimatedMinutes: 30,
  },
  {
    id: "byjus-foundational-literacy",
    type: "product-design",
    title: "Design a BYJU's product for kids learning to read in vernacular",
    brief: "Primary literacy, vernacular-first. Candidate frames script choice, audio support, parent role.",
    prompt: `Design a BYJU's product for children learning to read in Indian vernacular languages.`,
    evalRubric: `Tensions: script choice (Devanagari vs vernacular script vs Romanized vs phonetic) vs audio support (full narration vs assisted read vs silent practice) vs parent role (parent reads alongside vs hands-off vs guided sessions). Strong engagement names a primary literacy sub-segment (first-generation reader, multi-lingual home, school-supplement vs replacement) and resists treating literacy as a single English-curriculum-translated problem; addresses how a 6-year-old in a Marathi household differs from one in a Bengali household. Common miss: shipping "BYJU's syllabus translated" — misses that vernacular foundational literacy is a different pedagogy, not a translation.`,
    estimatedMinutes: 30,
  },
  {
    id: "netflix-india-household-sharing",
    type: "product-design",
    title: "Design Netflix for an Indian joint family on one account",
    brief: "Multi-generational household. Candidate frames profile chaos vs content discovery vs language preference.",
    prompt: `Design Netflix for an Indian joint family sharing one account.`,
    evalRubric: `Tensions: profile chaos (six users on one account, no one logs out, kids using parents' profile) vs content discovery (the algorithm pollutes when everyone shares one profile) vs language preference (one household wants Hindi dubs, another English originals, grandparents regional). Strong engagement designs for the joint-family reality without forcing structural separation (every member signing up is unrealistic), addresses the algorithm-pollution problem AND the language-layering problem, and weighs Netflix's content-spend logic against the household's real usage. Common miss: "add more profiles" — misses that profiles already exist and aren't used; the design problem is making them voluntary AND useful.`,
    estimatedMinutes: 30,
  },
  {
    id: "uber-driver-fatigue",
    type: "product-design",
    title: "Design a safety feature for fatigued Uber drivers",
    brief: "Driver-side wellness, marketplace tension. Candidate frames earnings vs intervention vs detection.",
    prompt: `Design a safety feature to prevent fatigued Uber drivers from driving.`,
    evalRubric: `Tensions: earnings (drivers chasing daily targets, surge incentives, weekly minimums) vs intervention (forced breaks reduce supply, drivers route around limits) vs detection (how do you know someone is fatigued — hours, time-of-day, in-cab behavior). Strong engagement separates the detection problem from the intervention design, addresses driver pushback (they'll log out if the app gets paternalistic), and proposes graduated nudges before hard limits. Common miss: "force a break after N hours" — ignores that drivers will toggle between apps to defeat the limit; the design problem is making the break worth taking.`,
    estimatedMinutes: 30,
  },
  {
    id: "tinder-women-safety-india",
    type: "product-design",
    title: "Design a safety feature for women on Tinder in India",
    brief: "Dating safety, gendered context. Candidate frames verification vs anonymity vs intervention.",
    prompt: `Design a safety feature for women using Tinder in India.`,
    evalRubric: `Tensions: verification (real identity confirmation reduces catfishing but raises privacy / outing risk) vs anonymity (women may need to hide their presence from family) vs intervention (panic buttons, location share, video verification — each comes with social cost). Strong engagement frames the Indian-specific context (family surveillance, public-meeting taboo, casual-dating stigma) and designs interventions women will actually use without inadvertently outing them. Common miss: importing US-Tinder safety features (background checks, video chat) without re-thinking how they interact with women whose family does not know they're on a dating app.`,
    estimatedMinutes: 30,
  },
  {
    id: "stranded-airport-travelers",
    type: "product-design",
    title: "Design a feature for travelers stranded by flight delays",
    brief: "Time-sensitive crisis utility. Candidate frames info vs alternatives vs compensation.",
    prompt: `Design a feature to help travelers stranded at airports during flight delays.`,
    evalRubric: `Tensions: information (when will I fly, why am I delayed, where's my luggage) vs alternatives (other flights, rebooking, train, refund) vs compensation (food, hotel, money — and the airline's incentive to under-disclose). Strong engagement frames the user as a stressed traveler who hasn't slept, addresses what they need in the first 10 minutes (clear status) vs hour 2 (alternatives) vs hour 6 (compensation), and resists "one-screen does it all" for a multi-state problem. Common miss: designing a status-display feature without surfacing the trade-off between airline-disclosure incentives and traveler-agency.`,
    estimatedMinutes: 30,
  },
  {
    id: "healthifyme-tier2-women",
    type: "product-design",
    title: "Design HealthifyMe for tier-2 Indian women",
    brief: "Women's health, cultural context. Candidate frames vegetarian-default vs family meals vs body-image framing.",
    prompt: `Design a HealthifyMe experience for women in tier-2 Indian cities.`,
    evalRubric: `Tensions: vegetarian-default tracking (most South Asian cuisine apps are meat-coded) vs family meals (cooking once for a household with mixed dietary needs) vs body-image framing (Western "weight loss" language vs South Asian "fitness for daily energy / postpartum / PCOS"). Strong engagement names a specific user (working tier-2 mom, dietary restrictions, family eating from one stove), resists Western fitness vocabulary, and addresses the gap between her tracking and what the rest of the household actually eats. Common miss: porting HealthifyMe's calorie-deficit framing — alienates the audience whose cultural relationship to food does not map to that frame.`,
    estimatedMinutes: 30,
  },
  {
    id: "notion-non-technical-team",
    type: "product-design",
    title: "Design Notion for a non-technical sales team's first adoption",
    brief: "Enterprise expansion to non-engineers. Candidate frames templates vs flexibility vs onboarding cliff.",
    prompt: `Design Notion for a non-technical sales team adopting it for the first time.`,
    evalRubric: `Tensions: templates (give them a known shape vs constrain creativity) vs flexibility (Notion's superpower but onboarding cliff) vs adoption mechanics (champion + holdouts, manager mandate vs bottom-up). Strong engagement names a specific non-technical persona (BD lead, account manager, sales ops), addresses why prior tools (Salesforce, spreadsheets, email) need to be earned against, and resists "show them all the features" in favor of one path that delivers value in the first session. Common miss: building a "sales templates library" without addressing why a sales team would leave Salesforce — the templates aren't the wedge, the workflow win is.`,
    estimatedMinutes: 30,
  },
  {
    id: "zerodha-first-time-investor",
    type: "product-design",
    title: "Design Zerodha onboarding for first-time Indian investors",
    brief: "Retail investor onboarding. Candidate frames education vs caution vs activation.",
    prompt: `Design Zerodha onboarding for a first-time stock market investor in India.`,
    evalRubric: `Tensions: education (the user needs to understand markets but tutorials kill activation) vs caution (don't let a first-timer YOLO their savings into a meme stock) vs activation (they came to invest, slow them down too much and they leave). Strong engagement designs for the first-timer who has heard their friends made money, segments by capital available (₹5k vs ₹50k vs ₹5L), and resists the "demo trade with virtual money" shortcut (it doesn't carry emotional weight). Common miss: building an education module no one watches — the design problem is making the first real trade survivable and educational at once.`,
    estimatedMinutes: 30,
  },
  {
    id: "blinkit-late-night-essentials",
    type: "product-design",
    title: "Design Blinkit for late-night essential purchases",
    brief: "Late-night quick commerce. Candidate frames dark-store coverage vs rider safety vs use case (medicine vs snacks).",
    prompt: `Design Blinkit for people buying essentials late at night.`,
    evalRubric: `Tensions: dark-store coverage (limited late-shift staffing, fewer stores open) vs rider safety (riding alone at 1 AM, robbery risk, fatigue) vs use case heterogeneity (a panicked parent buying baby medicine has different needs than someone ordering Maggi after a fight with their partner). Strong engagement segments the late-night SKU set (medicine + condoms + emergency baby supplies vs snacks + cigarettes + alcohol where legal), addresses the rider safety budget that late-night demands, and resists "extend 24x7" without unbundling these use cases. Common miss: building a single "night mode" that prices snack convenience the same as medicine urgency — they're different products.`,
    estimatedMinutes: 30,
  },
  {
    id: "irctc-tatkal-rush",
    type: "product-design",
    title: "Design IRCTC for the 10 AM tatkal booking rush",
    brief: "High-contention utility. Candidate frames fairness vs speed vs anxiety under load.",
    prompt: `Design an IRCTC experience for users booking tatkal train tickets at 10 AM.`,
    evalRubric: `Tensions: fairness (anti-bot, anti-tout, no insider priority) vs speed (every second matters when 50k people refresh at 10:00:00) vs anxiety (the user is sweating, fumbling captcha, scared of missing) vs PNR-system constraints. Strong engagement addresses the load-side problem (queue, lottery, rolling release, anti-bot) AND the user-experience problem (clear status, what-failed, fast resume) without pretending one solves the other. Common miss: "rebuild the queueing system" (handwave) or "make the form easier" (misses that the real friction is the lottery odds, not the form).`,
    estimatedMinutes: 30,
  },
  {
    id: "ola-ev-range-anxiety",
    type: "product-design",
    title: "Design a feature for Ola Electric range anxiety",
    brief: "EV adoption barrier. Candidate frames charging-infrastructure vs range-display vs trip planning.",
    prompt: `Design a feature to reduce range anxiety for Ola Electric scooter buyers.`,
    evalRubric: `Tensions: charging-infrastructure reality (sparse, slow, unreliable) vs range display (over-stated kills trust, under-stated kills usage) vs trip planning (need-to-charge route changes the daily commute mental model). Strong engagement separates rational anxiety (real infra gaps in tier-2 cities) from irrational anxiety (range underutilization), addresses what the rider sees on-scooter AND in-app for planning, and accepts that some trips are simply out of range. Common miss: building a charging-station finder as the answer — that's necessary but not sufficient; the real product question is making the rider trust the range number itself.`,
    estimatedMinutes: 30,
  },
  {
    id: "youtube-kids-tier3",
    type: "product-design",
    title: "Design YouTube Kids for tier-3 Indian families sharing a phone",
    brief: "Shared device, parental control gaps. Candidate frames content safety vs device handoff vs language.",
    prompt: `Design YouTube Kids for tier-3 Indian families sharing one phone.`,
    evalRubric: `Tensions: content safety (algorithmic recommendation drift into harmful videos) vs device handoff (one phone passed parent-to-child mid-watch, parental account leaks) vs language (kid wants Tamil rhymes, parent wants English vocabulary, ads default to English). Strong engagement names the shared-phone reality, addresses the auth-friction trade-off (lock the app means kid can't open it without parent vs free access means parent's adult-account spills over), and resists "install YouTube Kids as a separate app" (the parent won't, or the kid will open regular YouTube). Common miss: designing for the US one-device-per-kid model — defeats the case's stated user.`,
    estimatedMinutes: 30,
  },
  {
    id: "github-new-dev-onboarding",
    type: "product-design",
    title: "Design a GitHub onboarding for first-time programmers",
    brief: "First-week developer, hostile defaults. Candidate frames git complexity vs collaboration vs first-PR feeling.",
    prompt: `Design a GitHub onboarding experience for first-time programmers.`,
    evalRubric: `Tensions: git complexity (the underlying model is genuinely hard, not just a UX problem) vs collaboration (PRs, reviews, mentorship — the real value, but the cliff) vs first-PR feeling (delight, accomplishment, momentum — easy to kill with a 47-comment review). Strong engagement frames the first-time programmer as a learner with thin technical confidence, designs a path from "commit my first change" to "open my first PR" as a coherent learning arc, and addresses the social side of collaboration without overwhelming. Common miss: "tutorial for git commands" — the user can read those; the missed work is making the human interaction feel safe.`,
    estimatedMinutes: 30,
  },
];

export function getCaseById(id: string): CaseTemplate | undefined {
  return PRODUCT_DESIGN_CASES.find((c) => c.id === id);
}

export function pickRandomCase(): CaseTemplate {
  const idx = Math.floor(Math.random() * PRODUCT_DESIGN_CASES.length);
  return PRODUCT_DESIGN_CASES[idx];
}
