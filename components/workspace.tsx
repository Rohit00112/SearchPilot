'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, ChartNoAxesCombined, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Download, ExternalLink, FileBarChart2, FileSearch, FolderKanban, Globe2, KeyRound, LayoutDashboard, Link2, ListFilter, LogOut, Menu, MoreHorizontal, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Target, TrendingUp, TriangleAlert, X, Zap } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, Badge, Button, Card, Dialog, EmptyState, Input, MetricCard } from '@/components/ui';

type Project = { id: string; name: string; domain: string; createdAt: string };
type Keyword = { id: string; projectId: string; keyword: string; position: number; volume: number; difficulty: number; createdAt: string };
type AuditCheck = { name: string; status: string; details: string; recommendation: string };
type Audit = { id: string; projectId?: string | null; domain: string; score: number; checkedAt: string; checks: AuditCheck[]; demo?: boolean };
type AuthUser = { id?: string; name?: string; displayName?: string; email?: string; role?: string };
type GscRow = { clicks:number; impressions:number; ctr:number; averagePosition:number; collectedAt:string };
const baseProjects: Project[] = [{ id: 'demo-1', name: 'Acme Digital', domain: 'acmedigital.io', createdAt: '2026-09-02T12:00:00Z' }, { id: 'demo-2', name: 'Northstar Studio', domain: 'northstar.design', createdAt: '2026-09-15T12:00:00Z' }, { id: 'demo-3', name: 'Bloom Commerce', domain: 'bloomshop.co', createdAt: '2026-09-24T12:00:00Z' }];
const baseKeywords: Keyword[] = [{ id: 'kw-1', projectId: 'demo-1', keyword: 'seo analytics platform', position: 4, volume: 12100, difficulty: 64, createdAt: '2026-09-03T12:00:00Z' }, { id: 'kw-2', projectId: 'demo-1', keyword: 'keyword tracking tool', position: 8, volume: 8100, difficulty: 52, createdAt: '2026-09-03T12:00:00Z' }, { id: 'kw-3', projectId: 'demo-1', keyword: 'website seo audit', position: 12, volume: 6600, difficulty: 45, createdAt: '2026-09-03T12:00:00Z' }, { id: 'kw-4', projectId: 'demo-1', keyword: 'competitor keyword research', position: 6, volume: 5400, difficulty: 71, createdAt: '2026-09-03T12:00:00Z' }, { id: 'kw-5', projectId: 'demo-1', keyword: 'backlink analysis software', position: 19, volume: 3600, difficulty: 58, createdAt: '2026-09-03T12:00:00Z' }, { id: 'kw-6', projectId: 'demo-1', keyword: 'organic search insights', position: 3, volume: 2900, difficulty: 39, createdAt: '2026-09-03T12:00:00Z' }];
const baseAudit: Audit = { id: 'demo-audit', domain: 'acmedigital.io', score: 86, checkedAt: '2026-10-12T08:30:00Z', checks: [{ name: 'HTTPS security', status: 'passed', details: 'All sample URLs use encrypted connections.', recommendation: 'Continue monitoring certificates.' }, { name: 'Meta descriptions', status: 'warning', details: '8 sample pages have missing descriptions.', recommendation: 'Add unique descriptions to important pages.' }, { name: 'Broken internal links', status: 'warning', details: '4 sample links lead to missing pages.', recommendation: 'Update or remove broken links.' }, { name: 'XML sitemap', status: 'passed', details: 'Sitemap is present in sample site data.', recommendation: 'Keep sitemap current.' }, { name: 'Mobile usability', status: 'passed', details: 'Sample pages use responsive layouts.', recommendation: 'Test new layouts across viewports.' }] };
const traffic = [{ m: 'Apr', organic: 18500, paid: 3300 }, { m: 'May', organic: 21100, paid: 3700 }, { m: 'Jun', organic: 20700, paid: 3200 }, { m: 'Jul', organic: 26700, paid: 4300 }, { m: 'Aug', organic: 28800, paid: 4500 }, { m: 'Sep', organic: 30500, paid: 4800 }, { m: 'Oct', organic: 36200, paid: 5100 }];
const positions = [{ m: 'Apr', top3: 14, top10: 35, top100: 71 }, { m: 'May', top3: 17, top10: 39, top100: 73 }, { m: 'Jun', top3: 18, top10: 41, top100: 77 }, { m: 'Jul', top3: 21, top10: 46, top100: 82 }, { m: 'Aug', top3: 24, top10: 51, top100: 84 }, { m: 'Sep', top3: 28, top10: 55, top100: 88 }, { m: 'Oct', top3: 32, top10: 60, top100: 93 }];
const backlinks = [{ domain: 'producthunt.com', authority: 91, type: 'Follow', anchor: 'Acme Digital', date: 'Oct 10, 2026' }, { domain: 'techcrunch.com', authority: 94, type: 'Follow', anchor: 'SEO workflows', date: 'Oct 8, 2026' }, { domain: 'medium.com', authority: 95, type: 'No follow', anchor: 'Analytics guide', date: 'Oct 4, 2026' }, { domain: 'designmodo.com', authority: 78, type: 'Follow', anchor: 'Website insights', date: 'Sep 29, 2026' }, { domain: 'indiehackers.com', authority: 85, type: 'Follow', anchor: 'Acme tools', date: 'Sep 22, 2026' }];
const nav = [{ title: 'WORKSPACE', items: [['overview', 'Overview', LayoutDashboard], ['projects', 'My Projects', FolderKanban], ['domain-overview', 'Domain Overview', Globe2], ['team', 'Team & Permissions', FolderKanban]] }, { title: 'SEO TOOLKIT', items: [['keywords', 'Tracked Keywords', Search], ['position-tracking', 'Position Tracking', Target], ['site-audit', 'Site Audit', ShieldCheck], ['crawl-jobs', 'Crawl Jobs', ShieldCheck], ['backlinks', 'Backlink Analytics', Link2], ['gaps', 'Keyword & Link Gaps', Search], ['seo-tools','Research & Imports', FileSearch]] }, { title: 'INSIGHTS', items: [['reports', 'Reports', FileBarChart2], ['report-builder', 'Report Builder', FileBarChart2], ['search-console', 'Search Console', Globe2], ['get-started', 'Guided Setup', Sparkles], ['onboarding', 'Demo Guide', BookOpen], ['settings', 'Account Settings', Settings2]] }] as const;
const nice = (n: number) => Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const statusOk = (status: string) => ['passed', 'pass', 'success', 'ok'].includes(status.toLowerCase());

