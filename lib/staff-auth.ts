import { headers } from 'next/headers';
import { AppRole } from './supabase';

export function getRequestedStaffRole() {
  const role = headers().get('x-staff-role') as AppRole | null;
  return role;
}

export function requireStaffRole(allowed: AppRole[]) {
  const role = getRequestedStaffRole();
  if (!role || !allowed.includes(role)) {
    throw new Error('forbidden');
  }
  return role;
}
