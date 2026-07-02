import { BoxClient, BoxJwtAuth, JwtConfig } from "box-node-sdk";

export function getBoxClient(): BoxClient {
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
  return new BoxClient({ auth });
}
