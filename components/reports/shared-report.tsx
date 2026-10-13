type SharedReport={title:string;domain:string;sections:string[];expiresAt:string};
export default function SharedReport({report}:{report:SharedReport}){
  return <main className="mx-auto max-w-3xl px-5 py-12 text-slate-900">
    <header className="border-b pb-6">
      <p className="text-sm font-semibold text-slate-600">SearchPilot · Shared report preview</p>
      <h1 className="mt-3 text-3xl font-bold">{report.title}</h1>
      <p className="mt-3 text-sm">Project domain: <span className="font-medium">{report.domain}</span></p>
    </header>
    <section className="mt-6 rounded-xl border bg-slate-50 p-5 text-sm leading-6">
      <h2 className="font-semibold">Limited read-only share</h2>
      <p className="mt-2">This link includes only the saved report title, project domain and section headings. It does not reveal keywords, audits, metrics, notes, Search Console data or workspace details. Anyone with the link may view these fields until the link expires or is revoked.</p>
      <p className="mt-2">Link expires: {new Date(report.expiresAt).toLocaleString()}</p>
    </section>
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Report outline</h2>
      <ol className="mt-3 list-inside list-decimal space-y-3">{report.sections.map((section,index)=><li key={index} className="rounded-lg border p-3">{section}</li>)}</ol>
    </section>
  </main>;
}
