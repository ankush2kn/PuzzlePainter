"use client";

interface SwitchPageConfirmProps {
  open: boolean;
  pageName?: string;
  onKeep: () => void;
  onReset: () => void;
  onCancel: () => void;
}

export function SwitchPageConfirm({
  open,
  pageName,
  onKeep,
  onReset,
  onCancel,
}: SwitchPageConfirmProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal switch-page-modal"
        role="dialog"
        aria-labelledby="switch-page-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header centered">
          <h2 id="switch-page-title">Keep your painting?</h2>
          <p>
            You already drew on this canvas
            {pageName ? (
              <>
                . Switching to <strong>{pageName}</strong>
              </>
            ) : null}
            .
          </p>
        </header>

        <div className="modal-actions wrap">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary alt" onClick={onKeep}>
            Keep painting
          </button>
          <button type="button" className="btn-primary" onClick={onReset}>
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}
