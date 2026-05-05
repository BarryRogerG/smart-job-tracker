import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCompanySearch } from "../hooks/useCompanySearch.js";

const emptyForm = {
  company: "",
  role: "",
  status: "applied",
  appliedDate: new Date().toISOString().split("T")[0],
  notes: "",
  link: "",
};

const initialErrors = { company: null };

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500";
const inputErrorClass =
  "w-full rounded-lg border border-red-400 px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400";

function buildInitialForm(initialJob) {
  if (!initialJob) return emptyForm;
  return {
    company: initialJob.company || "",
    role: initialJob.role || "",
    status: initialJob.status || "applied",
    appliedDate: initialJob.appliedDate
      ? new Date(initialJob.appliedDate).toISOString().split("T")[0]
      : emptyForm.appliedDate,
    notes: initialJob.notes || "",
    link: initialJob.link || "",
  };
}

// In edit mode an existing companyDomain implies the company was already
// verified at create time, so we seed `selectedCompany` and bypass the
// re-verification blocker. Without this, editing notes on an old job would
// require the user to re-pick their company from the autocomplete.
function buildInitialSelection(initialJob) {
  if (!initialJob || !initialJob.companyDomain) return null;
  return {
    name: initialJob.company,
    domain: initialJob.companyDomain,
    logo: initialJob.companyLogo || null,
    verified: true,
  };
}

