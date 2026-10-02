import type { Metadata } from 'next';
import './globals.css';
import '../portal.css';

export const metadata: Metadata = {
  title: 'Oath of Care Pharmacy | Verified medicine availability',
  description: 'A trusted pharmacy workspace for inventory, visibility, verification, and stock accuracy.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
