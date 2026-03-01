import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getPortalSession } from '@/lib/portal-auth';
import { getRequestedStaffRole, requireStaffRole } from '@/lib/staff-auth';

export const runtime = 'nodejs';

type ThreadRow = {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  subject: string | null;
  job_id: string | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  body: string;
  sender_user_id: string | null;
  sender_customer_id: string | null;
  created_at: string;
};

function forbidden() {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}

async function loadThreadsForRole(supabase: ReturnType<typeof createServiceClient>, tenantId: string, role: string, staffId: string | null) {
  if (role === 'Crew') {
    const { data: assignedJobs, error: assignmentError } = await supabase
      .from('job_assignments')
      .select('job_id')
      .eq('tenant_id', tenantId)
      .eq('crew_user_id', staffId);
    if (assignmentError) throw new Error(assignmentError.message);

    const jobIds = (assignedJobs ?? []).map((row) => row.job_id);
    if (!jobIds.length) return [] as ThreadRow[];

    const { data, error } = await supabase
      .from('message_threads')
      .select('id,tenant_id,customer_id,subject,job_id')
      .eq('tenant_id', tenantId)
      .in('job_id', jobIds)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as ThreadRow[];
  }

  const { data, error } = await supabase
    .from('message_threads')
    .select('id,tenant_id,customer_id,subject,job_id')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ThreadRow[];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId') ?? '';
    const session = getPortalSession();
    const staffRole = getRequestedStaffRole();
    const staffId = request.headers.get('x-user-id');
    const supabase = createServiceClient();

    if (session) {
      const { data: threads, error: threadError } = await supabase
        .from('message_threads')
        .select('id,tenant_id,customer_id,subject,job_id')
        .eq('tenant_id', session.tenantId)
        .eq('customer_id', session.customerId)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (threadError) return NextResponse.json({ error: threadError.message }, { status: 400 });

      const threadIds = (threads ?? []).map((thread) => thread.id);
      const { data: messages, error: messageError } = threadIds.length
        ? await supabase
            .from('messages')
            .select('id,thread_id,body,sender_user_id,sender_customer_id,created_at')
            .in('thread_id', threadIds)
            .order('created_at', { ascending: true })
        : { data: [], error: null };

      if (messageError) return NextResponse.json({ error: messageError.message }, { status: 400 });
      return NextResponse.json({ threads: threads ?? [], messages: messages ?? [] });
    }

    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    requireStaffRole(['Admin', 'Office', 'Crew']);

    const threads = await loadThreadsForRole(supabase, tenantId, staffRole ?? '', staffId);
    const threadIds = threads.map((thread) => thread.id);
    const { data: messages, error: messageError } = threadIds.length
      ? await supabase
          .from('messages')
          .select('id,thread_id,body,sender_user_id,sender_customer_id,created_at')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: true })
      : { data: [], error: null };

    if (messageError) return NextResponse.json({ error: messageError.message }, { status: 400 });
    return NextResponse.json({ threads, messages: (messages ?? []) as MessageRow[] });
  } catch {
    return forbidden();
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = createServiceClient();
  const session = getPortalSession();

  if (session) {
    const threadId = String(body.thread_id ?? '');
    if (!threadId) return NextResponse.json({ error: 'thread_id required' }, { status: 400 });

    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select('id,tenant_id,customer_id')
      .eq('id', threadId)
      .single();
    if (threadError) return NextResponse.json({ error: threadError.message }, { status: 400 });
    if (thread.tenant_id !== session.tenantId || thread.customer_id !== session.customerId) return forbidden();

    const insertBody = {
      tenant_id: session.tenantId,
      thread_id: threadId,
      body: String(body.body ?? ''),
      sender_customer_id: session.customerId,
      sender_user_id: null
    };

    const { error, data } = await supabase.from('messages').insert(insertBody).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from('message_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
    await supabase.from('in_app_notifications').insert({
      tenant_id: session.tenantId,
      related_thread_id: threadId,
      title: 'New message',
      body: 'A customer sent a new message.'
    });

    return NextResponse.json(data);
  }

  try {
    const role = requireStaffRole(['Admin', 'Office', 'Crew']);
    const tenantId = String(body.tenant_id ?? '');
    if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

    if (role === 'Crew') {
      const staffId = request.headers.get('x-user-id');
      const threadId = String(body.thread_id ?? '');
      const { data: thread, error: threadError } = await supabase
        .from('message_threads')
        .select('id,job_id,tenant_id')
        .eq('id', threadId)
        .single();
      if (threadError) return NextResponse.json({ error: threadError.message }, { status: 400 });
      const { count } = await supabase
        .from('job_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('job_id', thread.job_id)
        .eq('crew_user_id', staffId);
      if ((count ?? 0) === 0 || thread.tenant_id !== tenantId) return forbidden();
    }

    const { error, data } = await supabase.from('messages').insert(body).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from('message_threads').update({ updated_at: new Date().toISOString() }).eq('id', body.thread_id);
    await supabase.from('in_app_notifications').insert({
      tenant_id: body.tenant_id,
      related_thread_id: body.thread_id,
      title: 'New message',
      body: 'You have a new message in a thread.'
    });

    return NextResponse.json(data);
  } catch {
    return forbidden();
  }
}
