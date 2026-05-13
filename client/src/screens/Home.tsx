import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Home (kiosk landing).
 *
 *   - Northfield brand at the top-right
 *   - "Welcome / Bienvenido" title centered above two action cards
 *   - Red Itinere brand as a quiet footer mark
 *   - Subtle SVG network in the background
 *
 * Hidden admin entry: 5 quick taps on the left logo → /admin/login.
 */
export default function Home() {
  const navigate = useNavigate();
  const tapsRef = useRef<{ count: number; timer: number | null }>({ count: 0, timer: null });

  const handleLogoTap = () => {
    const t = tapsRef.current;
    t.count += 1;
    if (t.timer !== null) window.clearTimeout(t.timer);
    t.timer = window.setTimeout(() => { t.count = 0; }, 1500);
    if (t.count >= 5) {
      t.count = 0;
      navigate('/admin/login');
    }
  };

  return (
    <div className="screen home">
      <NetworkBg />

      <header className="home-institution-header">
        <img
          src="/logo-right.png"
          alt="Northfield"
          className="home-logo home-logo-northfield"
          onError={hideOnErr}
        />
      </header>

      <main className="home-content" aria-label="Registro de visitantes">
        <div className="home-title-wrapper">
          <h1 className="home-title">
            <span className="home-title-main">Welcome</span>
            <span className="home-title-accent" aria-hidden="true" />
            <span className="home-title-sub">Bienvenido/a</span>
          </h1>
        </div>

        <div className="home-buttons-wrap">
          <button
            className="card-btn card-btn-entry"
            onClick={() => navigate('/entry')}
            aria-label="Check in / Entrada"
          >
            <span className="card-btn-accent" aria-hidden="true" />
            <span className="card-btn-bubble">
              <EntryIcon />
            </span>
            <span className="card-btn-copy">
              <span className="card-btn-label">Check in</span>
              <span className="card-btn-sublabel">Entrada</span>
            </span>
          </button>

          <button
            className="card-btn card-btn-exit"
            onClick={() => navigate('/exit')}
            aria-label="Check out / Salida"
          >
            <span className="card-btn-accent" aria-hidden="true" />
            <span className="card-btn-bubble">
              <ExitIcon />
            </span>
            <span className="card-btn-copy">
              <span className="card-btn-label">Check out</span>
              <span className="card-btn-sublabel">Salida</span>
            </span>
          </button>
        </div>
      </main>

      <footer className="home-footer-brand" onClick={handleLogoTap} aria-label="Red Itinere">
        <img
          src="/logo-left.png"
          alt=""
          className="home-logo-red"
          onError={hideOnErr}
        />
        <span className="home-footer-copy">
          <span className="home-footer-name">Red Itínere</span>
          <span className="home-footer-sub">Red educativa</span>
        </span>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline SVG network — light gray, anchored to the bottom-left,       */
/* fading out toward the upper-right via an opacity mask.              */
/* No external image; this is just markup.                             */
/* ------------------------------------------------------------------ */

const NODES: Array<[number, number]> = [
  [40, 760], [120, 700], [70, 620], [180, 660], [230, 730], [310, 700], [380, 750],
  [150, 540], [250, 580], [320, 640], [90, 460], [210, 480], [300, 510], [400, 560],
  [470, 620], [540, 680], [380, 420], [270, 380], [170, 380], [80, 330], [220, 290],
  [360, 320], [460, 380], [550, 460], [620, 540], [700, 620], [780, 690], [720, 470],
  [800, 540], [620, 380], [710, 320], [810, 360], [880, 460], [560, 280], [680, 230],
  [800, 240], [900, 320], [480, 200], [340, 200], [200, 180], [90, 220], [950, 600],
];

const EDGES: Array<[number, number]> = [
  [0,1],[0,2],[1,2],[1,3],[2,3],[2,7],[3,4],[3,5],[4,5],[5,6],
  [7,8],[7,10],[8,9],[8,11],[9,12],[10,11],[10,18],[10,19],[11,12],[11,18],
  [12,13],[12,17],[13,14],[13,16],[14,15],[15,25],[16,17],[16,22],[17,18],[17,21],
  [18,20],[18,21],[19,20],[19,40],[20,21],[20,38],[21,22],[21,38],[22,23],[22,33],
  [23,24],[23,29],[24,25],[24,27],[25,26],[26,27],[27,28],[27,29],[28,32],[28,41],
  [29,30],[29,33],[30,31],[30,34],[31,32],[31,36],[32,36],[33,34],[33,37],
  [34,35],[35,36],[37,38],[37,39],[38,39],[39,40],
];

function NetworkBg() {
  return (
    <svg
      className="home-network"
      viewBox="0 0 1000 800"
      preserveAspectRatio="xMinYMax slice"
      aria-hidden="true"
    >
      <defs>
        {/* Fade from bottom-left (visible) to upper-right (transparent),
            so the buttons area stays clean. */}
        {/* Diagonal fade: visible at bottom-left, softer (but not invisible)
            on the upper-right so the network still passes behind the buttons
            and visually "connects" them. */}
        <linearGradient id="hn-fade" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%"   stopColor="white" stopOpacity="1" />
          <stop offset="65%"  stopColor="white" stopOpacity="0.78" />
          <stop offset="100%" stopColor="white" stopOpacity="0.42" />
        </linearGradient>
        <mask id="hn-mask">
          <rect width="1000" height="800" fill="url(#hn-fade)" />
        </mask>
      </defs>

      <g mask="url(#hn-mask)">
        <g stroke="#c5ccd4" strokeWidth="1.15">
          {EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={NODES[a][0]} y1={NODES[a][1]}
              x2={NODES[b][0]} y2={NODES[b][1]}
            />
          ))}
        </g>
        <g fill="#8f99a6">
          {NODES.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3.8} />
          ))}
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Door icons (white, no library) — match the screenshot reference.    */
/* ------------------------------------------------------------------ */

function EntryIcon() {
  return (
    <svg className="card-btn-icon" viewBox="0 0 64 64" aria-hidden="true">
      {/* door frame on the right, opening leftward */}
      <path d="M40 12 H52 V52 H40" />
      {/* arrow pointing INTO the door */}
      <path d="M12 32 H42" />
      <path d="M32 22 L42 32 L32 42" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg className="card-btn-icon" viewBox="0 0 64 64" aria-hidden="true">
      {/* door frame on the left, opening rightward */}
      <path d="M24 12 H12 V52 H24" />
      {/* arrow pointing OUT of the door */}
      <path d="M52 32 H22" />
      <path d="M32 22 L22 32 L32 42" />
    </svg>
  );
}

function hideOnErr(e: React.SyntheticEvent<HTMLImageElement>) {
  (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
}
