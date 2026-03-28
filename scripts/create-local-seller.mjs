import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

const DEFAULT_EMAIL = "manager@salesense.local";
const DEFAULT_NAME = "Local Store Manager";
const DEFAULT_PASSWORD = "salesense-local-123";
const DEFAULT_STORE_ID = "demo-store";
const DEMO_PRODUCTS = [
  {
    brand: "Apple",
    category: "Smartphones",
    comparisonSnippetMarkdown:
      "Apple flagship: best camera system, titanium build, A18 Pro, and the largest display in the lineup.",
    detailsMarkdown: `# iPhone 16 Pro Max

The most advanced iPhone demo in the store.

## Key Features
- **A18 Pro chip** for top-tier responsiveness
- **48MP camera system** with strong low-light performance and 5x optical zoom
- **6.9-inch Super Retina XDR display** with ProMotion
- **Titanium design** that feels light and premium in hand
- **All-day battery life** designed for heavy use

## Demo Tips
- Test the 5x zoom camera on a distant object
- Swipe through apps to feel ProMotion smoothness
- Compare the titanium weight against other flagship phones`,
    idleMediaUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80",
    name: "iPhone 16 Pro Max",
  },
  {
    brand: "Samsung",
    category: "Smartphones",
    comparisonSnippetMarkdown:
      "Samsung flagship: 200MP camera, built-in S Pen, Snapdragon 8 Elite, and a larger, more productivity-oriented feel.",
    detailsMarkdown: `# Samsung Galaxy S25 Ultra

Samsung's all-in flagship demo with productivity features.

## Key Features
- **Snapdragon 8 Elite** processor for high-end performance
- **200MP main camera** with strong zoom flexibility
- **Built-in S Pen** for notes and creative workflows
- **6.9-inch QHD+ AMOLED display**
- **5000mAh battery** with fast charging

## Demo Tips
- Pull out the S Pen and try quick note-taking
- Open the camera and test zoom levels
- Compare the screen size and squared-off design with other phones`,
    idleMediaUrl:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1200&q=80",
    name: "Galaxy S25 Ultra",
  },
  {
    brand: "Google",
    category: "Smartphones",
    comparisonSnippetMarkdown:
      "Google flagship: strongest AI story, Tensor G4, computational photography, and long software support.",
    detailsMarkdown: `# Google Pixel 9 Pro

Google's AI-forward premium phone demo.

## Key Features
- **Tensor G4** chip with on-device AI features
- **50MP triple camera** system with computational photography
- **Super Actua display** built for strong outdoor visibility
- **Gemini built in** for assistant experiences
- **Seven years of OS updates**

## Demo Tips
- Test AI photo editing features
- Ask about long-term software updates
- Compare the camera output style with Apple and Samsung`,
    idleMediaUrl:
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80",
    name: "Pixel 9 Pro",
  },
];

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

async function upsertLocalSellerUser({ email, name, password, storeId }) {
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
    password,
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

async function seedDemoProducts(supabase, storeId) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .eq("store_id", storeId);

  if (error) {
    throw new Error(`Failed to load existing demo products: ${error.message}`);
  }

  const existingProducts = new Map(
    (data ?? []).map((product) => [product.name.toLowerCase(), product]),
  );

  for (const product of DEMO_PRODUCTS) {
    const existingProduct = existingProducts.get(product.name.toLowerCase());

    if (existingProduct) {
      const { error: updateError } = await supabase
        .from("products")
        .update({
          brand: product.brand,
          category: product.category,
          comparison_snippet_markdown: product.comparisonSnippetMarkdown,
          details_markdown: product.detailsMarkdown,
          idle_media_url: product.idleMediaUrl,
          name: product.name,
        })
        .eq("id", existingProduct.id);

      if (updateError) {
        throw new Error(
          `Failed to update demo product ${product.name}: ${updateError.message}`,
        );
      }

      continue;
    }

    const { error: insertError } = await supabase.from("products").insert({
      brand: product.brand,
      category: product.category,
      comparison_snippet_markdown: product.comparisonSnippetMarkdown,
      details_markdown: product.detailsMarkdown,
      idle_media_url: product.idleMediaUrl,
      name: product.name,
      store_id: storeId,
    });

    if (insertError) {
      throw new Error(
        `Failed to create demo product ${product.name}: ${insertError.message}`,
      );
    }
  }
}

async function resetStoreProducts(supabase, storeId) {
  const { error } = await supabase.from("products").delete().eq("store_id", storeId);

  if (error) {
    throw new Error(`Failed to reset store products: ${error.message}`);
  }
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
      password: {
        type: "string",
      },
      "store-id": {
        type: "string",
      },
      "reset-store": {
        default: false,
        type: "boolean",
      },
    },
  });

  const email = getStringValue(values.email, DEFAULT_EMAIL).toLowerCase();
  const name = getStringValue(values.name, DEFAULT_NAME);
  const password = getStringValue(values.password, DEFAULT_PASSWORD);
  const resetStore = values["reset-store"] === true;
  const storeId = getStringValue(values["store-id"], DEFAULT_STORE_ID);
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { action, user } = await upsertLocalSellerUser({
    email,
    name,
    password,
    storeId,
  });

  if (resetStore) {
    await resetStoreProducts(supabase, storeId);
  }

  await seedDemoProducts(supabase, storeId);

  console.log(
    JSON.stringify(
      {
        action,
        email,
        id: user?.id ?? null,
        name,
        resetStore,
        seededProducts: DEMO_PRODUCTS.map((product) => product.name),
        next_steps: [
          "Start the app with `pnpm dev`.",
          "Open `/seller/sign-in` and sign in with the email you passed to the script.",
          "Use the seeded demo products from the seller dashboard to launch a live kiosk session.",
          "Pass `--reset-store` if you want to wipe old local catalog items for that store before reseeding the demo set.",
          "Use the password you passed with `--password`, or the documented local default if you omitted it.",
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
