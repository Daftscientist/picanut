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
    <div className="marketing-shell">
      <div className="marketing-atmosphere" />

      <header className="marketing-nav canopy-glass">
        <Link to="/" className="brand-mark">
          <span className="brand-mark__icon">
            <Printer size={18} />
          </span>
          <span>
            <strong>Canopy</strong>
            <small>order fulfillment</small>
          </span>
        </Link>

        <nav className="marketing-nav__links">
          <a href="#capabilities">Capabilities</a>
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Login</Link>
          <Link to="/signup" className="canopy-button canopy-button--primary">
            Start free trial
          </Link>
        </nav>
      </header>

      <main className="marketing-main">
        <section className="marketing-hero">
          <div className="marketing-hero__copy">
            <div className="canopy-chip">
              <Sparkles size={14} />
              The digital arboretum for modern fulfillment teams
            </div>

            <h1 className="marketing-hero__title">
              Fulfillment at the speed of instinct, with the calm of a well-designed system.
            </h1>

            <p className="marketing-hero__body">
              Canopy unifies products, orders, print queues, and local label output into a single operational surface. It
              trades clutter for rhythm: fewer dividers, clearer layers, faster action.
            </p>

            <div className="marketing-hero__actions">
              <Link to="/signup" className="canopy-button canopy-button--primary canopy-button--large">
                Start free trial
                <ArrowRight size={16} />
              </Link>
              <Link to="/pricing" className="canopy-button canopy-button--secondary canopy-button--large">
                View plans
              </Link>
            </div>

            <div className="marketing-signals">
              {signals.map((signal) => (
                <div key={signal.label} className="marketing-signal canopy-panel canopy-panel--soft">
                  <span>{signal.value}</span>
                  <small>{signal.label}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="marketing-hero__visual">
            <div className="marketing-orb marketing-orb--one" />
            <div className="marketing-orb marketing-orb--two" />

            <div className="dashboard-preview canopy-panel">
              <div className="dashboard-preview__top">
                <div>
                  <p className="canopy-label">Operations canopy</p>
                  <h2>Clear decisions, fast print flow.</h2>
                </div>
                <div className="canopy-chip canopy-chip--quiet">
                  <CheckCircle2 size={14} />
                  Auto-print online
                </div>
              </div>

              <div className="dashboard-preview__grid">
                <article className="canopy-panel canopy-panel--soft">
                  <p className="canopy-label">Today</p>
                  <strong>248 labels sent</strong>
                  <span>Across store, returns, and warehouse batches.</span>
                </article>
                <article className="canopy-panel canopy-panel--soft">
                  <p className="canopy-label">Queue</p>
                  <strong>12 pending orders</strong>
                  <span>Ready for pick, print, and handoff.</span>
                </article>
              </div>

              <div className="dashboard-preview__feed canopy-panel canopy-panel--inset">
                <div className="dashboard-preview__feed-head">
                  <div>
                    <p className="canopy-label">Live stream</p>
                    <h3>Fulfillment feed</h3>
                  </div>
                  <span className="canopy-chip canopy-chip--quiet">stable sync</span>
                </div>

                {[
                  ['CP-9821', '4x Standard Shelf Labels', 'auto-printed'],
                  ['CP-9820', '12x Thermal Paper Rolls', 'pending'],
                  ['CP-9819', '2x Eco Packaging Tape', 'fulfilled'],
                ].map(([order, item, status]) => (
                  <div key={order} className="dashboard-preview__row">
                    <div>
                      <strong>#{order}</strong>
                      <span>{item}</span>
                    </div>
                    <em>{status}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="marketing-section">
          <div className="marketing-section__header">
            <p className="canopy-label">Capabilities</p>
            <h2>Operational software shaped like an instrument, not a spreadsheet.</h2>
            <p>
              Every surface is designed around tonal hierarchy, editorial spacing, and high-confidence actions for teams
              working under time pressure.
            </p>
          </div>

          <div className="marketing-feature-grid">
            {featureCards.map((card) => (
              <article key={card.title} className="canopy-panel marketing-feature">
                <div className="marketing-feature__icon">
                  <card.icon size={18} />
                </div>
                <p className="canopy-label">{card.eyebrow}</p>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-band">
          <div className="marketing-band__copy">
            <p className="canopy-label">Why teams switch</p>
            <h2>More signal. Less visual friction.</h2>
            <p>
              The canopy system replaces hard dividers and generic admin chrome with layered surfaces, floating controls,
              and calm navigation islands that keep dense workflows readable.
            </p>
          </div>

          <div className="marketing-band__stats">
            <article className="canopy-panel canopy-panel--soft">
              <BarChart3 size={18} />
              <strong>Usage-aware dashboards</strong>
              <span>Quota, queue pressure, and agent status stay visible without overwhelming the eye.</span>
            </article>
            <article className="canopy-panel canopy-panel--soft">
              <Layers3 size={18} />
              <strong>Tonal layering</strong>
              <span>Cards, tools, and contextual regions are separated by surfaces and depth, not boxed borders.</span>
            </article>
          </div>
        </section>

        <section className="marketing-cta canopy-panel canopy-panel--hero">
          <div>
            <p className="canopy-label canopy-label--inverse">Start here</p>
            <h2>Grow your label operation inside a calmer, sharper interface.</h2>
            <p>
              Create a workspace for your team, connect your printer flow, and move from incoming order to printed label
              with less friction.
            </p>
          </div>

          <div className="marketing-cta__actions">
            <Link to="/signup" className="canopy-button canopy-button--light canopy-button--large">
              Create account
            </Link>
            <Link to="/login" className="canopy-button canopy-button--ghost-light canopy-button--large">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
