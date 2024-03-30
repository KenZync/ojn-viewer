import BoxSDK from "box-node-sdk";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const query = getQuery(event);
  const filename = `o2ma${id}.ojn`;

  const sdk = new BoxSDK({
    clientID: process.env.NUXT_BOX_CLIENT_ID || "",
    clientSecret: process.env.NUXT_BOX_CLIENT_SCRET || "",
    appAuth: {
      keyID: process.env.NUXT_BOX_JWT_KEY_ID || "",
      privateKey: process.env.NUXT_BOX_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
      passphrase: process.env.NUXT_BOX_PRIVATE_KEY_PASSPHRASE || "",
    },
  });

  var client = sdk.getAppAuthClient(
    "enterprise",
    process.env.NUXT_BOX_ENTERPRISE_ID
  );

  const search = await client.search.query(filename, {
    content_types: "name",
    fields: "id,name",
    ancestor_folder_ids: query.folder,
    limit: 1,
  });

  if (search.entries.length != 1) {
    throw createError({ statusCode: 404, statusMessage: "OJN Not Found" });
  }

  const [firstEntry] = search.entries; // Destructure the first entry

  if (firstEntry.name != filename) {
    throw createError({ statusCode: 404, statusMessage: "OJN Not Found" });
  }
  const file = client.files.getReadStream(firstEntry.id);
  return file;
});
