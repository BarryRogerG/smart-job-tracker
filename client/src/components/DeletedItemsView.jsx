import { useState } from "react";
import { useJobs } from "../context/JobContext.jsx";

/**
 * The "Deleted Items" tab. Reads from JobContext directly since every piece
 * of data + every action it needs lives there.
 */
export default function DeletedItemsView() {
  const { deletedItems, clearDeletedItems, restoreDeletedJob } = useJobs();
  const [restoringId, setRestoringId] = useState(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Deleted Items
          </h2>
          <p className="text-sm text-text-hint">
            Restore jobs from the app trash when plans change.
          </p>
        </div>
        {deletedItems.length > 0 ? (
          <button
            type="button"
            onClick={clearDeletedItems}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-text-muted transition hover:bg-gray-50"
          >
            Empty trash
          </button>
        ) : null}
      </div>

      {deletedItems.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-text-hint">
          Trash is empty.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {deletedItems.map((item) => (
            <article
              key={`${item.id}-${item.deletedAt || "deleted"}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {item.company}
                </p>
                <p className="truncate text-sm text-text-muted">
                  {item.role}
                </p>
                {item.deletedAt ? (
                  <p className="text-xs text-text-hint">
                    Deleted {new Date(item.deletedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={restoringId != null}
                onClick={async () => {
                  setRestoringId(item.id);
                  try {
                    await restoreDeletedJob(item);
                  } finally {
                    setRestoringId(null);
                  }
                }}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {restoringId === item.id ? "Restoring..." : "Restore"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
