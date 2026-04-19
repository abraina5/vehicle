import { useState } from 'react';
import { AuthForm } from '../components/AuthForm';
import { signInUser, signUpVolunteer } from '../firebase/auth';

export function LoginPage() {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(values) {
    setError('');
    setIsBusy(true);

    try {
      if (mode === 'signup') {
        await signUpVolunteer(values);
      } else {
        await signInUser(values);
      }
    } catch (submitError) {
      setError(submitError.message || 'We could not complete that request.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="screen-shell">
      <section className="auth-card">
        <div>
          <p className="eyebrow">Volunteer Management</p>
          <h1>Coordinate service events without a heavy backend</h1>
          <p className="subtle-text">
            Volunteers can register, update their profile, and view only their assigned events.
            Admin access is granted by setting the user role to <code>admin</code> in Firestore.
          </p>
        </div>

        <div className="tab-row" role="tablist" aria-label="Authentication mode">
          <button
            className={mode === 'login' ? 'tab-button active' : 'tab-button'}
            type="button"
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            className={mode === 'signup' ? 'tab-button active' : 'tab-button'}
            type="button"
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        {error && <p className="error-banner">{error}</p>}

        <AuthForm mode={mode} onSubmit={handleSubmit} isBusy={isBusy} />
      </section>
    </div>
  );
}
