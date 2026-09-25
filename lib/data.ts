export const CONSULTATION_PRICE_INR = 2100;

export const services = [
  {
    id: "kundli",
    title: "Single Kundli Consultation",
    price: CONSULTATION_PRICE_INR,
    duration: "60 minutes",
    highlighted: true,
    description:
      "A focused one-hour Kundli consultation covering dasha timing, key yogas, and practical guidance for the year ahead.",
    includes: [
      "Birth-chart interpretation",
      "Practical guidance for current life matters",
      "Timezone-aware live session",
      "Follow-up notes shared after the reading",
    ],
  },
  {
    id: "vastu",
    title: "Home Vastu",
    price: 50000,
    duration: "Site consultation + detailed guidance",
    highlighted: false,
    description:
      "A home Vastu review focused on directions, placement, and practical remedies for harmonious living spaces.",
    includes: [
      "Home or property review",
      "Directional guidance for key zones",
      "Practical adjustments and remedies",
    ],
  },
  {
    id: "matchmaking",
    title: "Match Making",
    price: 2100,
    duration: "Consultation-based review",
    highlighted: false,
    description:
      "A compatibility-focused reading for relationship matches, with attention to chart patterns and timing considerations.",
    includes: [
      "Matching overview",
      "Compatibility insights",
      "Relationship guidance and timing notes",
    ],
  },
];

export const retainers = [
  {
    title: "Fortnightly Check-in",
    price: 7800,
    cadence: "per month · two 15-min sessions",
    blurb: "For clients who need a short, structured sounding board twice a month.",
  },
  {
    title: "Weekly Daily Counseling",
    price: 14500,
    cadence: "per month · four 15-min sessions",
    blurb: "Ongoing psychological + Jyotish framing for work, family, and timing decisions.",
  },
  {
    title: "Intensive Retainer",
    price: 28000,
    cadence: "per month · eight 15-min sessions",
    blurb: "High-touch support during transits, relocation, or family transitions.",
  },
];

export const courses = [
  {
    slug: "north-indian-foundations",
    title: " Chart Foundations",
    startsAt: "2026-10-12",
    durationWeeks: 8,
    priceInr: 18000,
    seats: 18,
    level: "Beginner",
    summary:
      "Houses, signs, aspects, and dignities using the diamond chart. Practice sets on real (anonymized) charts.",
  },
  {
    slug: "dasha-counseling",
    title: "Dasha Timing for Counselors",
    startsAt: "2026-11-02",
    durationWeeks: 6,
    priceInr: 22000,
    seats: 12,
    level: "Intermediate",
    summary:
      "How Vimshottari periods inform therapeutic pacing without fatalism. Case seminars and ethics.",
  },
  {
    slug: "lal-kitab-ethics",
    title: "Lal Kitab Principles & Ethical Remedies",
    startsAt: "2026-11-23",
    durationWeeks: 5,
    priceInr: 16500,
    seats: 16,
    level: "Intermediate",
    summary:
      "Core Lal Kitab axioms, planetary debts, and client-safe remedial language grounded in counseling practice.",
  },
];

export const mockClients = [
  {
    id: "cl_01",
    fullName: "Ananya Sharma",
    email: "ananya.s@example.com",
    phone: "+91 98100 11122",
    timezone: "Asia/Kolkata",
    birthDate: "1989-04-17",
    birthTime: "06:42",
    birthPlace: "Faridabad, Haryana",
    vastuFloorPlan: "East-facing 3BHK, kitchen SE, master NE. Lift lobby west.",
    notes: [
      "Week 1: Career dasha discussion; recommended pause on lateral move until Kartik.",
      "Week 2: Sleep hygiene + Saturn-related workload framing.",
    ],
  },
  {
    id: "cl_02",
    fullName: "Daniel Okonkwo",
    email: "daniel.o@example.com",
    phone: "+44 7700 900123",
    timezone: "Europe/London",
    birthDate: "1982-11-03",
    birthTime: "22:15",
    birthPlace: "Lagos, Nigeria",
    vastuFloorPlan: "Terrace flat, south entrance, study in west room.",
    notes: [
      "International client; sessions at 09:00 IST / 03:30 GMT.",
      "Rectification in progress — marriage date 2014 used as anchor.",
    ],
  },
  {
    id: "cl_03",
    fullName: "Meera Iyer",
    email: "meera.iyer@example.com",
    phone: "+1 415 555 0198",
    timezone: "America/Los_Angeles",
    birthDate: "1994-07-29",
    birthTime: "14:08",
    birthPlace: "Chennai, Tamil Nadu",
    vastuFloorPlan: "Studio apartment; desk facing north; entrance west.",
    notes: ["Academy enrollment:  Chart Foundations."],
  },
];

export const mockAppointments = [
  {
    id: "ap_01",
    client: "Ananya Sharma",
    type: "KUNDLI" as const,
    startsAt: "2026-09-12T10:00:00+05:30",
    durationMin: 60,
  },
  {
    id: "ap_02",
    client: "Daniel Okonkwo",
    type: "DAILY_COUNSELING" as const,
    startsAt: "2026-09-12T09:00:00+05:30",
    durationMin: 15,
  },
  {
    id: "ap_03",
    client: "Meera Iyer",
    type: "DAILY_COUNSELING" as const,
    startsAt: "2026-09-13T07:30:00+05:30",
    durationMin: 15,
  },
  {
    id: "ap_04",
    client: "Ananya Sharma",
    type: "DAILY_COUNSELING" as const,
    startsAt: "2026-09-15T18:00:00+05:30",
    durationMin: 15,
  },
];

export const mockPayments = [
  {
    id: "pay_01",
    client: "Ananya Sharma",
    kind: "SINGLE_CONSULTATION",
    amountInr: 2100,
    status: "SUCCEEDED",
    date: "2026-09-01",
  },
  {
    id: "pay_02",
    client: "Daniel Okonkwo",
    kind: "DAILY_RETAINER",
    amountInr: 14500,
    status: "SUCCEEDED",
    date: "2026-09-01",
  },
  {
    id: "pay_03",
    client: "Meera Iyer",
    kind: "COURSE",
    amountInr: 18000,
    status: "PENDING",
    date: "2026-09-08",
  },
  {
    id: "pay_04",
    client: "Priya Kapoor",
    kind: "SINGLE_CONSULTATION",
    amountInr: 2100,
    status: "SUCCEEDED",
    date: "2026-09-10",
  },
];
