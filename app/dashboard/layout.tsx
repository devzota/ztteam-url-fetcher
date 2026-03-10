import ZTTeamSidebar from "@/components/Sidebar";

export default function ZTTeamDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <ZTTeamSidebar />
      <main className="ml-72 flex-1 p-8">{children}</main>
    </div>
  );
}
