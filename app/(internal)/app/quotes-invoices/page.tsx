'use client';

import { useState } from 'react';
import { useStaffSession } from '@/components/staff-shell';

export default function QuotesInvoicesPage() {
  const session = useStaffSession();
  const [quoteStatus, setQuoteStatus] = useState<'draft' | 'sent' | 'finalized'>('draft');
  const [invoiceStatus, setInvoiceStatus] = useState<'draft' | 'sent' | 'finalized'>('draft');
  const [notice, setNotice] = useState('');

  const sendDraft = (entity: 'quote' | 'invoice') => {
    if (entity === 'quote') setQuoteStatus('sent');
    if (entity === 'invoice') setInvoiceStatus('sent');
    setNotice(`Draft ${entity} sent. Admin notification created: “Finalize needed”.`);
  };

  const finalize = (entity: 'quote' | 'invoice') => {
    if (session.role !== 'Admin') {
      setNotice('Only Admin can finalize quotes and invoices.');
      return;
    }
    if (entity === 'quote') setQuoteStatus('finalized');
    if (entity === 'invoice') setInvoiceStatus('finalized');
    setNotice(`${entity} finalized by admin.`);
  };

  const canESign = quoteStatus === 'finalized' && invoiceStatus === 'finalized';

  return (
    <div className="card">
      <h3>Draft/finalize workflow</h3>
      <p>Quote status: {quoteStatus}</p>
      <p>Invoice status: {invoiceStatus}</p>
      <div className="stack-row">
        <button type="button" onClick={() => sendDraft('quote')}>Send quote draft</button>
        <button type="button" onClick={() => sendDraft('invoice')}>Send invoice draft</button>
        <button type="button" onClick={() => finalize('quote')}>Finalize quote</button>
        <button type="button" onClick={() => finalize('invoice')}>Finalize invoice</button>
      </div>
      <button type="button" disabled={!canESign}>Customer e-sign</button>
      {!canESign ? <p>E-sign is disabled until admin finalizes both documents.</p> : null}
      {notice ? <p>{notice}</p> : null}
    </div>
  );
}
