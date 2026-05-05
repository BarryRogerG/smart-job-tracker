import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { register as registerRequest } from "../services/authApi";
import { useAuth } from "../context/AuthContext.jsx";

const fieldClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

const inputClass = `${fieldClass} mb-3`;

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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
    setError("");

    if (formState.password !== formState.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await registerRequest({
        email: formState.email.trim(),
        password: formState.password,
        name: formState.name.trim() || undefined,
      });
      login(response.token, response.user);
      navigate("/");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Could not create account"
      );
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
          Create account
        </h1>
        <p className="mb-4 text-sm text-text-hint">
          Register to use Smart Job Tracker
        </p>

        <input
          className={inputClass}
          type="text"
          name="name"
          placeholder="Name (optional)"
          value={formState.name}
          onChange={handleChange}
          autoComplete="name"
        />
        <input
          className={inputClass}
          type="email"
          name="email"
          placeholder="Email"
          value={formState.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />

        <div className="relative mb-3">
          <input
            className={`${fieldClass} pr-10`}
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password (min 8 characters)"
            value={formState.password}
            onChange={handleChange}
            required
            minLength={8}
            autoComplete="new-password"
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

        <input
          className={inputClass}
          type={showPassword ? "text" : "password"}
          name="confirmPassword"
          placeholder="Confirm password"
          value={formState.confirmPassword}
          onChange={handleChange}
          required
          minLength={8}
          autoComplete="new-password"
        />

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition duration-200 hover:bg-blue-700 hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account..." : "Register"}
        </button>

        <p className="mt-4 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link
            to="/login"
            className="inline-block rounded-sm font-medium text-blue-600 transition duration-200 hover:text-blue-800 active:scale-95"
          >
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

export default RegisterPage;
