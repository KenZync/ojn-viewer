import { getBoxClient } from "../../utils/box";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const filename = `o2ma${id}.ojn`

  const client = getBoxClient();

  const search = await client.search.searchForContent({
    query: filename,
    fields: ["name"],
    ancestorFolderIds: [process.env.NUXT_BOX_PRIVATE_FOLDER_ID || ""],
    limit: 1,
  });

  if (!search.entries || search.entries.length !== 1) {
    throw createError({ statusCode: 404, statusMessage: 'OJN Not Found' })
  }

  const [firstEntry] = search.entries; // Destructure the first entry

  if (firstEntry.name !== filename) {
    throw createError({ statusCode: 404, statusMessage: 'OJN Not Found' })
  }
  const url = await client.downloads.getDownloadFileUrl(firstEntry.id);
  return url;
});
