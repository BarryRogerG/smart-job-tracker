import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { login as loginRequest } from "../services/authApi";
import { useAuth } from "../context/AuthContext.jsx";

const fieldClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

/** Used for standard stacked fields; keeps name stable for HMR / partial saves */
const inputClass = `${fieldClass} mb-3`;

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formState, setFormState] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

 const handleSubmit = async (event) => {
  event.preventDefault();

  setIsSubmitting(true);
  setError("");

  try {
    const { email, password } = formState;

    const response = await loginRequest({
      email: email?.trim() ?? "",
      password,
    });

    login(response.token, response.user);
    navigate("/");
  } catch (requestError) {
    const message =
      requestError?.response?.data?.message ||
      requestError?.message ||
      "Login failed";

    setError(message);
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      >
        <h1 className="mb-1 text-xl font-semibold text-text-primary">
          Smart Job Tracker
        </h1>
        <p className="mb-4 text-sm text-text-hint">Sign in to your account</p>
        <input
          className={inputClass}
          type="email"
          name="email"
          placeholder="Email"
          value={formState.email}
          onChange={handleChange}
          required
        />
        <div className="relative mb-3">
          <input
            className={`${fieldClass} pr-10`}
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={formState.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-hint transition duration-200 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 active:scale-95"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <button
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition duration-200 hover:bg-blue-700 hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>

        <p className="mt-4 text-center text-sm text-text-muted">
          No account yet?{" "}
          <Link
            to="/register"
            className="inline-block rounded-sm font-medium text-blue-600 transition duration-200 hover:text-blue-800 active:scale-95"
          >
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}

export default LoginPage;
