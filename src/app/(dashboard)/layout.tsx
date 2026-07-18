import NavBar from "@/features/dashboard/components/navbar";
import SideBar from "@/features/dashboard/components/sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body >
        <div className="flex h-screen overflow-hidden">
          <SideBar />
          <div className="flex flex-col flex-1 min-w-0 h-full relative">
            <NavBar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 focus:outline-none">
              <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-300">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}