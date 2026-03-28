import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

const DEFAULT_EMAIL = "manager@salesense.local";
const DEFAULT_NAME = "Local Store Manager";
const DEFAULT_STORE_ID = "demo-store";

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getStringValue(value, fallback) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

async function findUserByEmail(supabase, email) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
}

async function upsertLocalSellerUser({ email, name, storeId }) {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const existingUser = await findUserByEmail(supabase, email);
  const payload = {
    app_metadata: {
      role: "manager",
      store_id: storeId,
    },
    email,
    email_confirm: true,
    user_metadata: {
      name,
      store_id: storeId,
    },
  };

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      payload,
    );

    if (error) {
      throw new Error(`Failed to update seller user: ${error.message}`);
    }

    return {
      action: "updated",
      user: data.user,
    };
  }

  const { data, error } = await supabase.auth.admin.createUser(payload);

  if (error) {
    throw new Error(`Failed to create seller user: ${error.message}`);
  }

  return {
    action: "created",
    user: data.user,
  };
}

async function main() {
  const { values } = parseArgs({
    allowPositionals: false,
    options: {
      email: {
        type: "string",
      },
      name: {
        type: "string",
      },
      "store-id": {
        type: "string",
      },
    },
  });

  const email = getStringValue(values.email, DEFAULT_EMAIL).toLowerCase();
  const name = getStringValue(values.name, DEFAULT_NAME);
  const storeId = getStringValue(values["store-id"], DEFAULT_STORE_ID);

  const { action, user } = await upsertLocalSellerUser({
    email,
    name,
    storeId,
  });

  console.log(
    JSON.stringify(
      {
        action,
        email,
        id: user?.id ?? null,
        name,
        next_steps: [
          "Start the app with `pnpm dev`.",
          "Open `/seller/sign-in` and request a magic link for this email.",
          "Open local Mailpit at `http://127.0.0.1:54324` and click the sign-in link.",
        ],
        storeId,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
