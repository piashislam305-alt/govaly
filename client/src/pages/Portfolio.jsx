import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Command,
  Database,
  Filter,
  Globe2,
  Layers3,
  LayoutDashboard,
  Menu,
  MousePointer2,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import './portfolio.css';

const FILTERS = ['All projects', 'Frontend', 'Full-stack', 'Experimental'];

const PROJECTS = [
  {
    id: '01',
    title: 'AI research workspace',
    eyebrow: 'Flagship build',
    category: 'Full-stack',
    level: 'Advanced',
    time: '3–4 weeks',
    description: 'Turn messy sources into a searchable, cited knowledge base with a calm, command-bar-first UI.',
    tags: ['Next.js', 'OpenAI', 'Postgres'],
    skills: ['AI UX', 'Search', 'Auth'],
    proof: 'Ship a real workflow',
    theme: 'lime',
    icon: Sparkles,
  },
  {
    id: '02',
    title: 'Commerce intelligence',
    eyebrow: 'Data product',
    category: 'Full-stack',
    level: 'Intermediate',
    time: '2–3 weeks',
    description: 'A decision-ready dashboard for inventory, cohorts, and revenue — not another pretty admin panel.',
    tags: ['React', 'Node', 'Prisma'],
    skills: ['Data viz', 'APIs', 'SQL'],
    proof: 'Make data actionable',
    theme: 'coral',
    icon: LayoutDashboard,
  },
  {
    id: '03',
    title: 'Collaborative whiteboard',
    eyebrow: 'Interaction lab',
    category: 'Frontend',
    level: 'Advanced',
    time: '2–3 weeks',
    description: 'A multiplayer canvas that makes real-time state, presence, and tiny moments of delight impossible to ignore.',
    tags: ['React', 'WebSockets', 'Canvas'],
    skills: ['Realtime', 'Motion', 'State'],
    proof: 'Show, don’t tell',
    theme: 'blue',
    icon: Users,
  },
  {
    id: '04',
    title: 'Offline field notes',
    eyebrow: 'Product thinking',
    category: 'Frontend',
    level: 'Intermediate',
    time: '10–14 days',
    description: 'A resilient PWA for people who work between signal bars, with sync states users can actually understand.',
    tags: ['PWA', 'IndexedDB', 'Maps'],
    skills: ['Offline', 'Mobile UI', 'Systems'],
    proof: 'Design for reality',
    theme: 'lavender',
    icon: Globe2,
  },
  {
    id: '05',
    title: 'Design system lab',
    eyebrow: 'Craft & systems',
    category: 'Frontend',
    level: 'Intermediate',
    time: '1–2 weeks',
    description: 'A living component library with accessible primitives, thoughtful tokens, and documentation people want to read.',
    tags: ['Storybook', 'TypeScript', 'MDX'],
    skills: ['A11y', 'Tokens', 'Docs'],
    proof: 'Raise the quality bar',
    theme: 'sun',
    icon: Layers3,
  },
  {
    id: '06',
    title: '3D product studio',
    eyebrow: 'Experimental',
    category: 'Experimental',
    level: 'Advanced',
    time: '2 weeks',
    description: 'A tactile product customizer that proves you can make technical complexity feel effortless in the browser.',
    tags: ['Three.js', 'GSAP', 'WebGL'],
    skills: ['3D', 'Performance', 'UX'],
    proof: 'Create a wow moment',
    theme: 'teal',
    icon: MousePointer2,
  },
];

const STATS = [
  { value: '06', label: 'curated projects', icon: Layers3 },
  { value: '04', label: 'core skills', icon: Code2 },
  { value: '01', label: 'flagship build', icon: Zap },
];

