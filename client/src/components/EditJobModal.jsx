import Dialog from "./Dialog.jsx";
import JobForm from "./JobForm.jsx";

/**
 * Modal shell for editing an existing job (used from the dashboard / jobs views).
 */
export default function EditJobModal({
  open,
  onClose,
  job,
  onSave,
  isSaving,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit job"
      description="Update details and save changes."
      size="lg"
    >
      {job ? (
        <JobForm
          initialJob={job}
          onSubmit={onSave}
          isSubmitting={isSaving}
          submitLabel="Save changes"
          submittingLabel="Saving..."
          hideHeading
        />
      ) : null}
    </Dialog>
  );
}
