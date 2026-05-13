import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminFetch, clearToken } from '../lib/auth';
import { SECTORS, DashboardData, DashboardFilters } from '../types';

const ALERT_MINUTES = 240; // 4 hours → highlight visitors still inside this long

export default function AdminDashboard() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  const [filters, setFilters] = useState<DashboardFilters>({
    from: weekAgo,
    to: today,
    sector: '',
    status: 'all',
  });
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const buildUrl = useCallback((f: DashboardFilters) => {
    const p = new URLSearchParams();
    if (f.from) p.set('from', f.from);
    if (f.to) p.set('to', f.to);
    if (f.sector) p.set('sector', f.sector);
    if (f.status) p.set('status', f.status);
    return `/api/admin/dashboard?${p.toString()}`;
  }, []);

  const load = useCallback(
    async (f: DashboardFilters) => {
      setLoading(true);
      setError('');
      try {
        const res = await adminFetch(buildUrl(f));
        if (res.status === 401) {
          clearToken();
          navigate('/admin/login', { replace: true });
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        const json = (await res.json()) as DashboardData;
        setData(json);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el dashboard');
      } finally {
        setLoading(false);
      }
    },
    [buildUrl, navigate]
  );

  useEffect(() => {
    load(filters);
    const id = window.setInterval(() => load(filters), 30000);
    return () => window.clearInterval(id);
  }, [load, filters]);

  function applyFilters() {
    load(filters);
  }
  function resetFilters() {
    const f: DashboardFilters = { from: weekAgo, to: today, sector: '', status: 'all' };
    setFilters(f);
  }
  function handleLogout() {
    clearToken();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin-screen">
      <header className="admin-header">
        <h1>Dashboard</h1>
        <div className="admin-header-actions">
          <button className="link-btn" onClick={() => load(filters)}>↻ Refrescar</button>
          <button className="link-btn" onClick={() => navigate('/')}>Ir al kiosco</button>
          <button className="link-btn danger" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>

      {/* Global filters */}
      <section className="panel filters-panel">
        <div className="filters">
          <label className="filter">
            <span>Desde</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label className="filter">
            <span>Hasta</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
          <label className="filter">
            <span>Sector</span>
            <select
              value={filters.sector}
              onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
            >
              <option value="">Todos</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="filter">
            <span>Estado</span>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value as DashboardFilters['status'] })
              }
            >
              <option value="all">Todos</option>
              <option value="inside">Actualmente dentro</option>
              <option value="left">Ya salieron</option>
            </select>
          </label>
          <button className="link-btn primary" onClick={applyFilters}>Aplicar</button>
          <button className="link-btn" onClick={resetFilters}>Reset</button>
        </div>
      </section>

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}
      {loading && !data ? (
        <div className="admin-empty">Cargando…</div>
      ) : !data ? (
        <div className="admin-empty">Sin datos</div>
      ) : (
        <DashboardBody data={data} />
      )}
    </div>
  );
}

/* ===================================================================
   Dashboard body — split out so it doesn't crowd the main component
   =================================================================== */

