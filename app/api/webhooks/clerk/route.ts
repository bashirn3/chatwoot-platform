import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import {
  getOrganizationByClerkId,
  createOrganization,
  deleteOrganization,
  getUserMappingByClerkId,
  createUserMapping,
} from "@/lib/supabase";
import { chatwoot } from "@/lib/chatwoot";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (evt.type) {
      case "organization.created":
        await handleOrganizationCreated(evt.data);
        break;

      case "organizationMembership.created":
        await handleMemberAdded(evt.data);
        break;

      case "organizationMembership.deleted":
        await handleMemberRemoved(evt.data);
        break;

      case "organization.deleted":
        await handleOrganizationDeleted(evt.data);
        break;
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

async function handleOrganizationCreated(data: any) {
  const { id: clerkOrgId, name } = data;

  console.log(`Creating Chatwoot account for org: ${clerkOrgId}`);

  // Create account in Chatwoot
  const chatwootAccount = await chatwoot.createAccount(name);

  // Store mapping in Supabase
  await createOrganization(clerkOrgId, chatwootAccount.id, name);

  console.log(
    `Created Chatwoot account ${chatwootAccount.id} for org ${clerkOrgId}`
  );
}

async function handleMemberAdded(data: any) {
  const { organization, public_user_data, role } = data;
  const clerkOrgId = organization.id;
  const clerkUserId = public_user_data.user_id;
  const email = public_user_data.identifier;

  console.log(`Adding member ${clerkUserId} to org ${clerkOrgId}`);

  // Get organization mapping with retry (handles race condition with org.created webhook)
  let org = await getOrganizationByClerkId(clerkOrgId);

  if (!org) {
    // Retry up to 20 times with 1 second delay (org webhook may still be processing)
    for (let i = 0; i < 20; i++) {
      console.log(
        `Waiting for org ${clerkOrgId} to be created... (attempt ${i + 1}/20)`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      org = await getOrganizationByClerkId(clerkOrgId);
      if (org) break;
    }
  }

  if (!org) {
    console.error(
      `Organization ${clerkOrgId} not found after 20 retries - giving up`
    );
    return;
  }

  // Check if user mapping exists
  let userMapping = await getUserMappingByClerkId(clerkUserId);

  if (!userMapping) {
    // Create user in Chatwoot
    const chatwootUser = await chatwoot.createUser({
      name:
        public_user_data.first_name
          ? `${public_user_data.first_name} ${public_user_data.last_name || ""}`.trim()
          : email,
      email,
    });

    // Store user mapping
    userMapping = await createUserMapping(clerkUserId, chatwootUser.id, email);
  }

  // Add user to Chatwoot account with role
  const chatwootRole = role === "org:admin" ? "administrator" : "agent";
  await chatwoot.addUserToAccount(
    org.chatwoot_account_id,
    userMapping.chatwoot_user_id,
    chatwootRole
  );

  console.log(
    `Added user ${userMapping.chatwoot_user_id} to account ${org.chatwoot_account_id}`
  );
}

async function handleMemberRemoved(data: any) {
  const { organization, public_user_data } = data;

  console.log(
    `Removing member ${public_user_data.user_id} from org ${organization.id}`
  );

  const org = await getOrganizationByClerkId(organization.id);
  const userMapping = await getUserMappingByClerkId(public_user_data.user_id);

  if (org && userMapping) {
    await chatwoot.removeUserFromAccount(
      org.chatwoot_account_id,
      userMapping.chatwoot_user_id
    );
    console.log(
      `Removed user ${userMapping.chatwoot_user_id} from account ${org.chatwoot_account_id}`
    );
  }
}

async function handleOrganizationDeleted(data: any) {
  const clerkOrgId = data.id;

  console.log(`Deleting organization ${clerkOrgId}`);

  const org = await getOrganizationByClerkId(clerkOrgId);

  if (org) {
    // Delete Chatwoot account
    await chatwoot.deleteAccount(org.chatwoot_account_id);

    // Delete from our database
    await deleteOrganization(clerkOrgId);

    console.log(`Deleted Chatwoot account ${org.chatwoot_account_id}`);
  }
}
