export default function QuotesInvoicesPage() {
  const finalizedByAdminAt = null;
  const canESign = Boolean(finalizedByAdminAt);

  return (
    <div className="card">
      <h3>Quotes & Invoices</h3>
      <p>Office can send drafts, but only Admin can finalize.</p>
      <button type="button" disabled={!canESign}>
        E-sign
      </button>
      {!canESign ? <p>E-sign is disabled until finalized_by_admin_at is set by Admin.</p> : null}
    </div>
  );
}
