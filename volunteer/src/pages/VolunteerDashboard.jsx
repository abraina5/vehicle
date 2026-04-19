import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { EventList } from '../components/EventList';
import { ProfileForm } from '../components/ProfileForm';
import { db } from '../firebase/client';

export function VolunteerDashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribeProfile = onSnapshot(
      doc(db, 'volunteers', user.uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? snapshot.data() : null);
      },
      (snapshotError) => setError(snapshotError.message),
    );

    const eventQuery = query(
      collection(db, 'serviceEvents'),
      where('assignedVolunteerIds', 'array-contains', user.uid),
      orderBy('startAt'),
    );

    const unsubscribeEvents = onSnapshot(
      eventQuery,
      (snapshot) => {
        const assignedEvents = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));
        setEvents(assignedEvents);
      },
      (snapshotError) => setError(snapshotError.message),
    );

    return () => {
      unsubscribeProfile();
      unsubscribeEvents();
    };
  }, [user.uid]);

  async function handleSaveProfile(values) {
    setError('');
    setIsSaving(true);

    try {
      await updateDoc(doc(db, 'volunteers', user.uid), {
        name: values.name.trim(),
        phoneNumber: values.phoneNumber.trim(),
        emergencyContact: values.emergencyContact.trim(),
        notes: values.notes.trim(),
        updatedAt: serverTimestamp(),
      });
    } catch (saveError) {
      setError(saveError.message || 'Unable to update your profile.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dashboard-grid volunteer-grid">
      <section className="dashboard-card">
        <p className="eyebrow">Your Profile</p>
        <h2>Keep your contact details current</h2>
        {error && <p className="error-banner">{error}</p>}
        <ProfileForm isSaving={isSaving} profile={profile} onSave={handleSaveProfile} />
      </section>

      <section className="dashboard-card">
        <p className="eyebrow">Assigned Events</p>
        <h2>Your upcoming volunteer schedule</h2>
        <EventList
          emptyMessage="You do not have any assigned events yet."
          events={events}
          showReminder
        />
      </section>
    </div>
  );
}