function Metric({ label, value, delta, icon, foot }: { label: string; value: string; delta?: string; icon: typeof Activity; foot?: string }) {
    const sample = /traffic|organic|authority|visibility|domains|backlinks|links|position|rankings/i.test(label) && !foot;
    return <MetricCard icon={icon} label={label} value={value} delta={delta} foot={foot || (sample ? 'Illustrative estimate' : 'Current project')} sample={sample} />;
}
function Panel({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) { return <Card className="panel"><div className="panel-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{right}</div>{children}</Card> }
function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'purple' }) { return <Badge tone={tone}>{children}</Badge> }
function Empty({ label }: { label: string }) { return <EmptyState title="No results found" description={label} compact /> }
const errorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;
async function responseError(response: Response, fallback: string) {
    const body = await response.json().catch(() => null);
    return new Error(typeof body?.error === 'string' ? body.error : fallback);
}
function TrendChart() {
    return <div className="chart" role="img" aria-label="Illustrative monthly organic traffic rises from 18,500 in April to 36,200 in October, while paid traffic rises from 3,300 to 5,100.">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={traffic} margin={{ top: 16, right: 10, left: -20, bottom: 0 }}>
                <defs><linearGradient id="fillOrganic" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--sp-chart-a)" stopOpacity={.24} /><stop offset="95%" stopColor="var(--sp-chart-a)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#edf0f5" strokeDasharray="4 5" vertical={false} />
                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: '#697487', fontSize: 12 }} dy={12} />
                <YAxis tickFormatter={nice} axisLine={false} tickLine={false} tick={{ fill: '#697487', fontSize: 12 }} />
                <Tooltip formatter={(v) => Number(v).toLocaleString()} contentStyle={{ borderRadius: 12, border: '1px solid #e9eaf4' }} />
                <Area type="monotone" dataKey="organic" stroke="var(--sp-chart-a)" strokeWidth={3} fill="url(#fillOrganic)" name="Organic traffic" />
                <Line type="monotone" dataKey="paid" stroke="var(--sp-chart-b)" strokeWidth={2.5} dot={false} name="Paid traffic" />
            </AreaChart>
        </ResponsiveContainer>
    </div>;
}
function RankingsChart() {
    const buckets = positions.map(p => ({ ...p, fourToTen: p.top10 - p.top3, elevenToHundred: p.top100 - p.top10 }));
    return <div className="chart short" role="img" aria-label="Illustrative keyword distribution: top three rankings increase from 14 in April to 32 in October, and total top 100 rankings increase from 71 to 93.">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#edf0f5" strokeDasharray="4 5" />
                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: '#697487', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#697487', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e9eaf4' }} />
                <Bar dataKey="top3" stackId="a" fill="var(--sp-chart-a)" name="Top 3" />
                <Bar dataKey="fourToTen" stackId="a" fill="#a197f6" name="4–10" />
                <Bar dataKey="elevenToHundred" stackId="a" fill="var(--sp-chart-c)" name="11–100" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>;
}
export default function Workspace({ section = 'overview' }: { section?: string }) {
    const pathname = usePathname(), router = useRouter(); const [mobile, setMobile] = useState(false), [narrow, setNarrow] = useState(false), [projects, setProjects] = useState<Project[]>(baseProjects), [keywords, setKeywords] = useState<Keyword[]>(baseKeywords), [audits, setAudits] = useState<Audit[]>([baseAudit]), [demo, setDemo] = useState(true), [active, setActive] = useState('demo-1'), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [formError, setFormError] = useState(''), [search, setSearch] = useState(''), [modal, setModal] = useState<'project' | 'keyword' | 'audit' | 'edit-project' | null>(null), [projectName, setProjectName] = useState(''), [projectDomain, setProjectDomain] = useState(''), [keywordName, setKeywordName] = useState(''), [auditDomain, setAuditDomain] = useState(''), [range, setRange] = useState('Last 7 months'), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
    const [user, setUser] = useState<AuthUser | null>(null), [authDenied, setAuthDenied] = useState(false), [projectSearch, setProjectSearch] = useState(''), [positionFilter, setPositionFilter] = useState('all'), [difficultyFilter, setDifficultyFilter] = useState('all'), [auditFilter, setAuditFilter] = useState('all'), [selectedAuditId, setSelectedAuditId] = useState(''), [keywordPosition, setKeywordPosition] = useState(''), [keywordVolume, setKeywordVolume] = useState(''), [keywordDifficulty, setKeywordDifficulty] = useState('');
    const [gscRows,setGscRows]=useState<GscRow[]>([]);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const navigationRef = useRef<HTMLElement>(null);
    const project = projects.find(p => p.id === active) || projects[0];
    const filteredKeywords = keywords.filter(k => k.projectId === project?.id && k.keyword.toLowerCase().includes(search.toLowerCase()) &&
        (positionFilter === 'all' || positionFilter === 'top10' && k.position > 0 && k.position <= 10 || positionFilter === '11to20' && k.position >= 11 && k.position <= 20 || positionFilter === 'unranked' && !k.position) &&
        (difficultyFilter === 'all' || difficultyFilter === 'easy' && k.difficulty < 40 || difficultyFilter === 'medium' && k.difficulty >= 40 && k.difficulty < 70 || difficultyFilter === 'hard' && k.difficulty >= 70));
    const projectAudits = audits.filter(a => a.domain === project?.domain || a.projectId === project?.id);
    const audit = projectAudits.find(a => a.id === selectedAuditId) ?? projectAudits[0] ?? (demo ? audits[0] : undefined);
    const auditChecks = (audit?.checks ?? []).filter(c => auditFilter === 'all' || (auditFilter === 'passed' ? statusOk(c.status) : !statusOk(c.status)));
    const load = useCallback(async () => {
        setLoading(true); setLoadError('');
        try {
            const [p, k] = await Promise.all([fetch('/api/projects', { cache: 'no-store' }), fetch('/api/keywords', { cache: 'no-store' })]);
            if (p.status === 401 || k.status === 401 || p.status === 403 || k.status === 403) {
                setDemo(false); setAuthDenied(true); router.replace('/login'); return;
            }
            if (!p.ok || !k.ok) throw Error('Workspace data could not be loaded from the API.');
            const pr = await p.json(), kr = await k.json();
            if (!Array.isArray(pr.projects) || !Array.isArray(kr.keywords)) throw Error('The API returned an unexpected response.');
            setDemo(Boolean(pr.demo || kr.demo));
            setProjects(pr.projects); setKeywords(kr.keywords);
            if (!pr.demo) setAudits([]);
            if (pr.projects.length) setActive(x => {
                const stored = window.sessionStorage.getItem('searchpilot-active-project');
                const preferred = x === 'demo-1' && stored ? stored : x;
                return pr.projects.some((a: Project) => a.id === preferred) ? preferred : pr.projects[0].id;
            });
            else {
                setActive('');
                window.sessionStorage.removeItem('searchpilot-active-project');
            }
            if (pr.projects.length) {
                const ar = await fetch('/api/audit?projectId=' + encodeURIComponent(pr.projects[0].id), { cache: 'no-store' });
                if (ar.ok) { const a = await ar.json(); if (Array.isArray(a.audits)) setAudits(a.audits); }
            }
        } catch (error) {
            setLoadError(errorMessage(error, 'Unable to load workspace data. Showing local sample content.'));
        } finally { setLoading(false); }
    }, [router]);
    useEffect(() => { void load() }, [load]);
    useEffect(() => { if (project?.id) window.sessionStorage.setItem('searchpilot-active-project',project.id); }, [project?.id]);
    useEffect(() => {
        let alive = true;
        fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
            .then(async r => { if (r.status === 401) { if (alive) setAuthDenied(true); return null; } if (!r.ok) return null; return r.json(); })
            .then(data => { if (alive && data?.user) setUser(data.user); })
            .catch(() => {})
            .finally(() => {});
        return () => { alive = false; };
    }, [router]);
    useEffect(() => { if (!loading && !demo && authDenied) router.replace('/login'); }, [loading,demo,authDenied,router]);
    useEffect(() => {
        if(demo){setGscRows([]);return;}
        const today=new Date(),start=new Date(today.getTime()-30*86400000);
        const qs=new URLSearchParams({from:start.toISOString().slice(0,10),to:today.toISOString().slice(0,10)});
        let active=true;
        fetch('/api/integrations/gsc/performance?'+qs.toString(),{credentials:'same-origin',cache:'no-store'})
          .then(r=>r.ok?r.json():null)
          .then(data=>{if(active)setGscRows(Array.isArray(data?.rows)?data.rows:[])})
          .catch(()=>{if(active)setGscRows([])});
        return()=>{active=false};
    },[demo]);
    useEffect(() => {
        const media = window.matchMedia('(max-width: 900px)');
        const sync = () => { setNarrow(media.matches); if (!media.matches) setMobile(false); };
        sync(); media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);
    useEffect(() => { setFormError(''); }, [modal]);
    useEffect(() => { if (demo || !active) return; fetch('/api/audit?projectId=' + encodeURIComponent(active), { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(r => { if (r && Array.isArray(r.audits)) setAudits(r.audits) }).catch(() => { }) }, [active, demo]);
    useEffect(() => {
        if (!mobile) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const navigation = navigationRef.current;
        navigation?.querySelector<HTMLAnchorElement>('a[href]')?.focus();
        function handleKeyboard(event: KeyboardEvent) {
            if (event.key === 'Escape') { event.preventDefault(); setMobile(false); return; }
            if (event.key !== 'Tab' || !navigation) return;
            const links = [...navigation.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
            if (!links.length) return;
            const first = links[0], last = links[links.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
        document.addEventListener('keydown', handleKeyboard);
        return () => { document.removeEventListener('keydown', handleKeyboard); document.body.style.overflow = previousOverflow; menuButtonRef.current?.focus(); };
    }, [mobile]);
    const heading: { [key: string]: [string, string] } = { 'overview': ['Overview', 'Your SEO performance at a glance'], 'projects': ['My Projects', 'Manage all your websites in one place'], 'domain-overview': ['Domain Overview', 'Understand your domain’s organic footprint'], 'keywords': ['Keyword Research', 'Discover and organize your target keywords'], 'position-tracking': ['Position Tracking', 'Monitor visibility across search results'], 'site-audit': ['Site Audit', 'Keep your website healthy and optimized'], 'backlinks': ['Backlink Analytics', 'Explore your off-page authority and links'], 'reports': ['Reports', 'Your performance, beautifully summarized'], 'onboarding': ['Get Started', 'Everything you need to launch your SEO journey'] }; const [title, subtitle] = heading[section] || heading.overview;
    heading.settings = ['Account Settings', 'Your account, workspace, and session'];
    async function logout() {
        setBusy(true);
        try { const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); if (!response.ok) throw await responseError(response, 'Unable to sign out.'); router.replace('/login'); router.refresh(); }
        catch (error) { setMessage(errorMessage(error, 'Unable to sign out.')); }
        finally { setBusy(false); }
    }
    function openProjectEditor(p: Project) { setActive(p.id); setProjectName(p.name); setProjectDomain(p.domain); setFormError(''); setModal('edit-project'); }
    async function deleteProject(p: Project) {
        if (!window.confirm(`Permanently delete "${p.name}" and its tracked keywords, audit records and rankings? This cannot be undone.`)) return;
        setBusy(true);
        try {
            if (!demo) {
                const response = await fetch('/api/projects?id=' + encodeURIComponent(p.id), { method: 'DELETE', credentials: 'same-origin' });
                if (!response.ok) throw await responseError(response, 'Unable to delete project.');
                if (active === p.id) {
                    setActive('');
                    window.sessionStorage.removeItem('searchpilot-active-project');
                }
                await load();
                setMessage('Project permanently deleted.');
            } else {
                setProjects(items => items.filter(item => item.id !== p.id));
                setKeywords(items => items.filter(item => item.projectId !== p.id));
                if (active === p.id) setActive('');
                setMessage('Demo project deleted from this preview session.');
            }
        } catch (error) { setMessage(errorMessage(error, 'Unable to delete project.')); }
        finally { setBusy(false); }
    }
    async function editProject(e: React.FormEvent) {
        e.preventDefault(); if (!project || !projectName.trim() || !projectDomain.trim()) return;
        setBusy(true); setFormError('');
        try {
            const updated = { ...project, name: projectName.trim(), domain: projectDomain.trim().replace(/^https?:\/\//,'').replace(/\/$/,'').toLowerCase() };
            if (!demo) {
                const response = await fetch('/api/projects?id='+encodeURIComponent(project.id), { method:'PATCH', credentials:'same-origin', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ name:updated.name, domain:updated.domain }) });
                if (!response.ok) throw await responseError(response, 'Unable to update project.');
                await load();
                setMessage('Project updated.');
            } else {
                setProjects(items => items.map(item=>item.id===project.id?updated:item));
                setMessage('Project updated in this demo session.');
            }
            setModal(null); setProjectName(''); setProjectDomain('');
        } catch (error) { setFormError(errorMessage(error, 'Unable to update project.')); }
        finally { setBusy(false); }
    }
    async function addProject(e: React.FormEvent) {
        e.preventDefault(); if (!projectName.trim() || !projectDomain.trim()) return; setBusy(true); setFormError('');
        try {
            if (demo) {
                const p = { id: 'demo-' + Date.now(), name: projectName.trim(), domain: projectDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''), createdAt: new Date().toISOString() };
                setProjects(x => [...x, p]); setActive(p.id); setMessage('Demo project added locally.');
            } else {
                const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: projectName.trim(), domain: projectDomain.trim() }) });
                if (!r.ok) throw await responseError(r, 'Unable to create this project.');
                await load(); setMessage('Project created successfully.');
            }
            setModal(null); setProjectName(''); setProjectDomain('');
        } catch (error) { setFormError(errorMessage(error, 'Unable to save project.')); }
        finally { setBusy(false); }
    }
    async function addKeyword(e: React.FormEvent) {
        e.preventDefault(); if (!keywordName.trim() || !project) return; setBusy(true); setFormError('');
        try {
            const position = keywordPosition === '' ? null : Number(keywordPosition);
            const volume = keywordVolume === '' ? null : Number(keywordVolume);
            const difficulty = keywordDifficulty === '' ? null : Number(keywordDifficulty);
            if (position!==null && (!Number.isInteger(position)||position<1||position>1000)) throw new Error('Position must be between 1 and 1000.');
            if (volume!==null && (!Number.isInteger(volume)||volume<0)) throw new Error('Volume must be a nonnegative integer.');
            if (difficulty!==null && (!Number.isInteger(difficulty)||difficulty<0||difficulty>100)) throw new Error('Difficulty must be from 0 to 100.');
            if (demo) {
                setKeywords(x => [{ id: 'demo-' + Date.now(), projectId: project.id, keyword: keywordName.trim(), position: position??0, volume: volume??0, difficulty: difficulty??0, createdAt: new Date().toISOString() }, ...x]);
                setMessage('Demo keyword added locally.');
            } else {
                const r = await fetch('/api/keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, keyword: keywordName.trim(), position, volume, difficulty }) });
                if (!r.ok) throw await responseError(r, 'Unable to add keyword.');
                await load(); setMessage('Keyword added.');
            }
            setModal(null); setKeywordName(''); setKeywordPosition(''); setKeywordVolume(''); setKeywordDifficulty('');
        } catch (error) { setFormError(errorMessage(error, 'Unable to add keyword.')); }
        finally { setBusy(false); }
    }
    async function deleteKeyword(id: string) { if (!demo) { try { const r = await fetch('/api/keywords?id=' + encodeURIComponent(id), { method: 'DELETE' }); if (!r.ok) throw Error('Unable to delete') } catch { setMessage('Could not delete the keyword.'); return } } setKeywords(x => x.filter(k => k.id !== id)); setMessage('Keyword removed.') }
    async function runAudit(e: React.FormEvent) {
        e.preventDefault(); if (!auditDomain.trim()) return; setBusy(true); setFormError('');
        try {
            const r = await fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: auditDomain.trim(), projectId: demo ? undefined : project?.id }) });
            if (!r.ok) throw await responseError(r, 'Audit failed.');
            const d = await r.json(); if (!d.audit) throw Error('No audit returned');
            setAudits(x => [d.audit, ...x]);
            setMessage(d.persisted ? 'Live audit completed and saved.' : 'Live audit completed (not saved; connect PostgreSQL to store results).');
            setModal(null);
        } catch (error) { setFormError(errorMessage(error, 'Unable to run audit.')); }
        finally { setBusy(false); }
    }
    async function exportCsv() {
        if (!project) { setMessage('Select a project to export.'); return; }
        setBusy(true);
        try {
            const url = '/api/reports?kind=keywords&projectId=' + encodeURIComponent(project.id);
            if (demo) throw new Error('CSV exports require a signed-in workspace with saved keywords.');
            const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
            if (!response.ok) throw await responseError(response, 'Unable to export keyword report.');
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            try {
                const link = document.createElement('a');
                link.href = objectUrl;
                link.download = 'searchpilot-keywords.csv';
                document.body.appendChild(link);
                link.click();
                link.remove();
            } finally { URL.revokeObjectURL(objectUrl); }
        } catch (error) { setMessage(errorMessage(error, 'Unable to export keyword report.')); }
        finally { setBusy(false); }
    }
    const navLink = (slug: string) => slug === 'overview' ? '/' : '/' + slug;
    const keywordsTable = (limit?: number) => <div className="table-scroll" tabIndex={0} role="region" aria-label="Tracked keyword table, scroll horizontally to view all columns">
        <table className="data-table">
            <caption className="ui-visually-hidden">Tracked keywords for {project?.domain || 'this project'}. Positions and volumes may be user-entered or illustrative.</caption>
            <thead><tr><th scope="col">KEYWORD</th><th scope="col">POSITION</th><th scope="col">SEARCH VOLUME</th><th scope="col">DIFFICULTY</th><th scope="col">{section === 'keywords' ? 'ACTION' : 'SAMPLE TREND'}</th></tr></thead>
            <tbody>{filteredKeywords.slice(0, limit || 999).map((k, i) => <tr key={k.id}>
                <th scope="row"><span className="keyword-cell"><span className="keyword-dot" aria-hidden="true" />{k.keyword}</span></th>
                <td><span className="position-pill">{k.position || '—'}</span></td>
                <td>{nice(k.volume)}</td>
                <td><span className="difficulty"><i aria-hidden="true" style={{ width: (k.difficulty || 0) + '%', background: k.difficulty > 65 ? '#f0a04e' : k.difficulty > 45 ? '#e2b756' : '#46b798' }} />{k.difficulty || '—'}{k.difficulty ? '%' : ''}</span></td>
                <td>{section === 'keywords' ? <button type="button" className="icon-button" title="Delete keyword" aria-label={'Delete ' + k.keyword} onClick={() => void deleteKeyword(k.id)}><X size={16} aria-hidden="true" /></button> : <span className="positive" aria-label={`Illustrative improvement of ${[3, 2, 5, 1, 4, 2][i % 6]} places`}><ArrowUpRight size={14} aria-hidden="true" />{[3, 2, 5, 1, 4, 2][i % 6]}</span>}</td>
            </tr>)}</tbody>
        </table>
        {!filteredKeywords.length && <Empty label="No keywords for this project yet. Add your first keyword to start tracking." />}
    </div>;
    return <div className="app-shell">
        <a className="ui-skip-link" href="#main-content">Skip to main content</a>
        <header className="topbar">
            <div className="brand"><span className="brand-mark"><ChartNoAxesCombined size={23} strokeWidth={2.7} aria-hidden="true" /></span><span>Search<span className="brand-accent">Pilot</span></span></div>
            <button ref={menuButtonRef} type="button" className="mobile-menu" onClick={() => setMobile(open => !open)} aria-label={mobile ? 'Close navigation menu' : 'Open navigation menu'} aria-controls="primary-navigation" aria-expanded={mobile}><Menu size={22} aria-hidden="true" /></button>
            <span className="topbar-separator" /><div className="topbar-label">SEO Command Center <ChevronRight size={14} aria-hidden="true" /><span>{title}</span></div>
            <div className="topbar-right">
                <div className="header-search"><Search size={16} aria-hidden="true" /><input aria-label="Search keywords" placeholder="Search keywords..." value={search} onChange={e => setSearch(e.target.value)} /><kbd>⌘ K</kbd></div>
                <button type="button" className="top-icon" aria-label="Notifications" onClick={() => setMessage('You’re all caught up!')}><Bell size={19} aria-hidden="true" /><i aria-hidden="true" /></button>
                <button type="button" className="top-icon" aria-label="Help and onboarding" onClick={() => router.push('/get-started')}><CircleHelp size={19} aria-hidden="true" /></button><Link className="avatar" href="/settings" aria-label="Account settings">{(user?.displayName||user?.name)?.trim()?.slice(0,2).toUpperCase() || 'SP'}</Link>
            </div>
        </header>
        <div className="below">
            <aside id="primary-navigation" ref={navigationRef} className={'sidebar ' + (mobile ? 'open' : '')} aria-label="Workspace navigation" aria-hidden={narrow && !mobile || undefined} inert={narrow && !mobile || undefined}>
                <div className="sidebar-main">
                    <div className="sidebar-project-title">CURRENT PROJECT</div>
                    <div className="workspace-project-control"><label htmlFor="workspace-project-select" className="ui-visually-hidden">Active project</label><Globe2 size={16} aria-hidden="true"/><select id="workspace-project-select" value={project?.id || ''} onChange={e=>setActive(e.target.value)}>{projects.length ? projects.map(p=><option key={p.id} value={p.id}>{p.name} · {p.domain}</option>) : <option value="">No projects yet</option>}</select><ChevronDown size={15} aria-hidden="true"/></div>
                    <nav aria-label="SEO tools">{nav.map(group => <div className="nav-group" key={group.title}><div className="nav-label">{group.title}</div>{group.items.map(([slug, label, Icon]) => <Link href={navLink(slug)} onClick={() => setMobile(false)} key={slug} aria-current={section === slug ? 'page' : undefined} className={'nav-item ' + (section === slug ? 'selected' : '')}><Icon size={18} aria-hidden="true" /><span>{label}</span>{slug === 'site-audit' && <span className="nav-count" aria-label="3 sample checks">3</span>}</Link>)}</div>)}</nav>
                </div>
                <div className="sidebar-bottom"><div className="upgrade"><span className="upgrade-spark"><Zap size={17} aria-hidden="true" /></span><strong>Unlock your potential</strong><p>Make smarter SEO decisions with SearchPilot.</p><button type="button" onClick={() => {setMobile(false);router.push('/get-started');}}>Explore features <ArrowRight size={14} aria-hidden="true" /></button></div><button type="button" className="support" onClick={() => {setMobile(false);router.push('/get-started');}}><CircleHelp size={18} aria-hidden="true" /> Help & Support <ArrowUpRight size={14} aria-hidden="true" /></button></div>
            </aside>
            <main id="main-content" className="main-content" tabIndex={-1} inert={mobile || undefined}>
                <div className="page-container" aria-busy={loading}>
                    <div className="intro"><div><div className="breadcrumbs">Workspace <ChevronRight size={13} aria-hidden="true" />{title}</div><h1>{title}{section === 'overview' && <span className="wave" aria-hidden="true">✳</span>}</h1><p>{subtitle}</p></div><div className="intro-actions"><Badge tone="purple" dot>{demo ? 'Demo · sample analytics' : ['overview','domain-overview','backlinks','reports'].includes(section) ? 'Workspace data · source-labelled' : 'Workspace records · manual metrics'}</Badge><Button size="sm" loading={loading} onClick={() => void load()} leadingIcon={<RefreshCw size={15} />}>Refresh</Button><Button variant="primary" size="sm" leadingIcon={<Plus size={17} />} onClick={() => setModal(section === 'site-audit' ? 'audit' : section === 'keywords' || section === 'position-tracking' ? 'keyword' : 'project')}>{section === 'site-audit' ? 'Run audit' : section === 'keywords' || section === 'position-tracking' ? 'Add keyword' : 'New project'}</Button></div></div>
                    {loading && <p role="status" className="ui-loading-note">Updating workspace data…</p>}
                    {loadError && <Alert tone="warning" title="Data connection unavailable" className="ui-workspace-alert" onDismiss={() => setLoadError('')}>{loadError} Local content remains available for preview.</Alert>}
                    {message && <Alert tone={/error|fail|unable|could not|invalid/i.test(message) ? 'error' : 'success'} className="ui-workspace-alert" onDismiss={() => setMessage('')}>{message}</Alert>}
                    {section==='overview'&&gscRows.length>0&&<Panel title="Google Search Console · first-party workspace data" subtitle="Actual stored rows in the last 30 days; not estimated organic traffic, and not necessarily scoped to the selected project.">
                        <div className="metric-grid three">
                            <Metric label="GSC clicks" value={nice(gscRows.reduce((sum,row)=>sum+Number(row.clicks||0),0))} icon={Activity} foot="Official GSC · stored import"/>
                            <Metric label="GSC impressions" value={nice(gscRows.reduce((sum,row)=>sum+Number(row.impressions||0),0))} icon={Search} foot="Official GSC · stored import"/>
                            <Metric label="GSC avg. position" value={(()=>{const impressions=gscRows.reduce((sum,row)=>sum+Number(row.impressions||0),0);return impressions?(gscRows.reduce((sum,row)=>sum+Number(row.averagePosition||0)*Number(row.impressions||0),0)/impressions).toFixed(1):'—'})()} icon={Target} foot="Impression-weighted; not daily SERP rank"/>
                        </div><p className="functional-caption">Source: Google Search Console. The view reads at most 1,000 saved rows and may be incomplete; select a property and inspect the original observations in <Link href="/search-console" className="text-link">Search Console</Link>.</p>
                    </Panel>}
        {!demo && ['overview','domain-overview','backlinks','reports'].includes(section) && <>
            <Panel title={section === 'backlinks' ? 'Backlink research · authorized imports' : section === 'reports' ? 'Reports · saved workspace records' : 'Verified workspace snapshot'} subtitle="Your saved project information is separate from sampled SEO estimates and manually provided positions.">
                <div className="metric-grid three"><Metric label="Tracked keywords" value={String(filteredKeywords.length)} icon={KeyRound} foot="Your workspace · saved records"/><Metric label="Homepage audit" value={audit ? String(audit.score)+'/100' : '—'} icon={ShieldCheck} foot={audit ? 'Saved homepage checks · '+new Date(audit.checkedAt).toLocaleDateString() : 'No homepage audit yet'}/><Metric label="Google Search Console rows" value={String(gscRows.length)} icon={Activity} foot="Stored GSC import · workspace-wide, first 1,000 rows"/></div>
                <div className="report-notes"><p><CheckCircle2 size={18}/> Keyword volumes, ranks and difficulty from manual entry are not provider-verified.</p><p><CheckCircle2 size={18}/> Competitive domain authority, organic traffic and backlinks require a licensed provider. No synthetic measurements appear on this authenticated view.</p><p><CheckCircle2 size={18}/> GSC records can cover multiple properties in the current workspace. Review the authorized property and date ranges before interpreting them.</p></div>
                <div className="functional-toolbar"><Link className="btn primary" href="/search-console">View Google Search Console <ArrowRight size={15}/></Link><Link className="btn" href="/seo-tools">Explore imported research</Link><Link className="btn" href="/report-builder">Create client report</Link><Link className="btn" href="/get-started">Guided setup</Link></div>
            </Panel>
            {section === 'reports' && <Panel title="Saved reporting options" subtitle="No server-side report scheduling or paid access restrictions are enabled."><div className="functional-toolbar"><Link className="btn" href="/report-builder">Open template editor</Link><button type="button" className="btn" onClick={()=>void exportCsv()}>Export CSV for selected project</button></div></Panel>}
            {section === 'backlinks' && <Panel title="Imported backlink observations" subtitle="Manual data, not independently verified crawling"><div className="functional-toolbar"><Link className="btn" href="/seo-backlinks">View source-labeled links</Link><Link className="btn" href="/backlink-audit">Human review queue</Link></div></Panel>}
        </>}
        {section === 'overview' && demo && <><div className="welcome"><div><span className="welcome-eyebrow"><Sparkles size={15} /> YOUR SEO SNAPSHOT</span><h2>Good morning, explorer! 👋</h2><p>Illustrative trends show how your search dashboard will look with connected sources.</p><button onClick={() => router.push('/reports')}>View performance report <ArrowRight size={16} /></button></div><div className="welcome-art"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-chart"><TrendingUp size={66} /></div><div className="art-float"><ArrowUpRight size={17} /> +24.8%</div></div></div><div className="metric-grid"><Metric label="Organic Traffic" value="36.2K" delta="12.8%" icon={Activity} /><Metric label="Total Keywords" value="1,248" delta="8.2%" icon={KeyRound} /><Metric label="Avg. Position" value="8.4" delta="3.6%" icon={Target} /><Metric label="Site Health Score" value={audit ? String(audit.score) + '/100' : '—'} delta="5 pts" icon={ShieldCheck} /></div><div className="two-col wide-left"><Panel title="Organic traffic overview" subtitle="Traffic trends over the last seven months" right={<Badge tone="purple">SAMPLE · Apr–Oct</Badge>}><div className="legend"><span><i className="purple-dot" /> Organic traffic</span><span><i className="teal-dot" /> Paid traffic</span></div><TrendChart /></Panel><Panel title="Site health" subtitle="Technical SEO audit summary" right={<Link href="/site-audit" className="text-link">View audit <ArrowRight size={14} /></Link>}><div className="health-wrap"><div className="health-ring" style={{ background: `conic-gradient(#7664ee ${(audit?.score || 86) * 3.6}deg,#eceafd 0deg)` }}><div><strong>{audit?.score ?? '—'}</strong><span>/ 100</span></div></div><h4>Looking good!</h4><p>Review the latest homepage audit for specific improvements.</p><div className="health-stats"><span><CheckCircle2 size={15} /> Passed <b>24</b></span><span><TriangleAlert size={15} /> Warnings <b>5</b></span></div></div></Panel></div><div className="two-col wide-left"><Panel title="Top performing keywords" subtitle="Keywords driving your search visibility" right={<Link href="/keywords" className="text-link">View all <ArrowRight size={14} /></Link>}>{keywordsTable(4)}</Panel><Panel title="Keyword distribution" subtitle="Ranking positions at a glance"><div className="distribution"><div><span className="mini-dot" style={{ background: '#6d59dc' }} /> Top 3 <strong>32</strong></div><div><span className="mini-dot" style={{ background: '#a096f4' }} /> 4–10 <strong>60</strong></div><div><span className="mini-dot" style={{ background: '#dad7ff' }} /> 11–100 <strong>93</strong></div></div><RankingsChart /></Panel></div></>}
        {section === 'projects' && <>
            <div className="metric-grid three"><Metric label="Total projects" value={String(projects.length)} icon={FolderKanban} foot="In your workspace" /><Metric label="Tracked keywords" value={String(keywords.length)} icon={KeyRound} foot="Across all projects" /><Metric label="Audits recorded" value={String(audits.filter(a=>!a.demo).length)} icon={ShieldCheck} foot="Recorded results" /></div>
            <div className="functional-toolbar"><label className="input-search"><Search size={17}/><input aria-label="Search projects" placeholder="Search project name or domain" value={projectSearch} onChange={e=>setProjectSearch(e.target.value)}/></label><Badge tone="info">{projects.filter(p=>p.name.toLowerCase().includes(projectSearch.toLowerCase())||p.domain.toLowerCase().includes(projectSearch.toLowerCase())).length} matching projects</Badge></div>
            <div className="projects-grid">{projects.filter(p=>p.name.toLowerCase().includes(projectSearch.toLowerCase())||p.domain.toLowerCase().includes(projectSearch.toLowerCase())).map(p=><section className="project-card" key={p.id}><div className="project-card-top"><span className="project-big-icon">{p.name.charAt(0)}</span><Badge tone={p.id===active?'success':'neutral'}>{p.id===active?'Selected':'Project'}</Badge></div><h3>{p.name}</h3><p><Globe2 size={15}/>{p.domain}</p><div className="project-card-foot"><span>Added {new Date(p.createdAt).toLocaleDateString()}</span><button type="button" onClick={()=>openProjectEditor(p)}>Edit project</button></div><div className="project-card-actions"><Button variant="primary" size="sm" onClick={()=>{setActive(p.id);sessionStorage.setItem('searchpilot-active-project',p.id);router.push('/domain-overview')}}>Select & open <ArrowRight size={15}/></Button><Button size="sm" onClick={()=>openProjectEditor(p)}>Edit</Button><Button variant="danger" size="sm" disabled={busy} onClick={()=>void deleteProject(p)}>Delete</Button></div></section>)}<button className="project-create" onClick={()=>setModal('project')}><span><Plus size={26}/></span><strong>Create new project</strong><small>Add a domain to start tracking performance</small></button></div>
            {projects.length===0&&<EmptyState title="No projects yet" description="Create your first project to start organizing keywords and audits." action={<Button variant="primary" onClick={()=>setModal('project')}>Create project</Button>}/>}
        </>}
        {section === 'domain-overview' && demo && <><div className="domain-heading"><div className="domain-icon"><Globe2 size={23} /></div><div><h2>{project?.domain || 'Your domain'}</h2><p>Organic search intelligence overview</p></div><Tag tone="success">Tracked domain</Tag></div><div className="metric-grid"><Metric label="Organic Search Traffic" value="36.2K" delta="12.8%" icon={Activity} /><Metric label="Organic Keywords" value="1,248" delta="8.2%" icon={KeyRound} /><Metric label="Referring Domains" value="568" delta="6.4%" icon={Link2} /><Metric label="Authority Score" value="72" delta="4 pts" icon={ShieldCheck} /></div><Panel title="Traffic & visibility" subtitle="Monthly organic and paid search estimates"><div className="legend"><span><i className="purple-dot" /> Organic</span><span><i className="teal-dot" /> Paid</span></div><TrendChart /></Panel><div className="two-col"><Panel title="Top organic keywords" subtitle="Search terms with the best positions">{keywordsTable(5)}</Panel><Panel title="Ranking progress" subtitle="Keyword movement over time"><RankingsChart /></Panel></div></>}
        {(section === 'keywords' || section === 'position-tracking') && <>
            <div className="metric-grid three"><Metric label="Tracked keywords" value={String(filteredKeywords.length)} icon={KeyRound} foot="Current filtered terms"/><Metric label="Top 10 positions" value={String(filteredKeywords.filter(k=>k.position>0&&k.position<=10).length)} icon={Target} foot="User-entered rank values"/><Metric label="Total search volume" value={nice(filteredKeywords.reduce((total,k)=>total+(k.volume||0),0))} icon={Search} foot={demo?'SAMPLE or manually entered':'Manually entered metric'}/></div>
            <Panel title={section==='keywords'?'Keyword portfolio':'Position tracking'} subtitle="Filter, export and manage tracked keywords for the selected project" right={<div className="panel-actions"><Button size="sm" leadingIcon={<Download size={15}/>} onClick={exportCsv}>Export CSV</Button><Button variant="primary" size="sm" leadingIcon={<Plus size={15}/>} onClick={()=>setModal('keyword')}>Add keyword</Button></div>}>
                <div className="functional-toolbar"><label className="input-search"><Search size={16}/><input aria-label="Filter keywords" placeholder="Search keywords..." value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Position<select value={positionFilter} onChange={e=>setPositionFilter(e.target.value)}><option value="all">All positions</option><option value="top10">Top 10</option><option value="11to20">11–20</option><option value="unranked">Unranked</option></select></label><label>Difficulty<select value={difficultyFilter} onChange={e=>setDifficultyFilter(e.target.value)}><option value="all">All levels</option><option value="easy">Easy (&lt;40)</option><option value="medium">Medium (40–69)</option><option value="hard">Hard (70+)</option></select></label><Button size="sm" variant="ghost" onClick={()=>{setSearch('');setPositionFilter('all');setDifficultyFilter('all')}}>Clear filters</Button></div>
                <p className="functional-caption">{filteredKeywords.length} matching keywords. Ranks and volume are user-entered or SAMPLE; automatic ranking collection is not connected.</p>{keywordsTable()}
            </Panel>
            {section==='position-tracking'&&<Panel title="Sample ranking trend" subtitle="Illustrative monthly trends; this chart is not a live search result feed"><Badge tone="purple">SAMPLE</Badge><RankingsChart/></Panel>}
        </>}
        {section === 'site-audit' && <>
            <div className="audit-summary"><div className="audit-score"><div className="health-ring" style={{background:`conic-gradient(var(--sp-chart-a) ${(audit?.score??0)*3.6}deg,#eceafd 0deg)`}}><div><strong>{audit?.score??'—'}</strong><span>/100</span></div></div><div><Badge tone={audit?.demo?'purple':'info'}>{audit?.demo?'SAMPLE':'Recorded homepage scan'}</Badge><h2>{audit?'Latest technical checks':'Run your first audit'}</h2><p>{audit?.domain||project?.domain||'No domain selected'} · {audit?.checkedAt?new Date(audit.checkedAt).toLocaleString():'No audits yet'}</p></div></div><Button variant="primary" onClick={()=>{setAuditDomain(project?.domain||'');setModal('audit')}}>Run new audit <RefreshCw size={15}/></Button></div>
            <div className="metric-grid three"><Metric label="Checks completed" value={String(audit?.checks?.length??0)} icon={CheckCircle2} foot="Current scan"/><Metric label="Passed" value={String(audit?.checks?.filter(c=>statusOk(c.status)).length??0)} icon={ShieldCheck} foot="Current scan"/><Metric label="Needs attention" value={String(audit?.checks?.filter(c=>!statusOk(c.status)).length??0)} icon={TriangleAlert} foot="Current scan"/></div>
            <Panel title="Technical audit findings" subtitle="Results from the homepage HTML inspection. Select a check for details and next steps." right={<Badge tone="purple">{audit?.demo?'SAMPLE':'Single-page audit'}</Badge>}>
                <div className="functional-toolbar"><label>Result<select value={auditFilter} onChange={e=>setAuditFilter(e.target.value)}><option value="all">All checks</option><option value="passed">Passed</option><option value="issues">Needs attention</option></select></label><label>Audit history<select value={selectedAuditId||audit?.id||''} onChange={e=>setSelectedAuditId(e.target.value)}>{projectAudits.map(a=><option key={a.id} value={a.id}>{new Date(a.checkedAt).toLocaleDateString()} · {a.score}/100</option>)}</select></label></div>
                <div className="audit-list">{auditChecks.map((check,index)=><details className="audit-finding" key={check.name+index}><summary><span className={'audit-check-icon '+(statusOk(check.status)?'ok':'warn')}>{statusOk(check.status)?<Check size={17}/>:<TriangleAlert size={17}/>}</span><strong>{check.name}</strong><Badge tone={statusOk(check.status)?'success':'warning'}>{check.status}</Badge><ChevronDown size={16}/></summary><div className="audit-finding-body"><p>{check.details}</p><strong>Recommended action</strong><p>{check.recommendation}</p></div></details>)}{!auditChecks.length&&<Empty label="No checks match this selection. Run an audit or change the filter."/>}</div>
            </Panel>
        </>}
        {section === 'backlinks' && demo && <><div className="metric-grid"><Metric label="Total backlinks" value="8,429" delta="14.2%" icon={Link2} /><Metric label="Referring domains" value="568" delta="6.4%" icon={Globe2} /><Metric label="Authority score" value="72" delta="4 pts" icon={ShieldCheck} /><Metric label="New links" value="124" delta="18.1%" icon={TrendingUp} /></div><Panel title="Backlink growth" subtitle="Illustrative referring domain growth across recent months"><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={traffic.map((r, i) => ({ m: r.m, links: 320 + i * 35 + [0, 8, -4, 20, 6, 14, 38][i] }))}><CartesianGrid vertical={false} stroke="#edf0f5" strokeDasharray="4 5" /><XAxis dataKey="m" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Area dataKey="links" type="monotone" stroke="#7664ee" strokeWidth={3} fill="#eeebff" /></AreaChart></ResponsiveContainer></div></Panel><Panel title="Recent backlinks" subtitle="Sample referring sources and their link attributes" right={<Tag tone="purple">Illustrative data</Tag>}><div className="table-scroll"><table className="data-table"><thead><tr><th>REFERRING DOMAIN</th><th>AUTHORITY</th><th>LINK TYPE</th><th>ANCHOR TEXT</th><th>DISCOVERED</th></tr></thead><tbody>{backlinks.map(b => <tr key={b.domain}><td><span className="keyword-cell"><Globe2 size={16} />{b.domain}</span></td><td><span className="position-pill">{b.authority}</span></td><td><Tag tone={b.type === 'Follow' ? 'success' : 'neutral'}>{b.type}</Tag></td><td>{b.anchor}</td><td>{b.date}</td></tr>)}</tbody></table></div></Panel></>}
        {section === 'reports' && demo && <><div className="report-banner"><div><span className="welcome-eyebrow"><FileBarChart2 size={15} /> PERFORMANCE REPORT</span><h2>Your SEO progress, in focus.</h2><p>Explore traffic, rankings, and campaign performance from one place.</p></div><div className="flex flex-wrap gap-3"><Link className="btn white" href="/report-builder"><FileBarChart2 size={16}/> Build saved report</Link><button className="btn white" onClick={()=>void exportCsv()}><Download size={16} /> Export keyword report</button></div></div><div className="metric-grid"><Metric label="Organic traffic" value="36.2K" delta="12.8%" icon={Activity} /><Metric label="Search visibility" value="74.6%" delta="6.3%" icon={TrendingUp} /><Metric label="Tracked keywords" value={String(filteredKeywords.length)} icon={KeyRound} foot="Current project" /><Metric label="Site health" value={audit ? String(audit.score) + '/100' : '—'} icon={ShieldCheck} foot="Latest audit" /></div><Panel title="Performance over time" subtitle="Illustrative monthly traffic trend"><TrendChart /></Panel><div className="two-col"><Panel title="Ranking trend" subtitle="Keyword positions across seven months"><RankingsChart /></Panel><Panel title="Reporting notes" subtitle="How to use these insights"><div className="report-notes"><p><CheckCircle2 size={18} /> Traffic charts are illustrative until an external analytics data source is connected.</p><p><CheckCircle2 size={18} /> Projects, keywords, and audits connect to SearchPilot’s own API.</p><p><CheckCircle2 size={18} /> Export your current keyword portfolio as CSV.</p></div></Panel></div></>}
        {section === 'settings' && <div className="settings-layout">
            <Panel title="Your account" subtitle="Information from your authenticated session"><div className="account-details"><span className="account-avatar">{(user?.displayName||user?.name)?.slice(0,2).toUpperCase()||'SP'}</span><div><strong>{user?.displayName||user?.name||'Demo visitor'}</strong><p>{user?.email||'Local demo mode — no authenticated account'}</p><Badge tone={user?'success':'purple'}>{user?'Signed in':'Demo mode'}</Badge></div></div><div className="account-actions">{user?<Button variant="danger" loading={busy} leadingIcon={<LogOut size={16}/>} onClick={()=>void logout()}>Sign out</Button>:<><Link className="ui-button ui-button--primary ui-button--md" href="/login">Sign in</Link><Link className="ui-button ui-button--secondary ui-button--md" href="/register">Create account</Link></>}</div></Panel>
            <Panel title="Workspace preferences" subtitle="Manage your active project and current work"><div className="settings-fields"><label>Active project<select value={project?.id||''} onChange={e=>setActive(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name} · {p.domain}</option>)}</select></label><p>Connected metrics and projects use the backend where available. Example traffic and backlinks are marked SAMPLE.</p><Button onClick={()=>router.push('/projects')}>Manage projects <ArrowRight size={16}/></Button></div></Panel>
        </div>}
        {section === 'onboarding' && <><div className="onboard-hero"><span className="welcome-eyebrow"><Sparkles size={15} /> QUICK START GUIDE</span><h2>Make every search count.</h2><p>Set up your workspace in three simple steps and turn search data into actionable insights.</p><button className="btn white" onClick={() => setModal('project')}><Plus size={16} /> Create a project</button></div><div className="steps">{[{ n: '01', title: 'Add your website', body: 'Create a project with your domain to organize your SEO activity.', icon: Globe2, action: 'Create project', fn: () => setModal('project') }, { n: '02', title: 'Track your keywords', body: 'Add priority search terms and follow their positions in one place.', icon: Target, action: 'Track keywords', fn: () => router.push('/keywords') }, { n: '03', title: 'Audit and improve', body: 'Run an SEO audit to identify technical improvements.', icon: ShieldCheck, action: 'Run an audit', fn: () => { setAuditDomain(project?.domain || ''); setModal('audit') } }].map(s => <div className="step" key={s.n}><span>{s.n}</span><div className="step-icon"><s.icon size={23} /></div><h3>{s.title}</h3><p>{s.body}</p><button onClick={s.fn}>{s.action} <ArrowRight size={16} /></button></div>)}</div></>}
        <footer className="footer"><span>© 2026 SearchPilot · Built for better search decisions</span><span>SearchPilot Analytics <span className="footer-dot" /> All systems ready</span></footer></div></main></div>{mobile && <button className="sidebar-scrim" onClick={() => setMobile(false)} aria-label="Close sidebar" />}
        <Dialog open={Boolean(modal)} onClose={() => { if (!busy) setModal(null); }} labelledBy="workspace-dialog-title" describedBy="workspace-dialog-description">
            <div className="modal">
                <div className="modal-top">
                    <div><span className="modal-kicker">SEARCHPILOT WORKSPACE</span><h2 id="workspace-dialog-title">{modal === 'project' ? 'Create a new project' : modal === 'edit-project' ? 'Edit project' : modal === 'keyword' ? 'Add target keyword' : 'Run a site audit'}</h2><p id="workspace-dialog-description">{modal === 'project' ? 'Start tracking another website.' : modal === 'edit-project' ? 'Update the name and domain of your selected website.' : modal === 'keyword' ? 'Track an important search term for your project.' : 'Check your website for common technical SEO issues.'}</p></div>
                    <button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={() => setModal(null)}><X size={20} /></button>
                </div>
                <form onSubmit={modal === 'project' ? addProject : modal === 'edit-project' ? editProject : modal === 'keyword' ? addKeyword : runAudit}>
                    {formError && <Alert tone="error" title="Couldn't complete this action" className="ui-workspace-alert">{formError}</Alert>}
                    {modal === 'project' || modal === 'edit-project' ? <>
                        <Input label="Project name" required autoFocus value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Northstar Marketing" />
                        <Input label="Website domain" required value={projectDomain} onChange={e => setProjectDomain(e.target.value)} placeholder="example.com" />
                    </> : modal === 'keyword' ? <>
                        <Input label="Selected project" value={project?.name || 'No project'} readOnly />
                        <Input label="Keyword" required autoFocus value={keywordName} onChange={e => setKeywordName(e.target.value)} placeholder="e.g. best seo tools" />
                        <div className="keyword-metric-fields">
                            <Input label="Position (optional)" type="number" min={1} max={1000} value={keywordPosition} onChange={e => setKeywordPosition(e.target.value)} placeholder="e.g. 12" />
                            <Input label="Monthly volume (optional)" type="number" min={0} value={keywordVolume} onChange={e => setKeywordVolume(e.target.value)} placeholder="e.g. 1200" />
                            <Input label="Difficulty (optional)" type="number" min={0} max={100} value={keywordDifficulty} onChange={e => setKeywordDifficulty(e.target.value)} placeholder="0–100" />
                        </div>
                        <p className="functional-caption">Values are manually entered. Automatic SERP tracking is not connected.</p>
                    </> : <Input label="Website domain" required autoFocus value={auditDomain} onChange={e => setAuditDomain(e.target.value)} placeholder="example.com" />}
                    <div className="modal-actions">
                        <Button variant="secondary" disabled={busy} onClick={() => setModal(null)}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={busy} disabled={modal === 'keyword' && !project}>{modal === 'project' ? 'Create project' : modal === 'edit-project' ? 'Save changes' : modal === 'keyword' ? 'Add keyword' : 'Run audit'} <ArrowRight size={15} /></Button>
                    </div>
                </form>
            </div>
        </Dialog></div>
}
