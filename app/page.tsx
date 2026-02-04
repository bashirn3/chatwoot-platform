import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    // Not logged in → Sign in
    redirect("/sign-in");
  }

  if (!orgId) {
    // Logged in but no org selected → Go to org selection
    redirect("/select-org");
  }

  // Logged in with org → Go straight to Chatwoot
  redirect("/api/chatwoot/sso");
}
