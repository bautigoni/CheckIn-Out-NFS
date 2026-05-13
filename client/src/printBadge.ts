interface BadgeData {
  firstName: string;
  lastName: string;
  dni: string;
  sector: string;
  photo: string;
  entryTime: string;
}

/**
 * Opens a new window with the printable badge and triggers print().
 * Caller MUST wrap in try/catch — print failure must not block the saved entry.
 */
export function printBadge(data: BadgeData): void {
  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) {
    console.warn('Print window blocked');
    return;
  }

  const dt = new Date(data.entryTime);
  const fechaHora = dt.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Credencial Visitante</title>
<style>
  @page { size: 80mm 120mm; margin: 4mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 12px; color: #111; }
  .badge { border: 2px solid #111; border-radius: 8px; padding: 12px; text-align: center; }
  .title { font-size: 22px; font-weight: 900; letter-spacing: 2px; background: #111; color: #fff;
           padding: 6px 0; border-radius: 4px; margin-bottom: 10px; }
  .photo { width: 140px; height: 140px; object-fit: cover; border-radius: 6px;
           border: 1px solid #888; margin: 6px auto; display: block; background: #eee; }
  .name { font-size: 18px; font-weight: 700; margin-top: 8px; }
  .row { font-size: 13px; margin-top: 4px; }
  .label { color: #555; }
</style>
</head>
<body>
  <div class="badge">
    <div class="title">VISITANTE</div>
    ${data.photo ? `<img class="photo" src="${data.photo}" alt="foto" />` : `<div class="photo"></div>`}
    <div class="name">${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</div>
    <div class="row"><span class="label">DNI:</span> ${escapeHtml(data.dni)}</div>
    <div class="row"><span class="label">Sector:</span> ${escapeHtml(data.sector)}</div>
    <div class="row"><span class="label">Fecha:</span> ${escapeHtml(fechaHora)}</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 300);
      }, 200);
    };
  </script>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
