import type {Metadata} from 'next';
import ReportBuilder from '@/components/reports/report-builder';
export const metadata:Metadata={title:'Report Builder | SearchPilot'};
export default function ReportBuilderPage(){return <ReportBuilder/>;}
