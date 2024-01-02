import { intro, outro, select, text, spinner } from "@clack/prompts";
import { exec } from "node:child_process";
import { create } from "create-svelte";
import fs from "node:fs";
import AdmZip from "adm-zip";

async function main() {
  intro(`create-my-app`);

  const username = await text({
    message: "What is your Username?",
    placeholder: "Not sure",
    validate(value) {
      if (value.length === 0) return `Value is required!`;
    },
  });

  const pocketbase_versions = await fetch(
    "https://api.github.com/repos/pocketbase/pocketbase/releases",
    {
      method: "GET",
    }
  );
  const pocketbase_versions_json = await pocketbase_versions.json();
  let pocketbase_version_options = [];
  pocketbase_versions_json.forEach((element) => {
    if (pocketbase_version_options.length == 10) return;
    pocketbase_version_options.push({
      value: element.tag_name,
      label: element.tag_name,
      hint: new Date(element.created_at).toDateString(),
    });
  });

  const pocketbase_version = await select({
    message: "Pick a PocketBase Version",
    options: pocketbase_version_options,
  });

  const plattforms = [
    {
      name: "win32",
      value: "windows_amd64",
    },
    {
      name: "darwin",
      value: "darwin_amd64",
    },
    {
      name: "linux",
      value: "linux_arm64",
    },
  ];

  const pocketbase_name = `pocketbase_${pocketbase_version.replaceAll(
    "v",
    ""
  )}_${
    plattforms.find((element) => element.name == process.platform).value
  }.zip`;
  const pocketbase_download_url = `https://github.com/pocketbase/pocketbase/releases/download/${pocketbase_version}/${pocketbase_name}`;

  const s = spinner();
  s.start("Creating your Monorepo...");

  if (!fs.existsSync("pocketsvelte")) {
    fs.mkdirSync("pocketsvelte");
  }

  process.chdir("pocketsvelte");

  exec("pnpm init");

  exec("git init");

  fs.writeFileSync(".gitignore", "node_modules\n");

  const MAINpackageJsonContent = {
    name: `@${username}/root`,
    scripts: {
      dev: "pnpm -r run dev",
      "pocketbase:dev": `pnpm -F @${username}/pocketbase run dev`,
      "sveltekit:dev": `pnpm -F @${username}/sveltekit run dev`,
    },
  };
  fs.writeFileSync(
    "package.json",
    JSON.stringify(MAINpackageJsonContent, null, 2)
  );

  fs.writeFileSync("pnpm-workspace.yaml", 'packages:\n  - "apps/**"\n');

  fs.writeFileSync("README.md", "#PNPM monorepo\n");

  if (!fs.existsSync("apps")) {
    fs.mkdirSync("apps");
  }

  process.chdir("apps");

  await create("sveltekit", {
    name: `sveltekit`,
    template: "default", // or 'skeleton' or 'skeletonlib'
    types: "checkjs", // or 'typescript' or null;
    prettier: false,
    eslint: false,
    playwright: false,
    vitest: false,
  });

  process.chdir("sveltekit");

  // Dateiinhalt lesen
  const packageJsonPath = "package.json";
  const packageJsonContent = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf-8")
  );

  // Änderungen vornehmen
  packageJsonContent.name = `@${username}/sveltekit`;

  // Datei mit aktualisierten Inhalten schreiben
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJsonContent, null, 2)
  );

  exec("pnpm i");

  // POCKETBASE
  process.chdir("../");

  if (!fs.existsSync("pocketbase")) {
    fs.mkdirSync("pocketbase");
  }

  process.chdir("pocketbase");

  const response = await fetch(pocketbase_download_url);
  const buffer = Buffer.from(await response.arrayBuffer());

  const zip = new AdmZip(buffer);
  zip.extractAllTo(".");

  const files = fs.readdirSync(".");
  files.forEach((file) => {
    if (file == "pocketbase") {
      fs.chmodSync(file, "755");
    }
  });

  const POCKETBASEpackageJsonContent = {
    name: `@${username}/pocketbase`,
    main: "index.js",
    scripts: {
      dev:
        process.platform == "win32" ? "pocketbase serve" : "./pocketbase serve",
    },
  };
  fs.writeFileSync(
    "package.json",
    JSON.stringify(POCKETBASEpackageJsonContent, null, 2)
  );

  s.stop("Monorepo created.");

  outro("Done. 🪄");
}

main().catch(console.error);
