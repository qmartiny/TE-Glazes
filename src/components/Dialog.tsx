import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  headline: string;
  children: ReactNode;
  actions: ReactNode;
  onClose: () => void;
}

/** Material 3 basic dialog on top of the native <dialog> (focus trap and Esc for free). */
export function Dialog({ open, headline, children, actions, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-headline"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A tap on the scrim (outside the panel) closes the dialog.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-panel">
        <h2 id="dialog-headline" className="dialog-headline">
          {headline}
        </h2>
        <div className="dialog-content">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </dialog>
  );
}
