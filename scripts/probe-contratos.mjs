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

const columns = [
  "Objeto",
  "objeto",
  "ObjetoContractual",
  "Objeto Contractual",
  "Objeto_contractual",
  "Objeto contractual",
  "objeto contractual",
];

for (const column of columns) {
  const { error } = await supabase.from("contratos").select(column).limit(1);
  console.log(column, error ? `ERROR: ${error.message}` : "OK");
}