function JobForm({
  onSubmit,
  isSubmitting,
  hideHeading = false,
  initialJob = null,
  submitLabel = "Create Job",
  submittingLabel = "Saving...",
}) {
  const [formState, setFormState] = useState(() => buildInitialForm(initialJob));
  const [errors, setErrors] = useState(initialErrors);

  // The "selected" company is the source of truth for whether the input
  // resolves to a real Brandfetch result. It carries the logo + domain we
  // enrich the job with on submit. Edit mode pre-seeds it from the job's
  // saved domain/logo so the submit blocker doesn't fire on existing data.
  const [selectedCompany, setSelectedCompany] = useState(() =>
    buildInitialSelection(initialJob)
  );
  const [isCompanyFocused, setIsCompanyFocused] = useState(false);
  const companyInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Only run the API search when the input is non-trivial AND the user
  // hasn't already locked in a selection that matches the typed text.
  // Without that guard we'd issue a redundant lookup right after the user
  // clicks a result.
  const searchTerm =
    selectedCompany && selectedCompany.name === formState.company
      ? ""
      : formState.company;
  const {
    results: companyResults,
    isLoading: isLookingUpCompany,
    error: companyLookupError,
    hasSearched: hasCompanySearched,
  } = useCompanySearch(searchTerm);

  const showDropdown =
    isCompanyFocused &&
    formState.company.trim().length >= 2 &&
    !selectedCompany &&
    (isLookingUpCompany || companyResults.length > 0);

  // Submit blocker — gated on a confirmed Brandfetch match. Anything else
  // (typing in progress, no results, lookup error) keeps the button disabled.
  const isCompanyResolved = Boolean(
    selectedCompany && selectedCompany.name === formState.company
  );
  const canSubmit =
    isCompanyResolved && !isSubmitting && formState.role.trim().length >= 2;

  useEffect(() => {
    function handlePointerDown(event) {
      const inInput = companyInputRef.current?.contains(event.target);
      const inDropdown = dropdownRef.current?.contains(event.target);
      if (!inInput && !inDropdown) {
        setIsCompanyFocused(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (name in errors && errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleCompanyChange = (event) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, company: value }));
    if (errors.company) {
      setErrors((prev) => ({ ...prev, company: null }));
    }
    // Any keystroke invalidates the previous selection unless the user is
    // simply re-typing the exact same name — in which case we keep the
    // enrichment data attached.
    if (selectedCompany && selectedCompany.name !== value) {
      setSelectedCompany(null);
    }
  };

  const selectCompany = (company) => {
    setFormState((prev) => ({ ...prev, company: company.name }));
    setSelectedCompany(company);
    setErrors((prev) => ({ ...prev, company: null }));
    setIsCompanyFocused(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const companyError = !isCompanyResolved
      ? "Company not found. Please enter a valid company name."
      : null;

    if (companyError) {
      setErrors({ company: companyError });
      return;
    }

    const trimmedLink = formState.link.trim();
    const payload = {
      ...formState,
      company: formState.company.trim(),
      companyDomain: selectedCompany?.domain || undefined,
      companyLogo: selectedCompany?.logo || undefined,
      role: formState.role.trim(),
      notes: formState.notes.trim(),
      link: trimmedLink || undefined,
    };

    try {
      await onSubmit(payload);
      // Only reset the form when creating; on edit we let the parent close
      // the modal so the user keeps seeing their committed values during the
      // close animation instead of a flash of empty fields.
      if (!initialJob) {
        setFormState(emptyForm);
        setErrors(initialErrors);
        setSelectedCompany(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // The "not found" banner only fires after a debounced search has actually
  // completed and returned 0 — we never flash it mid-typing.
  const showNotFound =
    !selectedCompany &&
    formState.company.trim().length >= 2 &&
    hasCompanySearched &&
    !isLookingUpCompany &&
    companyResults.length === 0 &&
    !companyLookupError;

  const companyHasError = Boolean(errors.company) || showNotFound;

  return (
    <form onSubmit={handleSubmit} className="w-full" autoComplete="off">
      {hideHeading ? null : (
        <>
          <h2 className="mb-3 text-xl font-semibold text-text-primary">
            Add Job Application
          </h2>
          <p className="mb-5 text-sm text-text-hint">
            Capture each application as it moves through your pipeline.
          </p>
        </>
      )}
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Company autocomplete */}
          <div className="relative">
            <div className="relative">
              <input
                ref={companyInputRef}
                className={`${
                  companyHasError ? inputErrorClass : inputClass
                } font-semibold text-text-primary placeholder:font-normal placeholder:text-text-hint ${
                  selectedCompany?.logo ? "pl-10" : ""
                }`}
                name="company"
                placeholder="Company"
                value={formState.company}
                onChange={handleCompanyChange}
                onFocus={() => setIsCompanyFocused(true)}
                aria-invalid={companyHasError ? "true" : "false"}
                aria-describedby={
                  companyHasError ? "company-error" : undefined
                }
                aria-autocomplete="list"
                autoComplete="off"
                required
              />
              {selectedCompany?.logo ? (
                <img
                  src={selectedCompany.logo}
                  alt=""
                  aria-hidden="true"
                  className="absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              {isLookingUpCompany ? (
                <Loader2
                  size={16}
                  aria-hidden="true"
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-hint"
                />
              ) : null}
            </div>

            {/* Dropdown */}
            {showDropdown ? (
              <ul
                ref={dropdownRef}
                role="listbox"
                aria-label="Company suggestions"
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-card-hover"
              >
                {isLookingUpCompany && companyResults.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-text-hint">
                    Searching…
                  </li>
                ) : (
                  companyResults.slice(0, 8).map((company) => (
                    <li key={`${company.name}-${company.domain || "no-domain"}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected="false"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                        onClick={() => selectCompany(company)}
                      >
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt=""
                            aria-hidden="true"
                            className="h-7 w-7 shrink-0 rounded object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-text-muted"
                          >
                            {company.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-text-primary">
                            {company.name}
                          </span>
                          {company.domain ? (
                            <span className="block truncate text-xs text-text-hint">
                              {company.domain}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}

            {errors.company ? (
              <p
                id="company-error"
                role="alert"
                className="mt-1 text-xs text-red-600"
              >
                {errors.company}
              </p>
            ) : showNotFound ? (
              <p
                id="company-error"
                role="alert"
                className="mt-1 text-xs text-red-600"
              >
                Company not found. Please enter a valid company name.
              </p>
            ) : companyLookupError ? (
              <p className="mt-1 text-xs text-amber-600">
                {companyLookupError}
              </p>
            ) : isCompanyResolved ? (
              <p className="mt-1 text-xs text-green-700">
                Verified
                {selectedCompany.domain ? ` · ${selectedCompany.domain}` : ""}
              </p>
            ) : null}
          </div>

          {/* Role */}
          <div>
            <input
              className={`${inputClass} text-sm text-text-hint placeholder:text-text-hint`}
              name="role"
              placeholder="Role"
              value={formState.role}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <select
            className={`${inputClass} bg-white`}
            name="status"
            value={formState.status}
            onChange={handleChange}
          >
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
            <option value="offer">Offered</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            className={inputClass}
            type="date"
            name="appliedDate"
            value={formState.appliedDate}
            onChange={handleChange}
            required
          />
        </div>

        <input
          className={inputClass}
          type="url"
          name="link"
          placeholder="Job link"
          value={formState.link}
          onChange={handleChange}
        />
        <textarea
          className={`min-h-24 ${inputClass} mt-2 text-sm text-text-muted placeholder:text-text-hint`}
          name="notes"
          placeholder="Notes"
          value={formState.notes}
          onChange={handleChange}
        />

        <button
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition duration-200 hover:bg-blue-700 hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          type="submit"
          disabled={!canSubmit}
          title={
            !isCompanyResolved
              ? "Pick a verified company from the dropdown to continue."
              : undefined
          }
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default JobForm;
