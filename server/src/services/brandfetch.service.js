const env = require("../config/env");
const HttpError = require("../utils/httpError");

const BRANDFETCH_SEARCH_URL = "https://api.brandfetch.io/v2/search";

/**
 * Hits the Brandfetch Search API and normalizes the response down to the
 * three fields the client actually needs. We strip everything else so we
 * don't accidentally lock the schema to Brandfetch's internal shape — if we
 * ever swap providers, only this file changes.
 *
 * Search docs: https://docs.brandfetch.com/reference/search
 */
async function searchCompanies(name) {
  const trimmed = String(name || "").trim();
  if (trimmed.length === 0) {
    return [];
  }

  const url = `${BRANDFETCH_SEARCH_URL}/${encodeURIComponent(trimmed)}`;

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.brandfetchApiKey}`,
        Accept: "application/json",
      },
    });
  } catch (err) {
    throw new HttpError(502, "Company lookup is temporarily unavailable.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new HttpError(500, "Company lookup credentials are misconfigured.");
  }

  if (response.status === 404) {
    return [];
  }

  if (response.status === 429) {
    throw new HttpError(429, "Too many lookups — please try again in a moment.");
  }

  if (!response.ok) {
    throw new HttpError(502, "Company lookup failed.");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return [];
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((entry) => entry && typeof entry.name === "string")
    .map((entry) => ({
      name: entry.name,
      domain: typeof entry.domain === "string" ? entry.domain : null,
      logo: typeof entry.icon === "string" ? entry.icon : null,
      verified: Boolean(entry.verified),
    }));
}

module.exports = { searchCompanies };