function DashboardBody({ data }: { data: DashboardData }) {
  const s = data.summary;
  const hasAlerts = data.withoutExit.some((v) => v.elapsedMinutes >= ALERT_MINUTES);

  return (
    <>
      {/* ---------- Summary cards ---------- */}
      <section className="cards">
        <StatCard color="blue" label="Dentro ahora" value={s.currentlyInside} />
        <StatCard color="orange" label="Entradas hoy" value={s.entriesToday} />
        <StatCard color="green" label="Salidas hoy" value={s.exitsToday} />
        <StatCard color="gray" label="Total histórico" value={s.totalVisitors} />
        <StatCard
          color={hasAlerts ? 'red' : 'amber'}
          label="Sin salida"
          value={s.withoutExit}
          hint={hasAlerts ? '¡Pendientes!' : undefined}
        />
        <StatCard
          color="purple"
          label="Permanencia hoy"
          value={formatMinutes(s.avgStayToday)}
        />
      </section>

      {/* ---------- Row: entries vs exits + weekday ---------- */}
      <div className="analytics-grid">
        <Panel title="Entradas vs salidas">
          <EntriesVsExitsChart rows={data.entriesVsExits} />
        </Panel>
        <Panel title="Movimiento por día de la semana">
          <WeekdayChart rows={data.byWeekday} />
        </Panel>
      </div>

      {/* ---------- Row: sectors + hourly ---------- */}
      <div className="analytics-grid">
        <Panel title="Entradas por sector">
          <SectorBars rows={data.bySector} />
        </Panel>
        <Panel title="Horarios pico (entradas)">
          <HourlyChart rows={data.byHour} />
        </Panel>
      </div>

      {/* ---------- Row: avg stay + ranking ---------- */}
      <div className="analytics-grid">
        <Panel title="Promedio de permanencia">
          <AvgStayBlock overall={data.avgStay.overall} bySector={data.avgStay.bySector} />
        </Panel>
        <Panel title="Top sectores más visitados">
          <SectorRanking rows={data.sectorRanking} />
        </Panel>
      </div>

      {/* ---------- Without exit (full width) ---------- */}
      <Panel title={`Visitantes sin salida (${data.withoutExit.length})`}>
        <WithoutExitTable rows={data.withoutExit} />
      </Panel>

      {/* ---------- Recent + history ---------- */}
      <div className="analytics-grid">
        <Panel title="Movimientos recientes">
          <MovementsList rows={data.recentMovements} />
        </Panel>
        <Panel title={`Histórico (${data.history.length})`}>
          <HistoryTable rows={data.history} />
        </Panel>
      </div>
    </>
  );
}

/* ============== building blocks ============== */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({
  color,
  label,
  value,
  hint,
}: {
  color: string;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className={`card card-${color}`}>
      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>
      {hint && <div className="card-hint">{hint}</div>}
    </div>
  );
}

