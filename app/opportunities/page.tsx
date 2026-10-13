import type {Metadata} from 'next';
import GscOpportunities from '@/components/seo/gsc-opportunities';
export const metadata:Metadata={title:'Search opportunities',description:'Review saved Google Search Console query observations with clearly labelled heuristic opportunities.'};
export default function OpportunitiesPage(){return <GscOpportunities/>}
