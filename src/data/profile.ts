export const profile = {
  name: "Ahmad Zaky Ash Shidqi",
  shortName: "Zaky",
  role: "Full-stack & Infrastructure Engineer",
  tagline: "Systems people actually use — not just ones that run on my laptop.",
  location: "Surabaya, Indonesia",
  email: "zaky.shidqi14@gmail.com",
  github: { handle: "cashewwww14", url: "https://github.com/cashewwww14" },
  linkedin: { handle: "in/zakyshidqi", url: "https://www.linkedin.com/in/zakyshidqi" },

  education: {
    school: "Institut Teknologi Sepuluh Nopember",
    degree: "BSc Informatics Engineering",
    gpa: "3.67 / 4.00",
    period: "Aug 2023 — Aug 2027",
  },

  intro: [
    "I write code the way someone shapes wood — cut away until only what's needed is left.",
    "Most days I move between a backend that has to hold up under load, a frontend that has to feel good, and containers that aren't allowed to fall over at two in the morning.",
  ],

  experience: [
    {
      org: "Perum Peruri (Persero)",
      role: "IT Infrastructure Developer Intern",
      period: "Jan 2026 — present",
      place: "Jakarta",
      points: [
        "Built a Turborepo monorepo pipeline across a full-stack Next.js and Laravel architecture.",
        "Orchestrated 7 containers and 4 MySQL databases with Docker Compose on a single bridge network.",
        "Shipped an ERP-integrated CV Analyzer (n8n + Vertex AI) and a survey pipeline for 3,000+ respondents — analysis that took days now takes under an hour.",
      ],
    },
    {
      org: "Indosat Ooredoo Hutchison",
      role: "Technical Operation Intern",
      period: "Oct 2025 — Jan 2026",
      place: "Surabaya",
      points: [
        "Built a real-time 4G/5G network performance dashboard in Grafana.",
        "Automated the daily network KPI reporting pipeline across teams.",
        "Forecast 2026 data-usage trends in Python for capacity planning.",
      ],
    },
    {
      org: "Target Media Nusantara",
      role: "Content Operator",
      period: "Jun — Jul 2025",
      place: "Surabaya",
      points: [
        "Handled installation and maintenance of enterprise digital media display applications.",
        "Tightened the deploy path: compilation, dependencies, and multi-format assets.",
      ],
    },
  ],

  publication: {
    title: "Moditium — Music Recommendation System",
    issuer: "Directorate General of Intellectual Property",
    detail: "Registered software copyright, Ministry of Law and Human Rights. Reg. No. EC002026029567.",
    year: "2026",
  },

  volunteer: [
    {
      org: "NAWASENA",
      role: "Student Mentor",
      period: "May — Nov 2025",
      desc: "Mentored first-year Informatics students on academic life and choosing a specialisation, in the department's official orientation programme.",
    },
    {
      org: "KCVanguard Workshop",
      role: "ML Track",
      period: "Feb — Apr 2025",
      desc: "Built an Indonesian sentiment-analysis model and a CNN brain-tumour classifier on medical imaging.",
    },
  ],

  certifications: [
    { name: "Python, C++, IoT Development with ESP32", issuer: "Skilvul" },
    { name: "Samsung Innovation Campus", issuer: "PT Samsung Electronics Indonesia" },
  ],

  /**
   * Grouped for the craft page. `weight` drives visual emphasis:
   * 1 = daily driver, 0.5 = shipped with it and moved on.
   */
  stack: [
    {
      group: "Automation & Infra",
      items: [
        { name: "n8n", weight: 1, note: "ERP integration · ETL · AI" },
        { name: "Docker / Compose", weight: 0.95, note: "Microservices" },
        { name: "Google Cloud", weight: 0.7, note: "Firebase · Vertex AI" },
        { name: "Linux / VM", weight: 0.75, note: "Provisioning" },
        { name: "Turborepo", weight: 0.7, note: "Monorepo" },
      ],
    },
    {
      group: "Backend & Data",
      items: [
        { name: "Python", weight: 0.95, note: "Analysis · forecasting · ML" },
        { name: "Laravel / PHP", weight: 0.9, note: "REST · Sanctum" },
        { name: "FastAPI", weight: 0.8, note: "ML services" },
        { name: "MySQL · PostgreSQL", weight: 0.9, note: "Relational · ETL" },
        { name: "Machine Learning", weight: 0.7, note: "CNN · LightGBM" },
      ],
    },
    {
      group: "Frontend",
      items: [
        { name: "Next.js / React", weight: 0.95, note: "App Router" },
        { name: "TypeScript", weight: 0.95, note: "Every day" },
        { name: "Tailwind", weight: 0.85, note: "Design systems" },
        { name: "Three.js / R3F", weight: 0.7, note: "WebGL" },
        { name: "GLSL", weight: 0.55, note: "Hand-written shaders" },
      ],
    },
    {
      group: "Visualisation",
      items: [
        { name: "Grafana", weight: 0.8, note: "Real-time monitoring" },
        { name: "Tableau", weight: 0.6, note: "Deep dives" },
        { name: "Pandas", weight: 0.85, note: "Wrangling" },
        { name: "Git", weight: 1, note: "Always" },
      ],
    },
  ],
} as const;

export type Profile = typeof profile;
