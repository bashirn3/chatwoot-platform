import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId, orgId } = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">My Platform</h1>
          <OrganizationSwitcher />
        </div>
        <UserButton />
      </header>

      <main className="max-w-4xl mx-auto p-8">
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>

        {!orgId ? (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-yellow-800">
              Please create or select an organization to continue.
            </p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 mb-4">
              Organization selected! You&apos;re ready to go.
            </p>
            <Link
              href="/api/chatwoot/sso"
              target="_blank"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Open Inbox
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
