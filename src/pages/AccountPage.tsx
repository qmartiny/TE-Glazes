import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ChoiceField } from '../components/ChoiceField';
import { TextArea, TextField } from '../components/Fields';
import { Icon } from '../components/Icon';
import { showSnackbar } from '../components/Snackbar';
import { STUDIOS } from '../config';
import { backend } from '../lib/api';
import { readTheme, setTheme, THEMES } from '../lib/theme';
import { errorMessage } from '../lib/useAsync';

export function AccountPage() {
  const { user, profile, setProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [studio, setStudio] = useState(profile?.studio ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  const settingUp = !profile;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await backend.saveProfile(user.id, {
        displayName: displayName.trim(),
        studio: studio.trim() || null,
        bio: bio.trim() || null,
      });
      setProfile(saved);
      const next = params.get('next');
      if (settingUp && next) navigate(next, { replace: true });
      else showSnackbar('Profile saved');
    } catch (err) {
      setError(`Couldn't save: ${errorMessage(err)}`);
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
        <h1 className="page-title">{settingUp ? 'Set up your profile' : 'Settings'}</h1>
        {settingUp ? (
          <p className="section-supporting">Tell other members who you are before adding combos.</p>
        ) : (
          <h2 className="section-title">Profile</h2>
        )}
        <fieldset disabled={saving}>
          <TextField
            label="Name"
            value={displayName}
            required
            maxLength={60}
            autoComplete="name"
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <ChoiceField
            id="profile-studio"
            label="Studio you go to"
            value={studio}
            options={STUDIOS}
            onChange={setStudio}
            placeholder="Not specified"
            otherLabel="Studio name"
          />
          <TextArea
            label="About you (optional)"
            rows={3}
            value={bio}
            maxLength={500}
            onChange={(e) => setBio(e.target.value)}
            supportingText="e.g. Mostly throwing mugs and bowls"
          />
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-filled" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <AppearanceSettings />

      {/* Once the profile exists, signing out lives on My profile. */}
      {settingUp && (
        <section className="account-extra">
          <p className="section-supporting">Signed in as {user.email}</p>
          <button type="button" className="btn btn-outlined" onClick={onSignOut}>
            <Icon name="logout" /> Sign out
          </button>
        </section>
      )}
    </div>
  );
}

/** Light or dark theme, applied straight away and remembered on this device. */
function AppearanceSettings() {
  const [theme, setThemeState] = useState(readTheme);
  return (
    <section className="account-extra" aria-labelledby="appearance-h">
      <h2 id="appearance-h" className="section-title">
        Appearance
      </h2>
      <div className="segmented segmented-full" role="radiogroup" aria-label="Theme">
        {THEMES.map((t) => (
          <label key={t.value} className={`segment${theme === t.value ? ' selected' : ''}`}>
            <input
              type="radio"
              name="theme"
              value={t.value}
              checked={theme === t.value}
              onChange={() => {
                setTheme(t.value);
                setThemeState(t.value);
              }}
            />
            {theme === t.value && <Icon name="check" />}
            {t.label}
          </label>
        ))}
      </div>
      <p className="section-supporting">Auto matches your phone or computer. Saved on this device.</p>
    </section>
  );
}
