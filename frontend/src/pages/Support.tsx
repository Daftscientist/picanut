import { LifeBuoy, MessageSquareMore, TicketPlus } from 'lucide-react';

export default function Support() {
  return (
    <div className="mock-page">
      <div className="mock-page__grid">
        <div className="mock-page__main">
          <section className="mock-feed-card">
            <div className="mock-feed-card__header">
              <div>
                <h2>Support and Help Desk</h2>
                <p>A support surface is in place so ticketing can land cleanly once the backend support model is implemented.</p>
              </div>
              <button type="button" className="mock-action-solid">
                <TicketPlus size={14} />
                New Ticket
              </button>
            </div>
            <div className="mock-surface--padded">
              <div className="mock-list">
                <div className="mock-list-row">
                  <div className="mock-list-row__main">
                    <strong>Ticketing schema not active</strong>
                    <span>The restored `006/007` migrations are compatibility placeholders, not live support tables.</span>
                  </div>
                  <TicketPlus size={18} />
                </div>
                <div className="mock-list-row">
                  <div className="mock-list-row__main">
                    <strong>Reply workflow pending</strong>
                    <span>No current API route exists for org-to-platform support conversations.</span>
                  </div>
                  <MessageSquareMore size={18} />
                </div>
                <div className="mock-list-row">
                  <div className="mock-list-row__main">
                    <strong>Operational triage</strong>
                    <span>Support will eventually link incidents to billing, agent connectivity, or order ingest issues.</span>
                  </div>
                  <LifeBuoy size={18} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="mock-page__rail">
          <section className="mock-rail-card">
            <div className="mock-rail-card__header">
              <strong>Target Experience</strong>
            </div>
            <div className="mock-meta-list">
              <div>
                <strong>Create ticket</strong>
                <span>Managers describe the issue, severity, and affected workflow.</span>
              </div>
              <div>
                <strong>Threaded replies</strong>
                <span>Platform staff and organization managers exchange updates in one place.</span>
              </div>
              <div>
                <strong>Operational triage</strong>
                <span>Support can link incidents to the exact workflow that failed.</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
