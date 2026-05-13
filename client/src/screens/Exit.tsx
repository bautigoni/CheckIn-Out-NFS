import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Exit() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('Complete todos los campos / Fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      });

      if (res.status === 404) {
        setError('No se encontró una entrada abierta para este visitante.');
        setSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error('Update failed');

      setSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (err) {
      console.error(err);
      setError('Error al registrar salida. Intente de nuevo.');
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="screen success-screen">
        <div className="success-card">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </div>
          <p className="success-msg">¡Salida registrada!<br />Exit registered</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={() => navigate('/')}>← Volver / Back</button>
      <h1 className="screen-title">Registrar Salida / Register Exit</h1>

      <form className="form form-narrow" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nombre / First Name</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Apellido / Last Name</span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="off"
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Registrar Salida / Register Exit'}
          </button>
        </form>
    </div>
  );
}
