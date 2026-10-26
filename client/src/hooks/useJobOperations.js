import { useCallback, useState } from "react";

/**
 * Edit + delete confirmation flows for job rows (modals stay in the page;
 * this hook owns the state and async handlers).
 *
 * @param {object} options
 * @param {(id: string|number, body: object) => Promise<unknown>} options.updateJob
 * @param {(job: object) => Promise<unknown>} options.deleteJob
 * @param {() => void} options.clearError
 * @param {boolean} options.canEditDelete
 */
export function useJobOperations({
  updateJob,
  deleteJob,
  clearError,
  canEditDelete,
}) {
  const [editingJob, setEditingJob] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteJob, setPendingDeleteJob] = useState(null);

  const openEdit = useCallback(
    (job) => {
      if (!canEditDelete || !job) return;
      setEditingJob(job);
    },
    [canEditDelete]
  );

  const closeEdit = useCallback(() => {
    setEditingJob(null);
    setIsSavingEdit(false);
  }, []);

  const handleSaveEdit = useCallback(
    async (payload) => {
      if (!editingJob) return;
      setIsSavingEdit(true);
      clearError();
      try {
        await updateJob(editingJob.id, payload);
        closeEdit();
      } catch (err) {
        setIsSavingEdit(false);
        throw err;
      }
    },
    [editingJob, updateJob, clearError, closeEdit]
  );

  const requestDelete = useCallback(
    (job) => {
      if (!canEditDelete || !job) return;
      setPendingDeleteJob(job);
    },
    [canEditDelete]
  );

  const closeDeleteModal = useCallback(() => {
    setPendingDeleteJob(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteJob) return;
    clearError();
    try {
      await deleteJob(pendingDeleteJob);
      setPendingDeleteJob(null);
    } catch {
      /* context sets error; 401 handled by apiClient */
    }
  }, [pendingDeleteJob, deleteJob, clearError]);

  return {
    editingJob,
    /** Saving state for the edit modal submit button / JobForm. */
    isSavingEdit,
    pendingDeleteJob,
    openEdit,
    closeEdit,
    handleSaveEdit,
    requestDelete,
    closeDeleteModal,
    confirmDelete,
  };
}
