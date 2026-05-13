import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SECTORS } from '../types';
// NOTE: Auto-printing is DISABLED in this iteration. The badge printer is
// still implemented in `printBadge.ts` and the import below is kept so it can
// be re-enabled later by uncommenting the call in handleSubmit().
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { printBadge } from '../printBadge';

export default function Entry() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');
  const [sector, setSector] = useState<string>(SECTORS[0]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // Defensive: some embedded browsers don't expose mediaDevices.
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera unavailable / Cámara no disponible');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCameraReady(true);
      } catch (err) {
        // Includes NotAllowedError (permission denied), NotFoundError, etc.
        console.warn('Camera error:', err);
        setCameraError('Camera unavailable / Cámara no disponible');
      }
    }
    start();

    // Stop the stream on unmount (back, auto-reset to home, route change).
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }

  function capturePhoto(): string {
    const video = videoRef.current;
    if (!video || !cameraReady) return '';
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch {
      return '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim() || !dni.trim() || !sector) {
      setError('Complete todos los campos / Fill all fields');
      return;
    }

    setSubmitting(true);
    const photo = capturePhoto();
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dni: dni.trim(),
      sector,
      photo,
    };

    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');

      // ---------------------------------------------------------------
      // BADGE PRINTING — disabled in this iteration.
      // To re-enable, uncomment the block below. The entry is already
      // saved at this point, so print failures must NOT block flow.
      //
      // try {
      //   printBadge({ ...payload, photo, entryTime: new Date().toISOString() });
      // } catch (err) {
      //   console.warn('Print error:', err);
      // }
      // ---------------------------------------------------------------

      stopCamera();
      setSuccess(true);
      // Brief success message, then return to home.
      window.setTimeout(() => navigate('/', { replace: true }), 1600);
    } catch (err) {
      console.error(err);
      setError('Error al guardar. Intente de nuevo.');
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
          <p className="success-msg">¡Entrada registrada!<br />Entry registered</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen form-screen">
      <button className="back-btn" onClick={() => navigate('/')}>← Volver / Back</button>
      <h1 className="screen-title">Registrar Entrada / Register Entry</h1>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-fields">
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

            <label className="field">
              <span>DNI</span>
              <input
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                autoComplete="off"
              />
            </label>

            <label className="field">
              <span>Sector</span>
              <select value={sector} onChange={(e) => setSector(e.target.value)}>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="camera-box">
            <video ref={videoRef} className="camera" playsInline muted />
            {!cameraReady && !cameraError && <div className="camera-msg">Iniciando cámara…</div>}
            {cameraError && <div className="camera-msg error">{cameraError}</div>}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button className="submit-btn" type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Registrar / Register'}
        </button>
      </form>
    </div>
  );
}