function BrandMark() {
  return (
    <div className="portfolio-brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function ProjectVisual({ project, compact = false }) {
  const Icon = project.icon;
  if (project.theme === 'lime') {
    return (
      <div className={`project-visual visual-lime${compact ? ' visual-compact' : ''}`}>
        <div className="browser-chrome"><i /><i /><i /><span>research-room / overview</span></div>
        <div className="lime-layout">
          <div className="lime-sidebar"><b>atlas</b><span /><span /><span /><span /></div>
          <div className="lime-content">
            <div className="lime-heading"><span>Good morning, Mira</span><em>⌘ K</em></div>
            <div className="lime-search"><Search size={12} /><span>Ask your workspace anything</span><b>↵</b></div>
            <div className="lime-panels"><div /><div /><div /></div>
          </div>
        </div>
        <div className="visual-sticker"><Icon size={15} /> cited by design</div>
      </div>
    );
  }

  if (project.theme === 'coral') {
    return (
      <div className={`project-visual visual-coral${compact ? ' visual-compact' : ''}`}>
        <div className="coral-top"><span>northstar / pulse</span><b><i /> live</b></div>
        <div className="coral-body">
          <div className="coral-total"><small>Net revenue</small><strong>$84,290</strong><em>↗ 18.6%</em></div>
          <div className="coral-chart"><span /><span /><span /><span /><span /><span /><span /><b /></div>
        </div>
        <div className="coral-foot"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div>
        <div className="visual-sticker dark-sticker"><Database size={14} /> decisions, not decoration</div>
      </div>
    );
  }

  if (project.theme === 'blue') {
    return (
      <div className={`project-visual visual-blue${compact ? ' visual-compact' : ''}`}>
        <div className="blue-grid" />
        <div className="blue-toolbar"><span className="blue-logo">room</span><span>Board / Sprint 24</span><b><Users size={12} /> 8 online</b></div>
        <div className="sticky-note note-one">ship small<br /><strong>↗</strong></div>
        <div className="sticky-note note-two">make it<br />obvious</div>
        <div className="cursor cursor-one"><MousePointer2 size={17} fill="currentColor" /><span>Alex</span></div>
        <div className="cursor cursor-two"><MousePointer2 size={17} fill="currentColor" /><span>Jo</span></div>
        <div className="visual-sticker blue-sticker"><Zap size={14} /> zero lag</div>
      </div>
    );
  }

  if (project.theme === 'lavender') {
    return (
      <div className={`project-visual visual-lavender${compact ? ' visual-compact' : ''}`}>
        <div className="phone-frame">
          <div className="phone-notch" />
          <div className="phone-head"><span>07:42</span><b>fieldnotes</b><i>•••</i></div>
          <div className="phone-greeting">Tuesday, 14 May<small>3 notes waiting to sync</small></div>
          <div className="phone-card active-note"><span>●</span><div><b>South ridge visit</b><small>Edited just now</small></div><em>↗</em></div>
          <div className="phone-card"><span>○</span><div><b>Materials / Q2</b><small>Saved offline</small></div><em>⌁</em></div>
        </div>
        <div className="signal-card"><span><i /> offline mode</span><b>Everything<br />is safe.</b><small>Syncs when you’re back.</small></div>
      </div>
    );
  }

  if (project.theme === 'sun') {
    return (
      <div className={`project-visual visual-sun${compact ? ' visual-compact' : ''}`}>
        <div className="sun-top"><span>acme / components</span><b>v2.4.0</b></div>
        <div className="sun-body"><div className="sun-tokens"><i /><i /><i /><i /><i /></div><div className="sun-title"><small>Button / primary</small><span>Build with intent</span></div><div className="sun-actions"><button>Get started <ArrowRight size={12} /></button><button>Read docs</button></div></div>
        <div className="sun-code"><span>01</span><b>intent</b><em>primary</em><span>02</span><b>radius</b><em>999px</em></div>
        <div className="visual-sticker sun-sticker"><Check size={14} /> AA ready</div>
      </div>
    );
  }

  return (
    <div className={`project-visual visual-teal${compact ? ' visual-compact' : ''}`}>
      <div className="teal-orb orb-one" /><div className="teal-orb orb-two" />
      <div className="teal-top"><span>form / studio</span><b><span /> edit mode</b></div>
      <div className="teal-product"><div className="product-shadow" /><div className="product-shape" /><div className="product-highlight" /></div>
      <div className="teal-controls"><span>color</span><i /><i /><i /><b>↗</b></div>
      <div className="visual-sticker teal-sticker"><Sparkles size={14} /> made to move</div>
    </div>
  );
}

function ProjectCard({ project, saved, onSave, onOpen }) {
  return (
    <article className={`project-card project-card-${project.theme}`}>
      <button className="project-card-main" onClick={() => onOpen(project)} aria-label={`View ${project.title} details`}>
        <ProjectVisual project={project} />
        <div className="project-card-content">
          <div className="project-card-meta"><span>{project.eyebrow}</span><span className="project-number">{project.id}</span></div>
          <h3>{project.title}</h3>
          <p>{project.description}</p>
          <div className="project-tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="project-card-footer"><span><Clock3 size={13} /> {project.time}</span><span className="card-link">View brief <ArrowUpRight size={15} /></span></div>
        </div>
      </button>
      <button className={`save-project${saved ? ' saved' : ''}`} onClick={(event) => { event.stopPropagation(); onSave(project.id); }} aria-label={saved ? `Remove ${project.title} from saved projects` : `Save ${project.title}`} aria-pressed={saved}>
        <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}

function DetailModal({ project, onClose }) {
  if (!project) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Close project details"><X size={18} /></button>
        <ProjectVisual project={project} compact />
        <div className="modal-copy">
          <div className="project-card-meta"><span>{project.eyebrow}</span><span className="project-number">{project.id}</span></div>
          <h2 id="project-modal-title">{project.title}</h2>
          <p>{project.description}</p>
          <div className="modal-grid"><div><small>What it proves</small><strong>{project.proof}</strong></div><div><small>Difficulty</small><strong>{project.level}</strong></div><div><small>Core skills</small><strong>{project.skills.join(' · ')}</strong></div><div><small>Build window</small><strong>{project.time}</strong></div></div>
          <div className="modal-bottom"><div className="project-tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><button className="modal-cta" onClick={onClose}>Add to my build plan <Plus size={16} /></button></div>
        </div>
      </section>
    </div>
  );
}

function Sidebar({ activeView, setActiveView, mobileOpen, setMobileOpen }) {
  const items = [
    { label: 'Project library', icon: Layers3, view: 'All projects' },
    { label: 'Build recommendations', icon: Sparkles, view: 'Recommended' },
    { label: 'Stack map', icon: Code2, view: 'Stack map' },
  ];
  return (
    <>
      <aside className={`portfolio-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-head"><div className="brand-lockup"><BrandMark /><span>folio<span>/</span>lab</span></div><button className="mobile-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="sidebar-kicker">Your project index</div>
        <nav className="sidebar-nav" aria-label="Portfolio sections">
          {items.map(({ label, icon: Icon, view }) => (
            <button key={label} className={activeView === view ? 'active' : ''} onClick={() => { setActiveView(view); setMobileOpen(false); }}><Icon size={17} /><span>{label}</span>{activeView === view && <ChevronRight size={15} />}</button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">Quick filters</div>
        <button className="sidebar-quick" onClick={() => { setActiveView('Saved'); setMobileOpen(false); }}><Bookmark size={16} /><span>Saved for later</span><span className="sidebar-count">3</span></button>
        <button className="sidebar-quick" onClick={() => { setActiveView('Ship this month'); setMobileOpen(false); }}><Clock3 size={16} /><span>Ship this month</span></button>
        <div className="sidebar-grow" />
        <div className="plan-card"><div className="plan-card-top"><span>Portfolio plan</span><b>04 / 06</b></div><div className="plan-progress"><i /></div><p>Two strong builds beat six half-finished ideas.</p><button onClick={() => document.getElementById('build-note')?.scrollIntoView({ behavior: 'smooth' })}>Read the rule <ArrowUpRight size={14} /></button></div>
        <div className="sidebar-footer"><span className="status-dot" /> <span>Updated today</span><span className="sidebar-version">v1.0</span></div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    </>
  );
}

export default function Portfolio() {
  const [activeFilter, setActiveFilter] = useState('All projects');
  const [activeView, setActiveView] = useState('All projects');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(new Set(['01', '04', '05']));
  const [selectedProject, setSelectedProject] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.title = 'Folio / lab — projects worth shipping';
    const onKeyDown = (event) => { if (event.key === 'Escape') setSelectedProject(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return PROJECTS.filter((project) => {
      const matchesFilter = activeFilter === 'All projects' || project.category === activeFilter;
      const matchesView = activeView === 'All projects' || activeView === 'Recommended' || activeView === 'Stack map' || activeView === 'Ship this month' || (activeView === 'Saved' && saved.has(project.id));
      const matchesQuery = !normalizedQuery || [project.title, project.description, project.category, ...project.tags, ...project.skills].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesView && matchesQuery;
    });
  }, [activeFilter, activeView, query, saved]);

  const toggleSaved = (id) => setSaved((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectView = (view) => {
    setActiveView(view);
    if (FILTERS.includes(view)) setActiveFilter(view);
    else if (view === 'Recommended') setActiveFilter('All projects');
    else if (view === 'Stack map') setActiveFilter('All projects');
    document.getElementById('project-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="portfolio-shell">
      <Sidebar activeView={activeView} setActiveView={selectView} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="portfolio-main">
        <header className="portfolio-topbar">
          <button className="portfolio-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumb"><span>folio / lab</span><ChevronRight size={14} /><b>project library</b></div>
          <div className="topbar-actions"><button className="command-hint" onClick={() => document.getElementById('project-search')?.focus()}><Command size={13} /><span>Quick find</span><kbd>⌘ K</kbd></button><button className="avatar-button" aria-label="Open profile">AM</button></div>
        </header>

        <div className="portfolio-content">
          <section className="portfolio-intro">
            <div className="intro-copy"><div className="eyebrow-pill"><span /> curated for your next case study</div><h1>Projects worth<br /><em>shipping.</em></h1><p>The best portfolio project is a small product with a sharp point of view. Pick one, make it useful, and leave no rough edges.</p></div>
            <div className="intro-orbit" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-core"><Sparkles size={22} /></div><span className="orbit-label label-top">make it real</span><span className="orbit-label label-right">show your thinking</span><span className="orbit-label label-bottom">ship with proof</span></div>
          </section>

          <section className="stats-row" aria-label="Project list summary">{STATS.map(({ value, label, icon: Icon }) => <div className="stat-item" key={label}><span className="stat-icon"><Icon size={16} /></span><strong>{value}</strong><span>{label}</span></div>)}<div className="stats-note"><span>Built for</span><b>curious makers ↗</b></div></section>

          <section className="featured-project">
            <div className="featured-copy"><div className="featured-label"><span className="featured-dot" /> Start here <span>01 / 06</span></div><h2>One memorable<br /><em>flagship build.</em></h2><p>Go deep on one idea that shows how you think, not just what you can code. This is the project people remember after the tab is closed.</p><button className="featured-button" onClick={() => setSelectedProject(PROJECTS[0])}>Open the brief <ArrowUpRight size={16} /></button></div>
            <div className="featured-art"><ProjectVisual project={PROJECTS[0]} /></div>
          </section>

          <section className="library-section" id="project-library">
            <div className="section-heading"><div><div className="section-kicker">The library</div><h2>Choose your next build</h2></div><span className="result-count">{filteredProjects.length.toString().padStart(2, '0')} ideas</span></div>
            <div className="library-toolbar"><div className="filter-pills" role="tablist" aria-label="Filter projects">{FILTERS.map((filter) => <button key={filter} role="tab" aria-selected={activeFilter === filter} className={activeFilter === filter ? 'active' : ''} onClick={() => { setActiveFilter(filter); setActiveView(filter === 'All projects' ? 'All projects' : filter); }}>{filter}</button>)}</div><label className="project-search"><Search size={16} /><input id="project-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, skills..." /><kbd>/</kbd></label><button className="filter-button" aria-label="More filters"><Filter size={15} /><span>Filter</span></button></div>
            {filteredProjects.length > 0 ? <div className="project-grid">{filteredProjects.map((project) => <ProjectCard key={project.id} project={project} saved={saved.has(project.id)} onSave={toggleSaved} onOpen={setSelectedProject} />)}</div> : <div className="empty-state"><div><Search size={22} /></div><h3>No projects found</h3><p>Try a different phrase or clear your filters.</p><button onClick={() => { setQuery(''); setActiveFilter('All projects'); setActiveView('All projects'); }}>Clear filters</button></div>}
          </section>

          <section className="build-note" id="build-note"><div className="note-mark"><Zap size={18} /></div><div><div className="section-kicker">A note from the lab</div><h2>Make the work easy to talk about.</h2><p>Every project here has a built-in story: a real user, a clear constraint, and one detail worth zooming in on. That’s what turns a demo into a portfolio piece.</p></div><div className="note-rule"><span>the rule</span><strong>Useful<br />&gt; impressive</strong></div></section>

          <footer className="portfolio-footer"><div className="footer-brand"><BrandMark /><span>folio<span>/</span>lab</span></div><span>an opinionated project index for the web-curious</span><span className="footer-right">made with intent <span>·</span> 2025</span></footer>
        </div>
      </main>
      <DetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
