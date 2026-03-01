import { InternalNav } from '@/components/nav';

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2>Internal Staff</h2>
      <InternalNav />
      {children}
    </div>
  );
}
