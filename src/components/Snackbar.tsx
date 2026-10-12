import { useEffect, useState } from 'react';

// A Material snackbar: brief confirmation at the bottom of the screen.
// Call showSnackbar('Link copied') from anywhere; <SnackbarHost /> renders it.

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function showSnackbar(message: string) {
  for (const listener of listeners) listener(message);
}

export function SnackbarHost() {
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => {
    const listener: Listener = (text) => setMessage({ text, id: Date.now() });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <div className="snackbar-host" role="status" aria-live="polite">
      {message && (
        <div key={message.id} className="snackbar">
          {message.text}
        </div>
      )}
    </div>
  );
}
