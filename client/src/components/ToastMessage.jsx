export default function ToastMessage({ toast }) {
  if (!toast) {
    return null;
  }

  return (
    <div className={`toast-message toast-${toast.type || "info"}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
