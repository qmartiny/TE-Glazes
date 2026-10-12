import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ChoiceField } from '../components/ChoiceField';
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

  return (
    <div className="narrow">
      <form className="form auth-form" onSubmit={onSubmit}>
        <h1>{mode === 'signup' ? `Join ${APP_NAME}` : mode === 'reset' ? 'Reset password' : 'Sign in'}</h1>
        {mode !== 'reset' && (
          <div className="segmented tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={mode === 'signin' ? 'selected' : ''}
              onClick={() => switchTo('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'selected' : ''}
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
              <label className="field">
                <span>Your name</span>
                <input
                  type="text"
                  value={displayName}
                  required
                  maxLength={60}
                  autoComplete="name"
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Studio you go to</span>
                <ChoiceField
                  id="signup-studio"
                  value={studio}
                  options={STUDIOS}
                  onChange={setStudio}
                  placeholder="Choose studio"
                  otherPlaceholder="Studio name"
                />
              </label>
            </>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              required
              autoComplete="email"
              inputMode="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode !== 'reset' && (
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
        </fieldset>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy
            ? 'Please wait…'
            : mode === 'signup'
              ? 'Create account'
              : mode === 'reset'
                ? 'Send reset link'
                : 'Sign in'}
        </button>

        <p className="auth-alt">
          {mode === 'signin' && (
            <button type="button" className="link-btn" onClick={() => switchTo('reset')}>
              Forgot your password?
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" className="link-btn" onClick={() => switchTo('signin')}>
              Back to sign in
            </button>
          )}
        </p>
        <p className="hint">Anyone can browse. You need an account to add combos.</p>
        {backend.mode === 'demo' && (
          <p className="hint">Demo mode: use any email and password — the account only exists in this browser.</p>
        )}
      </form>
    </div>
  );
}
