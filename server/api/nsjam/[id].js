import { BoxClient, BoxJwtAuth, JwtConfig } from "box-node-sdk";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const filename = `o2ma${id}.ojn`

  const configObj = {
    boxAppSettings: {
      clientID: process.env.NUXT_BOX_CLIENT_ID || "",
      clientSecret: process.env.NUXT_BOX_CLIENT_SCRET || "",
      appAuth: {
        publicKeyID: process.env.NUXT_BOX_JWT_KEY_ID || "",
        privateKey: process.env.NUXT_BOX_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
        passphrase: process.env.NUXT_BOX_PRIVATE_KEY_PASSPHRASE || "",
      },
    },
    enterpriseID: process.env.NUXT_BOX_ENTERPRISE_ID || "",
  };

  const jwtConfig = JwtConfig.fromConfigJsonString(JSON.stringify(configObj));
  const auth = new BoxJwtAuth({ config: jwtConfig });
  const client = new BoxClient({ auth });

  const search = await client.search.searchForContent({
    query: filename,
    fields: ["name"],
    ancestorFolderIds: ['255369484076'],
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
