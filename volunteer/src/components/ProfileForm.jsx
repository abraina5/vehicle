import { useEffect, useState } from 'react';

const blankProfile = {
  name: '',
  email: '',
  phoneNumber: '',
  emergencyContact: '',
  notes: '',
};

export function ProfileForm({ profile, onSave, isSaving }) {
  const [values, setValues] = useState(blankProfile);

  useEffect(() => {
    setValues({
      name: profile?.name ?? '',
      email: profile?.email ?? '',
      phoneNumber: profile?.phoneNumber ?? '',
      emergencyContact: profile?.emergencyContact ?? '',
      notes: profile?.notes ?? '',
    });
  }, [profile]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSave(values);
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Name</span>
        <input name="name" required value={values.name} onChange={handleChange} />
      </label>

      <label className="field">
        <span>Email</span>
        <input disabled name="email" value={values.email} onChange={handleChange} />
      </label>

      <label className="field">
        <span>Phone number</span>
        <input name="phoneNumber" required value={values.phoneNumber} onChange={handleChange} />
      </label>

      <label className="field">
        <span>Emergency contact</span>
        <input name="emergencyContact" value={values.emergencyContact} onChange={handleChange} />
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea
          name="notes"
          placeholder="Availability, accommodations, or service preferences"
          rows="4"
          value={values.notes}
          onChange={handleChange}
        />
      </label>

      <button className="primary-button" disabled={isSaving} type="submit">
        {isSaving ? 'Saving...' : 'Save profile'}
      </button>
    </form>
  );
}
