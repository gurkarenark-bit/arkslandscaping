import { PortalNav } from '@/components/nav';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2>Customer Portal</h2>
      <PortalNav />
      {children}
    </div>
  );
}
