const fetch = require("node-fetch");
const { name } = require("./package.json");

exports.onPostBuild = async function (api, options) {
  const { reporter } = api;
  const {
    condition,
    token,
    zoneId,
    headers = {},
    body = { purge_everything: true },
  } = options;

  if (
    condition === false ||
    (typeof condition === "function" && !condition(api, options))
  ) {
    reporter.info("Skipping due to failed condition");
  }

  const missingOptions = Object.entries({
    token,
    zoneId,
  }).reduce((acc, [k, v]) => (v ? [...acc, k] : acc), []);

  if (missingOptions.length > 0) {
    reporter.panic(
      "Some required options are missing: " + missingOptions.join(", ")
    );
  }

  // Now that everything's initialized, we can send the request.

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    }
  );

  const body = await res.json();

  if (!res.ok || !body.success) {
    reporter.warn(
      "response from CloudFlare indicates cache clear failure: " +
        JSON.stringify(
          {
            status: res.status,
            errors: body.errors,
          },
          undefined,
          2
        )
    );
  }

  reporter.info("Cleared CloudFlare cache successfully");
};
