import Workspace from '@/components/workspace';
export default async function Section({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; return <Workspace section={section} /> }
