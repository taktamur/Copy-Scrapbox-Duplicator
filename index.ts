import { assertString, exportPages, importPages } from "./deps.ts";

const sid = Deno.env.get("SID");
const exportingProjectName = Deno.env.get("SOURCE_PROJECT_NAME"); //インポート元(本来はprivateプロジェクト)
const importingProjectName = Deno.env.get("DESTINATION_PROJECT_NAME"); //インポート先(publicプロジェクト)
const shouldDuplicateByDefault =
  Deno.env.get("SHOULD_DUPLICATE_BY_DEFAULT") === "True";

assertString(sid);
assertString(exportingProjectName);
assertString(importingProjectName);

console.log(`Exporting a json file from "/${exportingProjectName}"...`);
const result = await exportPages(exportingProjectName, {
  sid,
  metadata: true,
});
if (!result.ok) {
  const error = new Error();
  error.name = `${result.value.name} when exporting a json file`;
  error.message = result.value.message;
  throw error;
}
const { pages } = result.value;
console.log(`Export ${pages.length}pages:`);
for (const page of pages) {
  console.log(`\t${page.title}`);
}

const importingPages = pages.filter(({ lines }) => {
  if (lines.some((line) => line.text.includes("[private.icon]"))) {
    return false;
  } else if (lines.some((line) => line.text.includes("[public.icon]"))) {
    return true;
  } else {
    return shouldDuplicateByDefault;
  }
});

if (importingPages.length === 0) {
  console.log("No page to be imported found.");
} else {
  console.log(
    `Importing ${importingPages.length} pages to "/${importingProjectName}"...`
  );
  // MEMO: 更新量が大きすぎてのエラーが出たので、暫定で500件ごとに分割してインポートするように変更
  for (let i = 0; i < importingPages.length; i += 500) {
    const chunk = importingPages.slice(i, i + 500);
    console.log(
      `Importing chunk ${Math.floor(i / 500) + 1} (${chunk.length} pages)...`
    );

    const result = await importPages(
      importingProjectName,
      {
        pages: chunk,
      },
      {
        sid,
      }
    );
    if (!result.ok) {
      const error = new Error();
      error.name = `${result.value.name} when importing pages`;
      error.message = result.value.message;
      throw error;
    }
    console.log(result.value);
  }
}
