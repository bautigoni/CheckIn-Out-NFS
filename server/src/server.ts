import express, { Request, Response } from 'express';
import cors from 'cors';
import { db, VisitorRow } from './db';
import { PORT } from './config';
import { generateToken, verifyCredentials, requireAdmin } from './auth';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ===== Health =====
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// ============================================================
// KIOSK (public)
// ============================================================

app.post('/api/entry', (req: Request, res: Response) => {
  const { firstName, lastName, dni, sector, photo } = req.body ?? {};
  if (!firstName || !lastName || !dni || !sector) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO visitors (firstName, lastName, dni, sector, photoBase64, entryTime)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(firstName).trim(),
      String(lastName).trim(),
      String(dni).trim(),
      String(sector).trim(),
      typeof photo === 'string' && photo.length > 0 ? photo : null,
      now
    );
  const visitor = db
    .prepare('SELECT * FROM visitors WHERE id = ?')
    .get(result.lastInsertRowid) as VisitorRow;
  res.json({ ok: true, visitor });
});

app.post('/api/exit', (req: Request, res: Response) => {
  const { firstName, lastName } = req.body ?? {};
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Find the most recent OPEN entry for this visitor.
  const row = db
    .prepare(
      `SELECT * FROM visitors
       WHERE LOWER(firstName) = LOWER(?)
         AND LOWER(lastName)  = LOWER(?)
         AND exitTime IS NULL
       ORDER BY entryTime DESC LIMIT 1`
    )
    .get(String(firstName).trim(), String(lastName).trim()) as VisitorRow | undefined;

  if (!row) {
    return res.status(404).json({ error: 'No open entry found for this visitor' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE visitors SET exitTime = ? WHERE id = ?').run(now, row.id);
  res.json({ ok: true, visitor: { ...row, exitTime: now } });
});

// ============================================================
// ADMIN (protected)
// ============================================================

app.post('/api/admin/login', (req, res) => {
  const { user, password } = req.body ?? {};
  if (!verifyCredentials(String(user ?? ''), String(password ?? ''))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: generateToken(String(user), String(password)) });
});

app.get('/api/admin/verify', requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startISO = startOfDay.toISOString();

  const currentlyInside = (db
    .prepare('SELECT COUNT(*) AS c FROM visitors WHERE exitTime IS NULL')
    .get() as { c: number }).c;

  const entriesToday = (db
    .prepare('SELECT COUNT(*) AS c FROM visitors WHERE entryTime >= ?')
    .get(startISO) as { c: number }).c;

  const exitsToday = (db
    .prepare('SELECT COUNT(*) AS c FROM visitors WHERE exitTime IS NOT NULL AND exitTime >= ?')
    .get(startISO) as { c: number }).c;

  const totalVisitors = (db
    .prepare('SELECT COUNT(*) AS c FROM visitors')
    .get() as { c: number }).c;

  // Last 7 days: entries + exits per day (yyyy-mm-dd, oldest first).
  const last7Days: Array<{ date: string; entries: number; exits: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const dayStart = day.toISOString();
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dayEnd = next.toISOString();

    const entries = (db
      .prepare('SELECT COUNT(*) AS c FROM visitors WHERE entryTime >= ? AND entryTime < ?')
      .get(dayStart, dayEnd) as { c: number }).c;

    const exits = (db
      .prepare(
        'SELECT COUNT(*) AS c FROM visitors WHERE exitTime IS NOT NULL AND exitTime >= ? AND exitTime < ?'
      )
      .get(dayStart, dayEnd) as { c: number }).c;

    last7Days.push({ date: day.toISOString().slice(0, 10), entries, exits });
  }

  res.json({ currentlyInside, entriesToday, exitsToday, totalVisitors, last7Days });
});

app.get('/api/admin/current-visitors', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, firstName, lastName, dni, sector, entryTime
       FROM visitors WHERE exitTime IS NULL
       ORDER BY entryTime DESC`
    )
    .all();
  res.json(rows);
});

app.get('/api/admin/recent-movements', requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 30), 200);
  // Fetch enough rows to construct a recent movement list (each visitor has 1 or 2 movements).
  const rows = db
    .prepare(
      `SELECT id, firstName, lastName, sector, entryTime, exitTime
       FROM visitors
       ORDER BY entryTime DESC
       LIMIT ?`
    )
    .all(limit * 2) as VisitorRow[];

  const movements: Array<{
    visitorId: number;
    firstName: string;
    lastName: string;
    sector: string;
    type: 'entry' | 'exit';
    time: string;
  }> = [];

  for (const r of rows) {
    movements.push({
      visitorId: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      sector: r.sector,
      type: 'entry',
      time: r.entryTime,
    });
    if (r.exitTime) {
      movements.push({
        visitorId: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        sector: r.sector,
        type: 'exit',
        time: r.exitTime,
      });
    }
  }

  movements.sort((a, b) => b.time.localeCompare(a.time));
  res.json(movements.slice(0, limit));
});

app.get('/api/admin/history', requireAdmin, (req, res) => {
  const from = String(req.query.from ?? '').trim();
  const to = String(req.query.to ?? '').trim();
  const sector = String(req.query.sector ?? '').trim();

  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (from) {
    clauses.push('entryTime >= ?');
    params.push(from);
  }
  if (to) {
    // Accept yyyy-mm-dd as inclusive upper bound.
    const upper = /^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999Z` : to;
    clauses.push('entryTime <= ?');
    params.push(upper);
  }
  if (sector) {
    clauses.push('sector = ?');
    params.push(sector);
  }

  const rows = db
    .prepare(
      `SELECT id, firstName, lastName, dni, sector, entryTime, exitTime
       FROM visitors
       WHERE ${clauses.join(' AND ')}
       ORDER BY entryTime DESC
       LIMIT 500`
    )
    .all(...params);

  res.json(rows);
});

