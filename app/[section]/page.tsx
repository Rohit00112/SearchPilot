import Workspace from '@/components/workspace';
import Research from '@/components/seo/research';
import SearchConsole from '@/components/seo/search-console';
import SEOTools from '@/components/seo/tools';
import CrawlJobs from '@/components/seo/crawl-jobs';
import StrategyBuilder from '@/components/seo/strategy-builder';
import BacklinkAudit from '@/components/seo/backlink-audit';
import {notFound} from 'next/navigation';
const researchRoutes={
 'keyword-research':'keyword-research',
 'keyword-magic':'keyword-research',
 'organic-research':'organic-research',
 'organic-rankings':'organic-research',
 'backlink-research':'backlink-research',
 'seo-backlinks':'backlink-research',
 'rank-history':'rank-history',
 'seo-campaigns':'rank-history',
} as const;
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
 const {section}=await params;
 if(section==='seo-tools')return <SEOTools/>;
 if(section==='crawl-jobs'||section==='site-crawls')return <CrawlJobs/>;
 if(section==='keyword-strategy')return <StrategyBuilder/>;
 if(section==='backlink-audit')return <BacklinkAudit/>;
 if(section==='search-console'||section==='integrations')return <SearchConsole/>;
 const mode=researchRoutes[section as keyof typeof researchRoutes];
 if(mode)return <Research mode={mode}/>;
 if(!['overview','projects','domain-overview','keywords','position-tracking','site-audit','backlinks','reports','onboarding','settings'].includes(section))notFound();
 return <Workspace section={section}/>;
}
