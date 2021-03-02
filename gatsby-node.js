const fetch = require("node-fetch");
const { name } = require("./package.json");

const pkgPrefix = (msg) => `${name}: ${msg}`;
const error = (msg) => new Error(pkgPrefix(msg));
let conditionFulfilled = false;

const checkCondition = (condition, api, options) =>
  Boolean(
    typeof condition === "function" ? condition(api, options) : condition
  );

exports.onPreInit = async function (api, options) {
  const { reporter } = api;
  const { condition, token, zoneId } = options;

  conditionFulfilled = checkCondition(condition, api, options);

  if (!conditionFulfilled) {
    reporter.info(pkgPrefix("Will skip due to failed condition"));
    return;
  }

  const missingOptions = Object.entries({
    token,
    zoneId,
  }).reduce((acc, [k, v]) => (v ? acc : [...acc, k]), []);

  if (missingOptions.length > 0) {
    reporter.panic(
      error(`Some required options are missing! (${missingOptions.join(", ")})`)
    );
  }
};

exports.onPostBuild = async function (api, options) {
  const { reporter } = api;
  const {
    condition,
    token,
    zoneId,
    headers = {},
    body = { purge_everything: true },
  } = options;

  if (!conditionFulfilled) {
    return;
  }

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

  const responseBody = await res.json();

  if (!res.ok || !responseBody.success) {
    reporter.warn(
      pkgPrefix(
        "response from CloudFlare indicates cache clear failure: " +
          JSON.stringify(
            {
              status: res.status,
              errors: responseBody.errors,
            },
            undefined,
            2
          )
      )
    );
  } else {
    reporter.info(pkgPrefix("Cleared CloudFlare cache successfully"));
  }
};
