import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrganizationByClerkId, getUserMappingByClerkId } from "@/lib/supabase";
import { chatwoot } from "@/lib/chatwoot";

export async function GET() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return new Response("Unauthorized - Please sign in and select an organization", { 
      status: 401 
    });
  }

  // Get organization mapping
  const org = await getOrganizationByClerkId(orgId);
  if (!org) {
    return new Response("Organization not found in Chatwoot. Please try again later.", { 
      status: 404 
    });
  }

  // Get user mapping
  const userMapping = await getUserMappingByClerkId(userId);
  if (!userMapping) {
    return new Response("User not found in Chatwoot. Please try again later.", { 
      status: 404 
    });
  }

  // Get SSO login URL from Chatwoot
  const { url } = await chatwoot.getUserLoginUrl(userMapping.chatwoot_user_id);

  // Redirect to Chatwoot with auto-login
  redirect(url);
}
