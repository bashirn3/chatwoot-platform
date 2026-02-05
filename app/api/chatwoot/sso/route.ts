import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrganizationByClerkId, getUserMappingByClerkId } from "@/lib/supabase";
import { chatwoot } from "@/lib/chatwoot";

const MAX_RETRIES = 20;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return new Response("Unauthorized - Please sign in and select an organization", { 
      status: 401 
    });
  }

  // Get organization mapping with retry (webhooks may still be processing)
  let org = await getOrganizationByClerkId(orgId);
  if (!org) {
    console.log(`SSO: Waiting for org ${orgId} to be created...`);
    for (let i = 0; i < MAX_RETRIES; i++) {
      await sleep(RETRY_DELAY_MS);
      org = await getOrganizationByClerkId(orgId);
      if (org) {
        console.log(`SSO: Found org after ${i + 1} retries`);
        break;
      }
    }
  }

  if (!org) {
    console.error(`SSO: Organization ${orgId} not found after ${MAX_RETRIES} retries`);
    return new Response("Organization not found in Chatwoot. Please try again later.", { 
      status: 404 
    });
  }

  // Get user mapping with retry (webhooks may still be processing)
  let userMapping = await getUserMappingByClerkId(userId);
  if (!userMapping) {
    console.log(`SSO: Waiting for user ${userId} mapping to be created...`);
    for (let i = 0; i < MAX_RETRIES; i++) {
      await sleep(RETRY_DELAY_MS);
      userMapping = await getUserMappingByClerkId(userId);
      if (userMapping) {
        console.log(`SSO: Found user mapping after ${i + 1} retries`);
        break;
      }
    }
  }

  if (!userMapping) {
    console.error(`SSO: User ${userId} mapping not found after ${MAX_RETRIES} retries`);
    return new Response("User not found in Chatwoot. Please try again later.", { 
      status: 404 
    });
  }

  // Get SSO login URL from Chatwoot
  const { url } = await chatwoot.getUserLoginUrl(userMapping.chatwoot_user_id);

  // Redirect to Chatwoot with auto-login
  redirect(url);
}
