import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationList } from "@clerk/nextjs";

export default async function SelectOrgPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // If org already selected, go to Chatwoot
  if (orgId) {
    redirect("/api/chatwoot/sso");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-6">Select an Organization</h1>
        <OrganizationList
          hidePersonal={true}
          afterSelectOrganizationUrl="/"
          afterCreateOrganizationUrl="/"
        />
      </div>
    </div>
  );
}
