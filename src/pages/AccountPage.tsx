import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ChoiceField } from '../components/ChoiceField';
import { STUDIOS } from '../config';
import { backend } from '../lib/api';
import { errorMessage } from '../lib/useAsync';

export function AccountPage() {
  const { user, profile, setProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [studio, setStudio] = useState(profile?.studio ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) return null;
  const settingUp = !profile;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await backend.saveProfile(user.id, {
        displayName: displayName.trim(),
        studio: studio.trim() || null,
        bio: bio.trim() || null,
      });
      setProfile(saved);
      const next = params.get('next');
      if (settingUp && next) navigate(next, { replace: true });
      else setMessage({ ok: true, text: 'Profile saved.' });
    } catch (err) {
      setMessage({ ok: false, text: `Couldn't save: ${errorMessage(err)}` });
    } finally {
      setSaving(false);
    }
  }

  async function onSignOut() {
    await backend.signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="narrow">
      <form className="form" onSubmit={onSubmit}>
        <h1>{settingUp ? 'Set up your profile' : 'Your profile'}</h1>
        {settingUp && <p className="hint">Tell other members who you are before adding combos.</p>}
        <fieldset disabled={saving}>
          <label className="field">
            <span>Name</span>
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
              id="profile-studio"
              value={studio}
              options={STUDIOS}
              onChange={setStudio}
              placeholder="Choose studio"
              otherPlaceholder="Studio name"
            />
          </label>
          <label className="field">
            <span>
              About you <span className="muted">(optional)</span>
            </span>
            <textarea
              rows={3}
              value={bio}
              maxLength={500}
              placeholder="e.g. Mostly throwing mugs and bowls"
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
        </fieldset>
        {message && (
          <p className={message.ok ? 'form-ok' : 'form-error'} role="status">
            {message.text}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <section className="account-extra">
        <p className="muted">Signed in as {user.email}</p>
        <button type="button" className="btn" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </div>
  );
}
