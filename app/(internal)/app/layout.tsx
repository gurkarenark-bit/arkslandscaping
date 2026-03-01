import { StaffShell } from '@/components/staff-shell';

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
