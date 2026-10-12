import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { TextField } from '../components/Fields';
import { backend } from '../lib/api';
import { errorMessage } from '../lib/useAsync';

/** Landing page for the link in a password-reset email. */
export function ResetPasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="narrow empty">
        <h1 className="page-title">Reset link expired</h1>
        <p>
          This link has expired or was opened on a different device or browser from the one you requested it on.
        </p>
        <Link to="/signin?mode=reset" className="btn btn-tonal">
          Send a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await backend.updatePassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="narrow">
      <form className="form" onSubmit={onSubmit}>
        <h1 className="page-title">Choose a new password</h1>
        <TextField
          label="New password"
          type="password"
          value={password}
          required
          minLength={6}
          autoComplete="new-password"
          supportingText="At least 6 characters"
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-filled btn-block" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </div>
  );
}