// ============================================================
// ADMIN — unified dashboard endpoint
// ============================================================

const ALL_SECTORS = [
  'Dirección',
  'Nivel Inicial',
  'Nivel Primario',
  'Tecnología',
  'DOE',
  'Mantenimiento',
  'Capital Humano',
];

/**
 * GET /api/admin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD&sector=&status=all|inside|left
 *
 * Returns every block the dashboard renders. Filters apply to most
 * sections; a few intentionally ignore them (see comments inline):
 *   - "today" counters are always today regardless of filter
 *   - "currentlyInside" / "withoutExit" reflect right now (sector filter still applies)
 *   - "recentMovements" is unfiltered (last 20 events)
 */
app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const from = String(req.query.from ?? '').trim();
  const to = String(req.query.to ?? '').trim();
  const sectorFilter = String(req.query.sector ?? '').trim();
  const status = String(req.query.status ?? 'all').trim();

  // Build the WHERE clause used by every "filtered" query.
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (from) {
    where.push('entryTime >= ?');
    params.push(`${from}T00:00:00.000Z`);
  }
  if (to) {
    const upper = /^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999Z` : to;
    where.push('entryTime <= ?');
    params.push(upper);
  }
  if (sectorFilter) {
    where.push('sector = ?');
    params.push(sectorFilter);
  }
  if (status === 'inside') where.push('exitTime IS NULL');
  else if (status === 'left') where.push('exitTime IS NOT NULL');
  const W = where.join(' AND ');

  // ----- Summary -----
  // "Now" figures ignore date filters (they're not about a time range).
  const currentlyInside = (
    db.prepare('SELECT COUNT(*) AS c FROM visitors WHERE exitTime IS NULL').get() as { c: number }
  ).c;
  const totalVisitors = (
    db.prepare('SELECT COUNT(*) AS c FROM visitors').get() as { c: number }
  ).c;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayISO = startOfDay.toISOString();
  const entriesToday = (
    db.prepare('SELECT COUNT(*) AS c FROM visitors WHERE entryTime >= ?').get(todayISO) as {
      c: number;
    }
  ).c;
  const exitsToday = (
    db
      .prepare(
        'SELECT COUNT(*) AS c FROM visitors WHERE exitTime IS NOT NULL AND exitTime >= ?'
      )
      .get(todayISO) as { c: number }
  ).c;

  // Today's average stay (completed visits only) in minutes.
  const avgStayTodayRow = db
    .prepare(
      `SELECT AVG((julianday(exitTime) - julianday(entryTime)) * 24 * 60) AS avg
       FROM visitors
       WHERE exitTime IS NOT NULL AND entryTime >= ?`
    )
    .get(todayISO) as { avg: number | null };
  const avgStayToday =
    avgStayTodayRow.avg != null ? Math.round(avgStayTodayRow.avg) : null;

  // ----- Entries by sector (filtered) -----
  const bySector = ALL_SECTORS.map((s) => {
    const c = (
      db
        .prepare(`SELECT COUNT(*) AS c FROM visitors WHERE ${W} AND sector = ?`)
        .get(...params, s) as { c: number }
    ).c;
    return { sector: s, entries: c };
  });

  // ----- Hourly distribution (filtered): slots 7..16 (= 7:00–17:00) -----
  const hourRows = db
    .prepare(
      `SELECT CAST(strftime('%H', entryTime) AS INTEGER) AS hour, COUNT(*) AS c
       FROM visitors WHERE ${W}
       GROUP BY hour`
    )
    .all(...params) as Array<{ hour: number; c: number }>;
  const hourMap = new Map(hourRows.map((r) => [r.hour, r.c]));
  const byHour: Array<{ hour: number; entries: number }> = [];
  for (let h = 7; h <= 16; h++) {
    byHour.push({ hour: h, entries: hourMap.get(h) ?? 0 });
  }

  // ----- Average stay overall + by sector (filtered, completed visits only) -----
  const avgOverallRow = db
    .prepare(
      `SELECT AVG((julianday(exitTime) - julianday(entryTime)) * 24 * 60) AS avg
       FROM visitors WHERE ${W} AND exitTime IS NOT NULL`
    )
    .get(...params) as { avg: number | null };
  const avgStay = {
    overall: avgOverallRow.avg != null ? Math.round(avgOverallRow.avg) : null,
    bySector: ALL_SECTORS.map((s) => {
      const r = db
        .prepare(
          `SELECT AVG((julianday(exitTime) - julianday(entryTime)) * 24 * 60) AS avg
           FROM visitors WHERE ${W} AND exitTime IS NOT NULL AND sector = ?`
        )
        .get(...params, s) as { avg: number | null };
      return { sector: s, avgMinutes: r.avg != null ? Math.round(r.avg) : null };
    }),
  };

  // ----- Visitors without exit (right now). Sector filter still applies. -----
  const woClauses = ['exitTime IS NULL'];
  const woParams: unknown[] = [];
  if (sectorFilter) {
    woClauses.push('sector = ?');
    woParams.push(sectorFilter);
  }
  const woRows = db
    .prepare(
      `SELECT id, firstName, lastName, dni, sector, entryTime
       FROM visitors WHERE ${woClauses.join(' AND ')}
       ORDER BY entryTime ASC`
    )
    .all(...woParams) as Array<VisitorRow>;
  const nowMs = Date.now();
  const withoutExit = woRows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    dni: r.dni,
    sector: r.sector,
    entryTime: r.entryTime,
    elapsedMinutes: Math.max(
      0,
      Math.round((nowMs - new Date(r.entryTime).getTime()) / 60000)
    ),
  }));

  // ----- By weekday (filtered) — Mon..Fri only -----
  const weekdayRows = db
    .prepare(
      `SELECT CAST(strftime('%w', entryTime) AS INTEGER) AS w, COUNT(*) AS c
       FROM visitors WHERE ${W}
       GROUP BY w`
    )
    .all(...params) as Array<{ w: number; c: number }>;
  const wMap = new Map(weekdayRows.map((r) => [r.w, r.c]));
  const WD = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  const byWeekday = WD.map((label, idx) => ({
    weekday: label,
    entries: wMap.get(idx + 1) ?? 0, // SQLite: Sun=0, Mon=1, ..., Fri=5
  }));

  // ----- Sector ranking (top 3 from bySector) -----
  const sectorRanking = [...bySector]
    .sort((a, b) => b.entries - a.entries)
    .slice(0, 3);

  // ----- Entries vs exits per day in the chosen range -----
  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : new Date(Date.now() - 6 * 86400000);
  const toDate = to ? new Date(`${to}T00:00:00.000Z`) : new Date();
  fromDate.setUTCHours(0, 0, 0, 0);
  toDate.setUTCHours(0, 0, 0, 0);
  const days = Math.min(
    60,
    Math.max(1, Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1)
  );
  const evxSectorClause = sectorFilter ? ' AND sector = ?' : '';
  const entriesVsExits: Array<{ date: string; entries: number; exits: number }> = [];
  for (let i = 0; i < days; i++) {
    const dayStart = new Date(fromDate);
    dayStart.setUTCDate(dayStart.getUTCDate() + i);
    const next = new Date(dayStart);
    next.setUTCDate(next.getUTCDate() + 1);
    const dStart = dayStart.toISOString();
    const dEnd = next.toISOString();
    const entries = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM visitors WHERE entryTime >= ? AND entryTime < ?${evxSectorClause}`
        )
        .get(dStart, dEnd, ...(sectorFilter ? [sectorFilter] : [])) as { c: number }
    ).c;
    const exits = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM visitors WHERE exitTime IS NOT NULL AND exitTime >= ? AND exitTime < ?${evxSectorClause}`
        )
        .get(dStart, dEnd, ...(sectorFilter ? [sectorFilter] : [])) as { c: number }
    ).c;
    entriesVsExits.push({
      date: dayStart.toISOString().slice(0, 10),
      entries,
      exits,
    });
  }

  // ----- Recent movements (unfiltered, last 20) -----
  const recentRows = db
    .prepare(
      `SELECT id, firstName, lastName, sector, entryTime, exitTime
       FROM visitors ORDER BY entryTime DESC LIMIT 40`
    )
    .all() as VisitorRow[];
  const movs: Array<{
    visitorId: number;
    firstName: string;
    lastName: string;
    sector: string;
    type: 'entry' | 'exit';
    time: string;
  }> = [];
  for (const r of recentRows) {
    movs.push({
      visitorId: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      sector: r.sector,
      type: 'entry',
      time: r.entryTime,
    });
    if (r.exitTime) {
      movs.push({
        visitorId: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        sector: r.sector,
        type: 'exit',
        time: r.exitTime,
      });
    }
  }
  movs.sort((a, b) => b.time.localeCompare(a.time));
  const recentMovements = movs.slice(0, 20);

  // ----- History (filtered) -----
  const history = db
    .prepare(
      `SELECT id, firstName, lastName, dni, sector, entryTime, exitTime
       FROM visitors WHERE ${W}
       ORDER BY entryTime DESC LIMIT 500`
    )
    .all(...params);

  res.json({
    summary: {
      currentlyInside,
      entriesToday,
      exitsToday,
      totalVisitors,
      withoutExit: currentlyInside,
      avgStayToday,
    },
    bySector,
    byHour,
    avgStay,
    withoutExit,
    byWeekday,
    sectorRanking,
    entriesVsExits,
    recentMovements,
    history,
  });
});

app.listen(PORT, () => {
  console.log(`Visitor kiosk server listening on http://localhost:${PORT}`);
});
