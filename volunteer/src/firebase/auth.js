import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './client';

export async function ensureUserRecords(user, profile = {}) {
  if (!user) {
    return;
  }

  const userRef = doc(db, 'users', user.uid);
  const volunteerRef = doc(db, 'volunteers', user.uid);

  const [userSnapshot, volunteerSnapshot] = await Promise.all([
    getDoc(userRef),
    getDoc(volunteerRef),
  ]);

  const batch = writeBatch(db);
  let hasWrites = false;

  if (!userSnapshot.exists()) {
    hasWrites = true;
    batch.set(userRef, {
      uid: user.uid,
      email: user.email ?? '',
      role: 'volunteer',
      createdAt: serverTimestamp(),
    });
  }

  if (!volunteerSnapshot.exists()) {
    hasWrites = true;
    batch.set(volunteerRef, {
      uid: user.uid,
      email: user.email ?? '',
      name: profile.name ?? user.displayName ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      emergencyContact: profile.emergencyContact ?? '',
      notes: profile.notes ?? '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (hasWrites) {
    await batch.commit();
  }
}

export async function signUpVolunteer({ email, password, name, phoneNumber }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserRecords(credential.user, { name, phoneNumber });
  return credential.user;
}

export async function signInUser({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserRecords(credential.user);
  return credential.user;
}

export async function signOutUser() {
  await signOut(auth);
}
