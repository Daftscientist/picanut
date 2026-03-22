import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Layers3,
  Printer,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';

const featureCards = [
  {
    icon: Workflow,
    eyebrow: 'Order Flow',
    title: 'Move from intake to print without friction.',
    body: 'WooCommerce orders, product variants, and print actions stay in one operational canopy instead of scattered tabs.',
  },
  {
    icon: ScanLine,
    eyebrow: 'Floor Speed',
    title: 'Built for motion, not back-office lag.',
    body: 'Fast lookups, large hit areas, and mobile-friendly flows keep warehouse and storefront teams in sync.',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Control',
    title: 'Permission-aware by design.',
    body: 'Managers, sub-users, and platform admins each get a clearer, calmer workspace matched to their responsibility.',
  },
];

const signals = [
  { value: '99.9%', label: 'service uptime' },
  { value: '<2 min', label: 'typical label prep loop' },
  { value: 'multi-role', label: 'teams supported natively' },
];

export default function Landing() {
  return (
    <div className="boreal-app boreal-landing-page">
      <div className="boreal-atmosphere" />

      <header className="boreal-topbar boreal-topbar--transparent">
        <Link to="/" className="boreal-brand">
          <span className="boreal-brand__mark">
            <Printer size={18} />
          </span>
          <strong>Canopy<small>order fulfillment</small></strong>
        </Link>

        <nav className="boreal-topnav">
          <a href="#capabilities" className="boreal-topnav__item">Capabilities</a>
          <Link to="/pricing" className="boreal-topnav__item">Pricing</Link>
          <Link to="/login" className="boreal-topnav__item">Login</Link>
          <Link to="/signup" className="boreal-button boreal-button--primary">
            Start free trial
          </Link>
        </nav>
      </header>

      <main className="boreal-content"> {/* Reusing boreal-content for main area */}
        <section className="boreal-hero">
          <div className="boreal-hero__copy">
            <div className="boreal-ai-pill">
              <Sparkles size={14} />
              The digital arboretum for modern fulfillment teams
            </div>

            <h1 className="boreal-hero__title">
              Fulfillment at the speed of instinct, with the calm of a well-designed system.
            </h1>

            <p className="boreal-hero__body">
              Canopy unifies products, orders, print queues, and local label output into a single operational surface. It
              trades clutter for rhythm: fewer dividers, clearer layers, faster action.
            </p>

            <div className="boreal-hero__actions">
              <Link to="/signup" className="boreal-button boreal-button--primary boreal-button--large">
                Start free trial
                <ArrowRight size={16} />
              </Link>
              <Link to="/pricing" className="boreal-button boreal-button--secondary boreal-button--large">
                View plans
              </Link>
            </div>

            <div className="boreal-stats-grid"> {/* Adapting marketing-signals */}
              {signals.map((signal) => (
                <div key={signal.label} className="boreal-card boreal-card--soft">
                  <strong>{signal.value}</strong>
                  <small>{signal.label}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="boreal-hero__visual">
            <div className="boreal-orb boreal-orb--one" />
            <div className="boreal-orb boreal-orb--two" />

            <div className="boreal-card boreal-dashboard-preview"> {/* Adapting dashboard-preview */}
              <div className="boreal-card__header">
                <div>
                  <p className="boreal-label">Operations canopy</p>
                  <h2>Clear decisions, fast print flow.</h2>
                </div>
                <div className="boreal-ai-pill">
                  <CheckCircle2 size={14} />
                  Auto-print online
                </div>
              </div>

              <div className="boreal-quick-grid" style={{ padding: '1rem' }}> {/* Adapting dashboard-preview__grid */}
                <div className="boreal-card boreal-card--soft">
                  <p className="boreal-label">Today</p>
                  <strong>248 labels sent</strong>
                  <span>Across store, returns, and warehouse batches.</span>
                </div>
                <div className="boreal-card boreal-card--soft">
                  <p className="boreal-label">Queue</p>
                  <strong>12 pending orders</strong>
                  <span>Ready for pick, print, and handoff.</span>
                </div>
              </div>

              <div className="boreal-feed-card" style={{ marginTop: '1rem' }}> {/* Adapting dashboard-preview__feed */}
                <div className="boreal-feed-card__header" style={{ padding: '1rem 1.5rem', borderBottom: 'none' }}>
                  <div>
                    <p className="boreal-label">Live stream</p>
                    <h3>Fulfillment feed</h3>
                  </div>
                  <span className="boreal-ai-pill">stable sync</span>
                </div>

                <div className="boreal-list">
                  {[
                    ['CP-9821', '4x Standard Shelf Labels', 'auto-printed'],
                    ['CP-9820', '12x Thermal Paper Rolls', 'pending'],
                    ['CP-9819', '2x Eco Packaging Tape', 'fulfilled'],
                  ].map(([order, item, status]) => (
                    <div key={order} className="boreal-list-item">
                      <div>
                        <strong>#{order}</strong>
                        <span>{item}</span>
                      </div>
                      <em className="boreal-tag boreal-tag--neutral">{status}</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="boreal-section"> {/* Adapting marketing-section */}
          <div className="boreal-section__header">
            <p className="boreal-label">Capabilities</p>
            <h2>Operational software shaped like an instrument, not a spreadsheet.</h2>
            <p>
              Every surface is designed around tonal hierarchy, editorial spacing, and high-confidence actions for teams
              working under time pressure.
            </p>
          </div>

          <div className="boreal-feature-grid"> {/* Adapting marketing-feature-grid */}
            {featureCards.map((card) => (
              <article key={card.title} className="boreal-card boreal-feature-card">
                <div className="boreal-feature-card__icon">
                  <card.icon size={18} className="boreal-material" />
                </div>
                <p className="boreal-label">{card.eyebrow}</p>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="boreal-section boreal-section--band"> {/* Adapting marketing-band */}
          <div className="boreal-section__copy">
            <p className="boreal-label">Why teams switch</p>
            <h2>More signal. Less visual friction.</h2>
            <p>
              The canopy system replaces hard dividers and generic admin chrome with layered surfaces, floating controls,
              and calm navigation islands that keep dense workflows readable.
            </p>
          </div>

          <div className="boreal-stats-grid"> {/* Adapting marketing-band__stats */}
            <article className="boreal-card boreal-card--soft">
              <BarChart3 size={18} className="boreal-material" />
              <strong>Usage-aware dashboards</strong>
              <span>Quota, queue pressure, and agent status stay visible without overwhelming the eye.</span>
            </article>
            <article className="boreal-card boreal-card--soft">
              <Layers3 size={18} className="boreal-material" />
              <strong>Tonal layering</strong>
              <span>Cards, tools, and contextual regions are separated by surfaces and depth, not boxed borders.</span>
            </article>
          </div>
        </section>

        <section className="boreal-section boreal-section--cta boreal-card boreal-card--hero"> {/* Adapting marketing-cta */}
          <div>
            <p className="boreal-label">Start here</p>
            <h2>Grow your label operation inside a calmer, sharper interface.</h2>
            <p>
              Create a workspace for your team, connect your printer flow, and move from incoming order to printed label
              with less friction.
            </p>
          </div>

          <div className="boreal-actions"> {/* Adapting marketing-cta__actions */}
            <Link to="/signup" className="boreal-button boreal-button--primary boreal-button--large">
              Create account
            </Link>
            <Link to="/login" className="boreal-button boreal-button--secondary boreal-button--large">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
