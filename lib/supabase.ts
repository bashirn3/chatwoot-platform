import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for our tables
export interface Organization {
  id: string;
  clerk_org_id: string;
  chatwoot_account_id: number;
  name: string | null;
  created_at: string;
}

export interface UserMapping {
  id: string;
  clerk_user_id: string;
  chatwoot_user_id: number;
  email: string | null;
  created_at: string;
}

// Helper functions
export async function getOrganizationByClerkId(clerkOrgId: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select()
    .eq("clerk_org_id", clerkOrgId)
    .single();

  if (error) return null;
  return data as Organization;
}

export async function createOrganization(
  clerkOrgId: string,
  chatwootAccountId: number,
  name: string
) {
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      clerk_org_id: clerkOrgId,
      chatwoot_account_id: chatwootAccountId,
      name,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Organization;
}

export async function deleteOrganization(clerkOrgId: string) {
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("clerk_org_id", clerkOrgId);

  if (error) throw error;
}

export async function getUserMappingByClerkId(clerkUserId: string) {
  const { data, error } = await supabase
    .from("user_mappings")
    .select()
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (error) return null;
  return data as UserMapping;
}

export async function createUserMapping(
  clerkUserId: string,
  chatwootUserId: number,
  email: string | null
) {
  const { data, error } = await supabase
    .from("user_mappings")
    .insert({
      clerk_user_id: clerkUserId,
      chatwoot_user_id: chatwootUserId,
      email,
    })
    .select()
    .single();

  if (error) throw error;
  return data as UserMapping;
}

export async function deleteUserMapping(clerkUserId: string) {
  const { error } = await supabase
    .from("user_mappings")
    .delete()
    .eq("clerk_user_id", clerkUserId);

  if (error) throw error;
}
