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

  const entries = search.entries;
  if (!entries || entries.length !== 1) {
    throw createError({ statusCode: 404, statusMessage: 'OJN Not Found' })
  }

  const firstEntry = entries[0];
  if (!firstEntry) {
    throw createError({ statusCode: 404, statusMessage: 'OJN Not Found' })
  }

  let fileId: string | undefined;
  let fileName: string | undefined;

  if ('item' in firstEntry && firstEntry.item) {
    fileId = firstEntry.item.id;
    fileName = 'name' in firstEntry.item ? firstEntry.item.name : undefined;
  } else if ('id' in firstEntry) {
    fileId = firstEntry.id;
    fileName = 'name' in firstEntry ? firstEntry.name : undefined;
  }

  if (!fileId || !fileName || fileName !== filename) {
    throw createError({ statusCode: 404, statusMessage: 'OJN Not Found' })
  }

  const url = await client.downloads.getDownloadFileUrl(fileId);
  return url;
});
