export type Frame = "phone" | "browser";

export interface Project {
  id: string;
  title: string;
  kicker: string;
  year: string;
  role: string;
  frame: Frame;
  /** Accent for this project's chrome. Verified ≥ 4.5:1 on the app surface. */
  accent: string;
  summary: string;
  highlights: string[];
  /** Each tool with the job it actually did on this project. */
  stack: { name: string; role: string }[];
  /** Optional credential badge, e.g. a registered copyright. */
  award?: string;
  repo?: string;
  live?: string;
  /**
   * Send people straight to the running application instead of a local
   * write-up. Set this and the card links out; there is no detail page.
   */
  externalUrl?: string;
}

/**
 * Real projects, real stacks. Everything rendered *inside* the mockups is
 * fabricated sample data — no production records, names, or figures.
 */
export const projects: Project[] = [
  {
    id: "moment",
    title: "MoMent",
    kicker: "Money you can finally account for",
    year: "2026",
    role: "Full-stack",
    frame: "phone",
    accent: "#1F7A68",
    summary:
      "A mobile-first expense tracker that doesn't demand discipline. Photograph a receipt and let the model read the line items, or type one line into a Telegram bot and it's recorded before you've had time to forget.",
    highlights: [
      "Gemini-backed receipt scanner — pulls items, quantities and prices out of a photo, still editable before you save",
      "Multi-person bill splitting assigned per item, not divided flat",
      "A Telegram bot as the fastest way in, synced both ways with Firestore",
      "Live summary: balance, category breakdown, this month against last",
    ],
    stack: [
      { name: "Next.js 16", role: "Frontend" },
      { name: "TypeScript", role: "Language" },
      { name: "Firebase", role: "Backend · auth · Firestore" },
      { name: "Gemini API", role: "Receipt reading" },
      { name: "Telegram Bot", role: "Second input channel" },
      { name: "Konsta UI", role: "Mobile component kit" },
    ],
    repo: "https://github.com/cashewwww14/moment-fin",
  },
  {
    id: "edisiplin",
    title: "e-Disiplin",
    kicker: "Case files that stop vanishing into email threads",
    year: "2026",
    role: "Full-stack",
    frame: "browser",
    accent: "#2F5F8A",
    summary:
      "A staff conduct case-management system for a state-owned enterprise. It replaced a process that ran on email attachments and a shared folder, with an audit trail nobody can argue with.",
    highlights: [
      "Tiered case workflow with layered roles and sign-off at each stage",
      "An activity log that records every status change and who made it",
      "Separate frontend and backend, talking over a token-authenticated API",
      "Evidence uploads with file-type checks performed server-side",
    ],
    stack: [
      { name: "Next.js", role: "Frontend" },
      { name: "TypeScript", role: "Language" },
      { name: "Laravel", role: "Backend API" },
      { name: "MySQL", role: "Database" },
      { name: "Sanctum", role: "Token auth" },
    ],
    repo: "https://github.com/cashewwww14/e-disiplin",
  },
  {
    id: "moditium",
    title: "Moditium",
    kicker: "Recommendations that read mood, not just genre",
    year: "2025",
    role: "ML & Frontend",
    frame: "browser",
    accent: "#8A4A7D",
    award: "Registered copyright — DJKI EC002026029567",
    summary:
      "A layered music recommender: rules narrow the field, case-based reasoning finds the nearest neighbours in the audio-feature space of 114,000 tracks, and a gradient-boosted ranker decides the final order. Catalogue, artwork and playback come from Apple Music.",
    highlights: [
      "Hybrid RBR + CBR + LightGBM — rules cut the search space, CBR measures closeness, the ranker sets the running order",
      "CBR similarity is 0.7 × cosine + 0.3 × euclidean over nine weighted audio features; energy, valence and danceability carry the most weight",
      "Apple Music supplies catalogue, artwork and 30-second previews; the feature dataset stays the brain",
      "Mahalanobis distance and a Siamese network were both considered and rejected — compute cost and no labelled similarity data",
    ],
    stack: [
      { name: "React 18", role: "Frontend" },
      { name: "Vite", role: "Build" },
      { name: "FastAPI", role: "Recommendation service" },
      { name: "LightGBM", role: "Ranking model" },
      { name: "scikit-learn", role: "Feature pipeline · CBR" },
      { name: "Apple Music API", role: "Catalogue · artwork · playback" },
    ],
    repo: "https://github.com/cashewwww14/Spotify",
  },
  {
    id: "cv-analyzer",
    title: "re-CV Analyzer",
    kicker: "Sorting a stack of applications without reading all of them",
    year: "2025",
    role: "Backend & Infra",
    frame: "browser",
    accent: "#8A5A22",
    summary:
      "A screening tool that reads application files, pulls structured data out of them, and scores that against what a role actually needs. Rebuilt from the first version once it was clear what people really used.",
    highlights: [
      "Parses PDF and DOCX into structured fields: experience, education, skills",
      "A match score against the role definition, with the reasoning behind the number",
      "ClamAV scans every upload before the parser touches the file",
      "Deployed to a VM through provisioning scripts, not panel clicks",
      "Its successor at Peruri was wired into the ERP through n8n and Vertex AI",
    ],
    stack: [
      { name: "PHP", role: "Language" },
      { name: "Laravel", role: "Backend" },
      { name: "Blade", role: "Templating" },
      { name: "ClamAV", role: "Upload scanning" },
      { name: "n8n", role: "ERP integration" },
      { name: "Vertex AI", role: "Document parsing" },
    ],
    repo: "https://github.com/cashewwww14/re-CV-Analyzer",
    externalUrl: "http://senopati.its.ac.id/CV-Analyzer/",
  },
  {
    id: "kpi",
    title: "Network KPI",
    kicker: "A weekly report that used to eat a working day",
    year: "2025",
    role: "Data & Automation",
    frame: "browser",
    accent: "#4A6B3F",
    summary:
      "A network performance dashboard for an operator's analytics team. Two boards — 4G and 5G — read cell metrics straight out of PostgreSQL and draw them per network cluster, so a week's worth of health is one page instead of a spreadsheet.",
    highlights: [
      "Separate 4G and 5G boards: availability, accessibility, drop rate, traffic, throughput, PRB utilisation, CQI, PSCell change",
      "Everything filtered by network cluster, refreshed against the live API",
      "A Flask service over PostgreSQL feeding Chart.js — no export step in the loop",
      "The weekly PowerPoint recap runs as its own scheduled script, not from the dashboard",
      "Configuration in a file, credentials in the environment, nothing hardcoded",
      "Used alongside Tableau for the deeper analysis",
    ],
    stack: [
      { name: "Flask", role: "Backend API" },
      { name: "PostgreSQL", role: "Metric store" },
      { name: "psycopg", role: "Database driver" },
      { name: "Chart.js", role: "Dashboard charts" },
      { name: "python-pptx", role: "Scheduled report export" },
      { name: "Tableau", role: "Deeper analysis" },
    ],
    repo: "https://github.com/cashewwww14/Project-KPI",
  },
  {
    id: "floor-socket",
    title: "Floor Socket 3D",
    kicker: "Writing the rasteriser before reaching for one",
    year: "2025",
    role: "Graphics",
    frame: "browser",
    accent: "#4A5490",
    summary:
      "A 3D object viewer built directly on raw WebGL — no Three.js. The shaders, the transform matrices and the lighting model are all written by hand, because that was the entire point.",
    highlights: [
      "Full Phong lighting: ambient, diffuse and specular, with a light you can move",
      "Procedural checkerboard texture mapping, plus your own uploaded image",
      "Texture and lighting genuinely interact, rather than being two layers stuck together",
      "Model-view-projection matrices assembled by hand, with no helper library",
    ],
    stack: [
      { name: "WebGL", role: "Rendering" },
      { name: "GLSL", role: "Vertex · fragment shaders" },
      { name: "JavaScript", role: "Matrix maths, by hand" },
    ],
    repo: "https://github.com/cashewwww14/aplikasi-grafika",
    live: "https://cashewwww14.github.io/aplikasi-grafika/floor-socket.html",
  },
  {
    id: "news-portal",
    title: "News Portal",
    kicker: "The first one — plain PHP, no framework",
    year: "2024",
    role: "Full-stack",
    frame: "browser",
    accent: "#8A473C",
    summary:
      "A news site with an editorial panel: writer and admin roles, a publishing flow, and image uploads. Written in PHP without a framework, because at the time I didn't know there was an easier way — and that turned out to be the good part.",
    highlights: [
      "Authentication and role separation written from scratch, session handling included",
      "An editorial panel to draft, edit and pull articles back",
      "SQL written directly — this is where prepared statements stopped being optional",
      "The schema evolved twice; both migrations are still in the repo",
    ],
    stack: [
      { name: "PHP", role: "Backend, no framework" },
      { name: "MySQL", role: "Database" },
      { name: "Bootstrap", role: "Styling" },
      { name: "JavaScript", role: "Interactions" },
    ],
    repo: "https://github.com/cashewwww14/FP-PPL",
  },
];
