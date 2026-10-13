export const demoProjects = [
  { id: "demo-1", name: "Acme Commerce", domain: "acmecommerce.com", createdAt: "2026-09-25T09:00:00.000Z" },
  { id: "demo-2", name: "Northstar Studio", domain: "northstarstudio.io", createdAt: "2026-10-02T09:00:00.000Z" },
];

export const demoKeywords = [
  { id: "kw-demo-1", projectId: "demo-1", keyword: "sustainable running shoes", position: 4, volume: 12100, difficulty: 42, createdAt: "2026-10-01T00:00:00.000Z" },
  { id: "kw-demo-2", projectId: "demo-1", keyword: "eco friendly sneakers", position: 7, volume: 8100, difficulty: 34, createdAt: "2026-10-01T00:00:00.000Z" },
  { id: "kw-demo-3", projectId: "demo-1", keyword: "organic cotton trainers", position: 12, volume: 2900, difficulty: 28, createdAt: "2026-10-01T00:00:00.000Z" },
  { id: "kw-demo-4", projectId: "demo-1", keyword: "lightweight trail shoes", position: 9, volume: 6600, difficulty: 51, createdAt: "2026-10-01T00:00:00.000Z" },
];

export const demoChecks = [
  { name: "HTTPS availability", status: "pass", details: "An HTTPS connection is available in the demo.", recommendation: "Keep certificates up to date." },
  { name: "Page titles", status: "warning", details: "Sample pages may need unique titles.", recommendation: "Write distinct, descriptive title tags." },
  { name: "Meta descriptions", status: "warning", details: "Sample descriptions need review.", recommendation: "Give important pages compelling meta descriptions." },
  { name: "Robots and indexing", status: "pass", details: "No obvious issue in sample data.", recommendation: "Periodically verify crawl permissions." },
  { name: "Mobile performance", status: "warning", details: "Sample mobile performance can improve.", recommendation: "Compress images and reduce blocking scripts." },
];

export const demoAudits = [{
  id: "audit-demo-1", projectId: "demo-1", domain: "acmecommerce.com", score: 86,
  checkedAt: "2026-10-12T08:45:00.000Z", checks: demoChecks, demo: true,
}];
