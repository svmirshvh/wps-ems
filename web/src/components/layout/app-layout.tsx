import { Sidebar } from './sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/*
        Desktop: push content right by sidebar width (ml-64)
        Mobile:  push content down by top bar height (pt-14)
      */}
      <div className="md:ml-64 pt-14 md:pt-0 min-h-screen">
        <main className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
