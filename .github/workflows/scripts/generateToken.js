module.exports = async () => {
  const { createAppAuth } = require("@octokit/auth-app");
  const { request } = require("@octokit/request");

  const auth = await createAppAuth({
    appId: process.env.APP_ID,
    privateKey: process.env.APP_PRIVATE_KEY,
    clientId: process.env.APP_CLIENT_ID,
    clientSecret: process.env.APP_CLIENT_SECRET
  });

  // Retrieve JSON Web Token (JWT) to authenticate as app
  const jwt = await auth({ type: "app" }).then(_ => _.token);

  // Fetch installation ID
  const installation_id = await request({
    method: "GET",
    url: `https://api.github.com/app/installations`,
    headers: { authorization: `Bearer ${jwt}` },
  }).then(_ => _.data[0].id)

  // Generate token
  const token = await request({
    method: "POST",
    url: `https://api.github.com/app/installations/${installation_id}/access_tokens`,
    headers: { authorization: `Bearer ${jwt}` },
  }).then(_ => _.data.token)

  return token
}