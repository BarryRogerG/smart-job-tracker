const { loginUser, registerUser } = require("../services/auth.service");

async function register(req, res) {
  const response = await registerUser(req.validated.body);
  return res.status(201).json(response);
}

async function login(req, res) {
  const response = await loginUser(req.validated.body);
  return res.status(200).json(response);
}

module.exports = {
  register,
  login,
};
