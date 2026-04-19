import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase/client';
import { ensureUserRecords, signOutUser } from './firebase/auth';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { VolunteerDashboard } from './pages/VolunteerDashboard';

function App() {
  const [session, setSession] = useState({
    loading: true,
    user: null,
    role: null,
  });

  useEffect(() => {
    let unsubscribeUserDoc = () => {};

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        unsubscribeUserDoc();

        if (!user) {
          setSession({ loading: false, user: null, role: null });
          return;
        }

        try {
          await ensureUserRecords(user);
        } catch (error) {
          console.error('Unable to bootstrap user records', error);
        }

        unsubscribeUserDoc = onSnapshot(
          doc(db, 'users', user.uid),
          (snapshot) => {
            const role = snapshot.data()?.role ?? 'volunteer';
            setSession({ loading: false, user, role });
          },
          (error) => {
            console.error('Unable to load user role', error);
            setSession({ loading: false, user, role: 'volunteer' });
          },
        );
      },
      (error) => {
        console.error('Auth listener failed', error);
        setSession({ loading: false, user: null, role: null });
      },
    );

    return () => {
      unsubscribeUserDoc();
      unsubscribeAuth();
    };
  }, []);

  if (session.loading) {
    return (
      <div className="screen-shell">
        <div className="loading-card">
          <p className="eyebrow">Volunteer Workspace</p>
          <h1>Loading your dashboard...</h1>
        </div>
      </div>
    );
  }

  if (!session.user) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Nonprofit Volunteer Management</p>
          <h1>{session.role === 'admin' ? 'Admin Dashboard' : 'Volunteer Dashboard'}</h1>
          <p className="subtle-text">
            Signed in as {session.user.email} ({session.role})
          </p>
        </div>

        <button className="secondary-button" type="button" onClick={signOutUser}>
          Sign out
        </button>
      </header>

      {session.role === 'admin' ? (
        <AdminDashboard user={session.user} />
      ) : (
        <VolunteerDashboard user={session.user} />
      )}
    </div>
  );
}

export default App;
