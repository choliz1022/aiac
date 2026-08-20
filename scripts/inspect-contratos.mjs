import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    process.env[trimmed.slice(0, i).trim()] ??= trimmed.slice(i + 1).trim();
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data, error } = await supabase.from("contratos").select("*").limit(1);

if (error) {
  console.error("ERROR:", error);
} else {
  console.log("OK:", JSON.stringify(data, null, 2));
  if (data?.[0]) {
    console.log("COLUMNS:", Object.keys(data[0]).join(", "));
  }
}
