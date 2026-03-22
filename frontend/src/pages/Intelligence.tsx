import { BrainCircuit, ScanSearch, TrendingUp, TriangleAlert } from 'lucide-react';

export default function Intelligence() {
  return (
    <div className="mock-page">
      <div className="mock-page__grid">
        <div className="mock-page__main">
          <section className="mock-feed-card">
            <div className="mock-feed-card__header">
              <div>
                <h2>AI-Assisted Operational Visibility</h2>
                <p>Use the same calm internal layout for predictive signals, SKU mapping, and workflow guidance.</p>
              </div>
              <div className="mock-ai-chip">
                <BrainCircuit size={14} />
                Intelligence Preview
              </div>
            </div>
            <div className="mock-surface--padded">
              <div className="mock-list">
                <div className="mock-list-row">
                  <div className="mock-list-row__main">
                    <strong>Peak Timing Forecast</strong>
                    <span>Friday 14:00 to 17:00 shows the next likely fulfillment spike.</span>
                  </div>
                  <TrendingUp size={18} />
                </div>
                <div className="mock-list-row">
                  <div className="mock-list-row__main">
                    <strong>SKU Reconciliation</strong>
                    <span>Two candidate mismatches are ready for auto-mapper review.</span>
                  </div>
                  <ScanSearch size={18} />
                </div>
                <div className="mock-list-row">
                  <div className="mock-list-row__main">
                    <strong>Template Assistance</strong>
                    <span>Layout guidance can improve hierarchy, barcode position, and scan reliability.</span>
                  </div>
                  <TriangleAlert size={18} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="mock-page__rail">
          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Roadmap-Ready Zones</strong>
            </div>
            <div className="mock-meta-list">
              <div>
                <strong>Product auto-mapper API</strong>
                <span>Resolve mismatched SKUs from WooCommerce and Shopify payloads.</span>
              </div>
              <div>
                <strong>Usage forecast engine</strong>
                <span>Predict tape depletion, stock usage, and shift demand.</span>
              </div>
              <div>
                <strong>Anomaly detector</strong>
                <span>Flag irregular order bursts, quantity outliers, or suspicious activity.</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
