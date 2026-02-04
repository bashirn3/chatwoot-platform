const CHATWOOT_URL = process.env.CHATWOOT_URL!;
const API_KEY = process.env.CHATWOOT_PLATFORM_API_KEY!;

// Generate a secure random password for Chatwoot user creation
// Users will authenticate via SSO, so they'll never use this password
function generateSecurePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+-=";

  // Ensure at least one of each required type
  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    numbers[Math.floor(Math.random() * numbers.length)] +
    special[Math.floor(Math.random() * special.length)];

  // Fill remaining with random characters (16 chars total)
  const all = upper + lower + numbers + special;
  for (let i = 0; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

async function chatwootFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${CHATWOOT_URL}/platform/api/v1${endpoint}`, {
    ...options,
    headers: {
      api_access_token: API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chatwoot API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export const chatwoot = {
  // Accounts (Organizations in Chatwoot)
  async createAccount(name: string) {
    return chatwootFetch("/accounts", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async deleteAccount(accountId: number) {
    return chatwootFetch(`/accounts/${accountId}`, {
      method: "DELETE",
    });
  },

  // Users
  async createUser(data: { name: string; email: string }) {
    return chatwootFetch("/users", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        password: generateSecurePassword(),
      }),
    });
  },

  async getUser(userId: number) {
    return chatwootFetch(`/users/${userId}`);
  },

  async getUserLoginUrl(userId: number): Promise<{ url: string }> {
    return chatwootFetch(`/users/${userId}/login`);
  },

  // Account Users (link user to account with role)
  async addUserToAccount(accountId: number, userId: number, role: string) {
    return chatwootFetch(`/accounts/${accountId}/account_users`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role }),
    });
  },

  async removeUserFromAccount(accountId: number, userId: number) {
    return chatwootFetch(`/accounts/${accountId}/account_users`, {
      method: "DELETE",
      body: JSON.stringify({ user_id: userId }),
    });
  },
};
