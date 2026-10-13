export const reportSections = ['overview', 'keywords', 'audit', 'manual_rankings', 'notes'] as const;
export type ReportSection = typeof reportSections[number];

export const reportSectionLabels: Record<ReportSection, string> = {
  overview: 'Project overview',
  keywords: 'User-recorded keywords',
  audit: 'Latest homepage audit',
  manual_rankings: 'Manual rank observations',
  notes: 'Editorial notes',
};

export const reportPresets: {
  id: 'solo' | 'client';
  name: string;
  description: string;
  title: string;
  blocks: ReportSection[];
}[] = [
  {
    id: 'solo',
    name: 'Solo snapshot',
    description: 'A short review of your project, recorded keywords, and latest homepage audit.',
    title: 'SEO project snapshot',
    blocks: ['overview', 'keywords', 'audit'],
  },
  {
    id: 'client',
    name: 'Client update',
    description: 'A shareable project update with recorded observations and your own commentary.',
    title: 'Client SEO update',
    blocks: ['overview', 'audit', 'keywords', 'manual_rankings', 'notes'],
  },
];
