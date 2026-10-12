import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ChoiceField } from '../components/ChoiceField';
import { TextField } from '../components/Fields';
import { APP_NAME, STUDIOS } from '../config';
import { backend } from '../lib/api';
import { errorMessage } from '../lib/useAsync';

type Mode = 'signin' | 'signup' | 'reset';

/** Only allow redirects within the app. */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function SignInPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'reset' ? 'reset' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [studio, setStudio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (user) return <Navigate to={next} replace />;

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        await backend.signIn(email.trim(), password);
      } else if (mode === 'signup') {
        const needsConfirm = await backend.signUp({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          studio: studio.trim() || null,
        });
        if (needsConfirm) {
          setInfo('Almost there — check your email for a confirmation link, then come back and sign in.');
          setMode('signin');
        }
      } else {
        await backend.requestPasswordReset(email.trim());
        setInfo('If that email has an account, a reset link is on its way. Open it on this device.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const submitLabel = mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in';

  return (
    <div className="narrow">
      <form className="form auth-form" onSubmit={onSubmit}>
        <h1 className="page-title">
          {mode === 'signup' ? `Join ${APP_NAME}` : mode === 'reset' ? 'Reset password' : 'Welcome back'}
        </h1>
        {mode !== 'reset' && (
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={`tab${mode === 'signin' ? ' selected' : ''}`}
              onClick={() => switchTo('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`tab${mode === 'signup' ? ' selected' : ''}`}
              onClick={() => switchTo('signup')}
            >
              Create account
            </button>
          </div>
        )}
        {info && (
          <p className="form-ok" role="status">
            {info}
          </p>
        )}

        <fieldset disabled={busy}>
          {mode === 'signup' && (
            <>
              <TextField
                label="Your name"
                value={displayName}
                required
                maxLength={60}
                autoComplete="name"
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <ChoiceField
                id="signup-studio"
                label="Studio you go to"
                value={studio}
                options={STUDIOS}
                onChange={setStudio}
                placeholder="Not specified"
                otherLabel="Studio name"
              />
            </>
          )}
          <TextField
            label="Email"
            type="email"
            value={email}
            required
            autoComplete="email"
            inputMode="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== 'reset' && (
            <TextField
              label="Password"
              type="password"
              value={password}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              supportingText={mode === 'signup' ? 'At least 6 characters' : undefined}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </fieldset>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-filled btn-block" disabled={busy}>
          {busy ? 'Please wait…' : submitLabel}
        </button>

        {mode === 'signin' && (
          <button type="button" className="btn btn-text btn-center" onClick={() => switchTo('reset')}>
            Forgot your password?
          </button>
        )}
        {mode === 'reset' && (
          <button type="button" className="btn btn-text btn-center" onClick={() => switchTo('signin')}>
            Back to sign in
          </button>
        )}
        <p className="section-supporting center">Anyone can browse. You need an account to add combos.</p>
        {backend.mode === 'demo' && (
          <p className="section-supporting center">
            Demo mode: use any email and password. The account only exists in this browser.
          </p>
        )}
      </form>
    </div>
  );
}
