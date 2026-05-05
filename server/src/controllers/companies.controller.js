const { searchCompanies } = require("../services/brandfetch.service");

async function verifyCompanyHandler(req, res) {
  const name = typeof req.query.name === "string" ? req.query.name : "";

  if (name.trim().length < 2) {
    return res.status(200).json({ results: [] });
  }

  const results = await searchCompanies(name);
  return res.status(200).json({ results });
}

module.exports = { verifyCompanyHandler };
