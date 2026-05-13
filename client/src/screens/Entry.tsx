import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SECTORS, type Visitor } from '../types';
import { printBadge } from '../printBadge';

export default function Entry() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [registeredVisitor, setRegisteredVisitor] = useState<Visitor | null>(null);

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
      const data = (await res.json()) as { visitor?: Visitor };
      const visitor = data.visitor ?? {
        id: Date.now(),
        firstName: payload.firstName,
        lastName: payload.lastName,
        dni: payload.dni,
        sector: payload.sector,
        photoBase64: photo || null,
        entryTime: new Date().toISOString(),
        exitTime: null,
        createdAt: new Date().toISOString(),
      };

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
      setRegisteredVisitor(visitor);
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setError('Error al guardar. Intente de nuevo.');
      setSubmitting(false);
    }
  }

  function finishWithoutPrint() {
    setFirstName('');
    setLastName('');
    setDni('');
    setSector(SECTORS[0]);
    setRegisteredVisitor(null);
    stopCamera();
    navigate('/', { replace: true });
  }

  function handlePrintBadge() {
    if (!registeredVisitor) return;
    try {
      printBadge({
        firstName: registeredVisitor.firstName,
        lastName: registeredVisitor.lastName,
        dni: registeredVisitor.dni,
        sector: registeredVisitor.sector,
        photo: registeredVisitor.photoBase64 ?? '',
        entryTime: registeredVisitor.entryTime,
      });
    } catch (err) {
      console.warn('Print error:', err);
    }
    window.setTimeout(() => navigate('/', { replace: true }), 900);
  }

  if (registeredVisitor) {
    return (
      <div className="screen success-screen entry-confirm-screen">
        <div className="success-card entry-confirm-card">
          <div className="success-icon entry-confirm-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </div>
          <div className="entry-confirm-copy">
            <h1>Registro realizado correctamente</h1>
            <p>
              {registeredVisitor.firstName} {registeredVisitor.lastName}
              <span>Entrada guardada. Selecciona como finalizar el registro.</span>
            </p>
          </div>
          <div className="entry-confirm-actions">
            <button className="print-primary-btn" type="button" onClick={handlePrintBadge}>
              <PrinterIcon />
              <span>Imprimir credencial</span>
            </button>
            <button className="finish-secondary-btn" type="button" onClick={finishWithoutPrint}>
              Finalizar sin imprimir
            </button>
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

        <div className="form-actions">
          <button className="submit-btn" type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Registrar / Register'}
          </button>

          <button className="print-secondary-btn" type="button" disabled>
            <PrinterIcon />
            <span className="print-secondary-copy">
              <span>Imprimir credencial de visitante</span>
              <span>Disponible luego del registro</span>
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

function PrinterIcon() {
  return (
    <svg className="print-secondary-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 8V4h10v4" />
      <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v6H7z" />
      <path d="M18 12h.01" />
    </svg>
  );
}
