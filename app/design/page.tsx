'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, ArrowRight, Download, Globe2, Layers3, Plus, Search, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { Alert, Badge, Button, Card, Dialog, EmptyState, Input, MetricCard } from '@/components/ui';

export default function DesignShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [saved, setSaved] = useState('');
  const [notification, setNotification] = useState(true);
  const [pending, setPending] = useState(false);

  return <main className="ui-showcase">
    <div className="ui-showcase__wrap">
      <header className="ui-showcase__hero">
        <Link href="/" className="ui-showcase__back"><ArrowLeft size={16} aria-hidden="true" /> Return to SearchPilot</Link>
        <div className="ui-showcase__hero-content"><span className="ui-showcase__eyebrow"><Sparkles size={16} aria-hidden="true" /> DESIGN SYSTEM / V1</span>
          <h1>Designed for clearer decisions.</h1>
          <p>A compact, accessible interface language for SearchPilot. Semantic styles, responsive components and real interaction states.</p>
          <div className="ui-showcase__hero-actions"><Button variant="white" leadingIcon={<Layers3 size={16} />} onClick={() => setDialogOpen(true)}>Open sample dialog</Button><Button variant="ghost" onClick={() => document.getElementById('components')?.scrollIntoView({ behavior: 'smooth' })}>Explore components <ArrowRight size={16} /></Button></div>
        </div>
        <span className="ui-showcase__orb" aria-hidden="true" />
      </header>

      <section className="ui-showcase__section" id="components" aria-labelledby="section-components">
        <div className="ui-showcase__section-heading"><span className="ui-showcase__step">01 / BUILDING BLOCKS</span><h2 id="section-components">Buttons & indicators</h2><p>Primary actions are clear, secondary actions are quiet, and feedback always carries a text label.</p></div>
        <Card className="ui-showcase__demo-card">
          <div className="ui-showcase__labels"><span>BUTTON VARIANTS</span></div>
          <div className="ui-showcase__row"><Button variant="primary" leadingIcon={<Plus size={16} />} onClick={() => setDialogOpen(true)}>New project</Button><Button variant="secondary" leadingIcon={<Download size={16} />} onClick={() => setSaved('This is a sample export action.')}>Export report</Button><Button variant="ghost">Ghost action</Button><Button variant="danger" onClick={() => setSaved('Danger actions require confirmation.')}>Delete</Button><Button loading>Processing</Button><Button disabled>Disabled</Button></div>
          <div className="ui-showcase__labels"><span>STATE LABELS</span></div>
          <div className="ui-showcase__row"><Badge tone="success" dot>Healthy</Badge><Badge tone="warning" dot>Needs attention</Badge><Badge tone="danger" dot>Failed</Badge><Badge tone="info" dot>Syncing</Badge><Badge tone="purple">Premium</Badge><Badge>Draft</Badge></div>
        </Card>
      </section>

      <section className="ui-showcase__section" aria-labelledby="metrics-heading">
        <div className="ui-showcase__section-heading"><span className="ui-showcase__step">02 / ANALYTICS</span><h2 id="metrics-heading">Metric cards</h2><p>Numbers have understandable labels, context, trends and provenance.</p></div>
        <div className="ui-showcase__metrics"><MetricCard label="Organic traffic" value="36.2K" delta="+12.8%" icon={Activity} sample /><MetricCard label="Ranked keywords" value="1,248" delta="+8.2%" icon={Target} sample /><MetricCard label="Site health" value="86 / 100" icon={ShieldCheck} foot="Latest recorded audit" /><MetricCard label="Referring domains" value="568" icon={Globe2} sample /></div>
      </section>

      <section className="ui-showcase__section" aria-labelledby="forms-heading">
        <div className="ui-showcase__section-heading"><span className="ui-showcase__step">03 / INTERACTION STATES</span><h2 id="forms-heading">Forms, feedback & empty states</h2><p>Readable labels, keyboard focus, helpful errors, and clear next steps.</p></div>
        <div className="ui-showcase__two">
          <Card title="Keyword entry" description="Example of a labelled, accessible field" className="ui-showcase__demo-card">
            <form className="ui-showcase__form" onSubmit={event => {event.preventDefault();setSaved(`Saved “${keyword}” to the local preview.`);setKeyword('');}}>
              <Input label="Keyword phrase" placeholder="e.g. technical SEO audit" value={keyword} onChange={event => setKeyword(event.target.value)} required hint="Enter a phrase to preview the form experience." />
              <Input label="Read-only source" value="Google Search Console (not connected)" readOnly />
              <Button type="submit" variant="primary" leadingIcon={<Search size={16} />}>Add keyword</Button>
            </form>
            {saved && <Alert tone="success" title="Preview feedback" className="ui-showcase__inline-alert" onDismiss={() => setSaved('')}>{saved}</Alert>}
          </Card>
          <Card title="Feedback patterns" description="Accessible messages and zero-result states" className="ui-showcase__demo-card">
            {notification && <Alert tone="warning" title="No live provider" onDismiss={() => setNotification(false)}>Keyword volume is illustrative until a source is connected.</Alert>}
            <EmptyState title="No matching results" description="Try another search phrase or update your filters." icon={Search} compact action={<Button size="sm" variant="secondary" onClick={() => setNotification(true)}>Reset filters</Button>} />
          </Card>
        </div>
      </section>

      <section className="ui-showcase__section" aria-labelledby="accessibility-heading">
        <div className="ui-showcase__section-heading"><span className="ui-showcase__step">04 / ACCESSIBILITY</span><h2 id="accessibility-heading">Interaction quality</h2><p>Tab through controls, activate with Enter or Space, and close dialogs with Escape. Motion is reduced when requested.</p></div>
        <Card className="ui-showcase__demo-card"><div className="ui-showcase__row">
          <Button variant="primary" onClick={() => setDialogOpen(true)}>Open focus-managed dialog</Button>
          <Button variant="secondary" loading={pending} onClick={() => {setPending(true);window.setTimeout(() => setPending(false),850);}}>Preview loading state</Button>
          <Badge tone="info">WCAG-focused interactions</Badge>
        </div></Card>
      </section>
      <footer className="ui-showcase__footer">SearchPilot Design System · Original interface components · <Link href="/">Open dashboard <ArrowRight size={13} aria-hidden="true" /></Link></footer>
    </div>
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} labelledBy="showcase-dialog-title" describedBy="showcase-dialog-description">
      <div className="ui-showcase__modal">
        <div className="ui-showcase__modal-icon"><Layers3 size={24} aria-hidden="true" /></div>
        <h2 id="showcase-dialog-title">A focus-managed dialog</h2>
        <p id="showcase-dialog-description">Keyboard focus stays inside this dialog. Press Escape or choose Close to return to your previous control.</p>
        <div className="ui-showcase__modal-actions"><Button onClick={() => setDialogOpen(false)}>Close</Button><Button variant="primary" onClick={() => setDialogOpen(false)}>Done <ArrowRight size={16} /></Button></div>
      </div>
    </Dialog>
  </main>;
}
