import type { ComponentType } from "react";
import { EDisiplinMockup } from "./EDisiplin";
import { FloorSocketMockup } from "./FloorSocket";
import { KpiMockup } from "./Kpi";
import { MoMentMockup } from "./MoMent";
import { ModitiumMockup } from "./Moditium";
import { NewsPortalMockup } from "./NewsPortal";

/**
 * Every interface here is a reconstruction rendered in HTML and SVG, not a
 * screenshot — it stays sharp at any scale, animates, and carries no
 * production data. All figures, names and records shown are invented.
 */
export const MOCKUPS: Record<string, ComponentType> = {
  moment: MoMentMockup,
  edisiplin: EDisiplinMockup,
  moditium: ModitiumMockup,
  kpi: KpiMockup,
  "floor-socket": FloorSocketMockup,
  "news-portal": NewsPortalMockup,
};

export const MOCKUP_URLS: Record<string, string> = {
  moment: "moment.app/dashboard",
  edisiplin: "e-disiplin.internal/dashboard",
  moditium: "moditium.app/discover",
  kpi: "kpi.internal/dashboard_4g",
  "floor-socket": "cashewwww14.github.io/aplikasi-grafika",
  "news-portal": "kabarharian.local/admin",
};
