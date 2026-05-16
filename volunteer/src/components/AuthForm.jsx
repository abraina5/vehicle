import { useEffect, useState } from 'react';

const initialSignupState = {
  name: '',
  phoneNumber: '',
  email: '',
  password: '',
};

const initialLoginState = {
  email: '',
  password: '',
};

export function AuthForm({ mode, onSubmit, isBusy }) {
  const [values, setValues] = useState(mode === 'signup' ? initialSignupState : initialLoginState);

  useEffect(() => {
    setValues(mode === 'signup' ? initialSignupState : initialLoginState);
  }, [mode]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      {mode === 'signup' && (
        <>
          <label className="field">
            <span>Full name</span>
            <input
              autoComplete="name"
              name="name"
              placeholder="Jane Volunteer"
              required
              value={values.name}
              onChange={handleChange}
            />
          </label>

          <label className="field">
            <span>Phone number</span>
            <input
              autoComplete="tel"
              name="phoneNumber"
              placeholder="+1 555 123 4567"
              required
              value={values.phoneNumber}
              onChange={handleChange}
            />
          </label>
        </>
      )}

      <label className="field">
        <span>Email address</span>
        <input
          autoComplete="email"
          name="email"
          placeholder="volunteer@example.org"
          required
          type="email"
          value={values.email}
          onChange={handleChange}
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          name="password"
          placeholder="********"
          required
          type="password"
          value={values.password}
          onChange={handleChange}
        />
      </label>

      <button className="primary-button" disabled={isBusy} type="submit">
        {isBusy ? 'Working...' : mode === 'signup' ? 'Create volunteer account' : 'Sign in'}
      </button>
    </form>
  );
}