function EntriesVsExitsChart({ rows }: { rows: DashboardData['entriesVsExits'] }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.entries, r.exits]));
  if (rows.length === 0) return <div className="admin-empty">Sin datos</div>;
  return (
    <>
      <div className="chart" style={{ overflowX: rows.length > 14 ? 'auto' : undefined }}>
        {rows.map((d) => (
          <div key={d.date} className="chart-col">
            <div className="chart-bars">
              <div
                className="chart-bar entry"
                style={{ height: `${(d.entries / max) * 100}%` }}
                title={`Entradas: ${d.entries}`}
              />
              <div
                className="chart-bar exit"
                style={{ height: `${(d.exits / max) * 100}%` }}
                title={`Salidas: ${d.exits}`}
              />
            </div>
            <div className="chart-label">{d.date.slice(5)}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span><span className="dot dot-entry" /> Entradas</span>
        <span><span className="dot dot-exit" /> Salidas</span>
      </div>
    </>
  );
}

function WeekdayChart({ rows }: { rows: DashboardData['byWeekday'] }) {
  const max = Math.max(1, ...rows.map((r) => r.entries));
  return (
    <div className="chart">
      {rows.map((d) => (
        <div key={d.weekday} className="chart-col">
          <div className="chart-bars">
            <div
              className="chart-bar entry"
              style={{ height: `${(d.entries / max) * 100}%`, width: '24px' }}
              title={`${d.weekday}: ${d.entries}`}
            />
          </div>
          <div className="chart-label">{d.weekday}</div>
          <div className="chart-totals">{d.entries}</div>
        </div>
      ))}
    </div>
  );
}

function HourlyChart({ rows }: { rows: DashboardData['byHour'] }) {
  const max = Math.max(1, ...rows.map((r) => r.entries));
  return (
    <div className="chart">
      {rows.map((d) => (
        <div key={d.hour} className="chart-col">
          <div className="chart-bars">
            <div
              className="chart-bar entry"
              style={{ height: `${(d.entries / max) * 100}%`, width: '20px' }}
              title={`${d.hour}:00–${d.hour + 1}:00: ${d.entries}`}
            />
          </div>
          <div className="chart-label">{d.hour}h</div>
          <div className="chart-totals">{d.entries}</div>
        </div>
      ))}
    </div>
  );
}

function SectorBars({ rows }: { rows: DashboardData['bySector'] }) {
  const max = Math.max(1, ...rows.map((r) => r.entries));
  return (
    <div className="h-bars">
      {rows.map((r) => (
        <div key={r.sector} className="h-bar-row">
          <div className="h-bar-label">{r.sector}</div>
          <div className="h-bar-track">
            <div
              className="h-bar-fill"
              style={{ width: `${(r.entries / max) * 100}%` }}
            />
          </div>
          <div className="h-bar-value">{r.entries}</div>
        </div>
      ))}
    </div>
  );
}

function AvgStayBlock({
  overall,
  bySector,
}: {
  overall: number | null;
  bySector: DashboardData['avgStay']['bySector'];
}) {
  const hasAny = bySector.some((r) => r.avgMinutes != null);
  return (
    <div className="avg-stay">
      <div className="avg-stay-overall">
        <div className="avg-stay-label">Promedio general</div>
        <div className="avg-stay-value">
          {overall != null ? formatMinutes(overall) : 'Sin datos suficientes'}
        </div>
      </div>
      {hasAny ? (
        <table className="data-table mini-table">
          <thead>
            <tr>
              <th>Sector</th>
              <th>Promedio</th>
            </tr>
          </thead>
          <tbody>
            {bySector.map((r) => (
              <tr key={r.sector}>
                <td>{r.sector}</td>
                <td>{r.avgMinutes != null ? formatMinutes(r.avgMinutes) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="admin-empty" style={{ padding: 12 }}>Sin datos suficientes por sector</div>
      )}
    </div>
  );
}

function SectorRanking({ rows }: { rows: DashboardData['sectorRanking'] }) {
  const hasData = rows.some((r) => r.entries > 0);
  if (!hasData) return <div className="admin-empty">Sin datos</div>;
  const positions = ['first', 'second', 'third'] as const;
  return (
    <div className="ranking">
      {rows.map((r, i) => (
        <div key={r.sector} className="ranking-row">
          <div className={`ranking-pos ${positions[i]}`}>#{i + 1}</div>
          <div className="ranking-name">{r.sector}</div>
          <div className="ranking-count">{r.entries}</div>
        </div>
      ))}
    </div>
  );
}

function WithoutExitTable({ rows }: { rows: DashboardData['withoutExit'] }) {
  if (rows.length === 0) return <div className="admin-empty">Sin visitantes pendientes</div>;
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>DNI</th>
          <th>Sector</th>
          <th>Entrada</th>
          <th>Tiempo dentro</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((v) => {
          const alert = v.elapsedMinutes >= ALERT_MINUTES;
          return (
            <tr key={v.id} className={alert ? 'row-alert' : ''}>
              <td>{v.firstName} {v.lastName}</td>
              <td>{v.dni}</td>
              <td>{v.sector}</td>
              <td>{formatDateTime(v.entryTime)}</td>
              <td>
                {formatElapsed(v.elapsedMinutes)}
                {alert && <span className="alert-badge">+4h</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MovementsList({ rows }: { rows: DashboardData['recentMovements'] }) {
  if (rows.length === 0) return <div className="admin-empty">Sin movimientos</div>;
  return (
    <ul className="movement-list">
      {rows.map((m, i) => (
        <li
          key={`${m.visitorId}-${m.type}-${i}`}
          className={`movement movement-${m.type}`}
        >
          <span className={`mv-badge mv-${m.type}`}>{m.type === 'entry' ? 'IN' : 'OUT'}</span>
          <span className="mv-name">{m.firstName} {m.lastName}</span>
          <span className="mv-sector">{m.sector}</span>
          <span className="mv-time">{formatDateTime(m.time)}</span>
        </li>
      ))}
    </ul>
  );
}

function HistoryTable({ rows }: { rows: DashboardData['history'] }) {
  if (rows.length === 0) return <div className="admin-empty">Sin resultados</div>;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Sector</th>
            <th>Entrada</th>
            <th>Salida</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.id}>
              <td>{v.firstName} {v.lastName}</td>
              <td>{v.sector}</td>
              <td>{formatDateTime(v.entryTime)}</td>
              <td>{v.exitTime ? formatDateTime(v.exitTime) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============== formatting helpers ============== */

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatMinutes(min: number | null): string {
  if (min == null) return '—';
  if (min < 1) return '<1m';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatElapsed(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}
