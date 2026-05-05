/**
 * Skeleton primitives shown during the initial data fetch to improve perceived
 * performance. They use Tailwind's `animate-pulse` and intentionally mirror
 * the geometry of the real components so the layout doesn't jump on swap-in.
 */

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Single tile in the four-up status summary grid (Applied / Interviewing /
 * Offered / Rejected). Matches the rounded-xl card with title row + count.
 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-8 w-14" />
    </div>
  );
}

/**
 * The four status tiles in the same grid layout the dashboard uses.
 */
export function StatsSkeleton() {
  return (
    <section
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading stats"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </section>
  );
}

/**
 * Comfortable-density job card skeleton — header, role, meta, action bar.
 */
export function JobCardSkeleton() {
  return (
    <article className="rounded-xl border border-gray-300 bg-white p-6 shadow-md">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <Skeleton className="h-3 w-1/3" />

        <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </article>
  );
}

/**
 * Compact-density job card skeleton — single row, two columns.
 */
export function CompactJobCardSkeleton() {
  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="hidden h-3 w-16 sm:block" />
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
    </article>
  );
}

/**
 * A vertical list of job-card skeletons that matches the active density.
 */
export function JobListSkeleton({ density = "comfortable", count = 4 }) {
  const Item =
    density === "compact" ? CompactJobCardSkeleton : JobCardSkeleton;
  const spacing = density === "compact" ? "space-y-1.5" : "space-y-4";

  return (
    <section
      className={spacing}
      aria-busy="true"
      aria-label="Loading job applications"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Item key={index} />
      ))}
    </section>
  );
}

export default Skeleton;
