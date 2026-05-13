import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../lib/auth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user.trim(), password }),
      });
      if (!res.ok) {
        setError('Usuario o contraseña incorrectos');
        setSubmitting(false);
        return;
      }
      const data: { token: string } = await res.json();
      setToken(data.token);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Error de conexión');
      setSubmitting(false);
    }
  }

  return (
    <div className="screen admin-login-screen">
      <div className="admin-login-card">
        <h1 className="admin-login-title">Administración</h1>
        <p className="admin-login-sub">Acceso restringido</p>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Usuario</span>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>

          <button
            type="button"
            className="link-btn"
            onClick={() => navigate('/', { replace: true })}
          >
            ← Volver al inicio
          </button>
        </form>
      </div>
    </div>
  );
}
