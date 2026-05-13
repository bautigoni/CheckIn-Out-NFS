# Proyecto Entrada — v1.1

App de registro de visitantes tipo kiosco con **base de datos SQLite** y **dashboard administrativo protegido**.

- **Frontend:** React + TypeScript (Vite) + react-router-dom
- **Backend:** Node.js + Express + TypeScript + better-sqlite3
- **Sin librerías de UI** — CSS plano
- **npm workspaces** — un solo `npm install` instala todo

## Estructura

```
ProyectoEntrada/
├── package.json             # workspaces root
├── client/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── public/              # logos + background.png
│   └── src/
│       ├── App.tsx          # rutas (BrowserRouter)
│       ├── main.tsx
│       ├── types.ts
│       ├── printBadge.ts
│       ├── styles.css
│       ├── hooks/useAutoReset.ts
│       ├── lib/auth.ts      # cliente: token admin en localStorage
│       └── screens/
│           ├── Home.tsx              # kiosk landing
│           ├── Entry.tsx             # /entry
│           ├── Exit.tsx              # /exit
│           ├── AdminLogin.tsx        # /admin/login
│           └── AdminDashboard.tsx    # /admin/dashboard (protegido)
└── server/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── server.ts        # endpoints REST
        ├── db.ts            # SQLite + schema auto-creado
        ├── auth.ts          # token derivado de credenciales + middleware
        └── config.ts        # PORT, ADMIN_USER, ADMIN_PASSWORD, ADMIN_TOKEN_SALT
```

> El archivo `server/visitors.db` se crea automáticamente la primera vez que arranca el backend. Está incluido en `.gitignore`.

## Cómo correr (paso a paso, PowerShell Windows)

### Opción A — una sola terminal (recomendado)

```powershell
cd D:\Descargas\ProyectoEntrada
npm install
npm run dev
```

Esto:

1. Instala dependencias del root, del `client` y del `server` (workspaces).
2. Levanta **backend en http://localhost:4000** y **frontend en http://localhost:5173** en paralelo.

Abrir http://localhost:5173 en Chrome/Edge.

### Opción B — dos terminales separadas

Terminal 1 (backend):

```powershell
cd D:\Descargas\ProyectoEntrada\server
npm install
npm run dev
```

Terminal 2 (frontend):

```powershell
cd D:\Descargas\ProyectoEntrada\client
npm install
npm run dev
```

## Requisitos

- **Node.js 18+** (recomendado 20+; verificar con `node -v`)
- **npm 8+** (`npm -v`)
- **Windows / build tools** — `better-sqlite3` viene con binarios pre-compilados para Windows + Node 18-22, no requiere compilación manual.

Si por algún motivo falla al compilar `better-sqlite3`, instalar Build Tools de Visual Studio:
`npm install --global windows-build-tools` (raro de necesitar con Node ≥20).

## Imágenes (poner antes de probar)

Copiar en `client/public/`:

- `logo-left.png` — escudo Northfield (esquina superior izquierda; toque 5 veces para abrir el login admin)
- `logo-right.png` — icono "i" (esquina superior derecha)
- `background.png` — template con líneas/nodos (zona superior-media del home)

## Rutas

### Públicas (kiosco)

- `/` — Home: botones ENTRY (naranja) y EXIT (verde)
- `/entry` — formulario de entrada + cámara + impresión de credencial
- `/exit` — formulario de salida (busca la última entrada abierta)

**Auto-reset:** después de 7 s de inactividad en `/entry` o `/exit` vuelve a `/`. El auto-reset **no aplica en `/admin/*`**.

### Administrativas (protegidas)

- `/admin/login` — login (no enlazado desde el kiosco; se accede tocando 5 veces el logo izquierdo o tipeando la URL)
- `/admin/dashboard` — visitantes actuales, contadores del día, total histórico, gráfico de los últimos 7 días, movimientos recientes, histórico filtrable por fecha y sector

## Credenciales admin (por defecto)

- **Usuario:** `admin`
- **Contraseña:** `admin123`

Para cambiarlas, editar `server/src/config.ts` o exportar variables de entorno antes de arrancar:

```powershell
$env:ADMIN_USER="otro"
$env:ADMIN_PASSWORD="otra-clave"
$env:ADMIN_TOKEN_SALT="cadena-aleatoria-larga"
npm run dev
```

> Al cambiar `ADMIN_TOKEN_SALT` se invalidan las sesiones existentes (el cliente deberá volver a loguearse).

## API

### Kiosko (público)

- `POST /api/entry` — body `{ firstName, lastName, dni, sector, photo }`
- `POST /api/exit` — body `{ firstName, lastName }`

### Admin (requiere `Authorization: Bearer <token>`)

- `POST /api/admin/login` — body `{ user, password }` → `{ token }`
- `GET  /api/admin/verify`
- `GET  /api/admin/stats` — contadores + últimos 7 días
- `GET  /api/admin/current-visitors`
- `GET  /api/admin/recent-movements?limit=20`
- `GET  /api/admin/history?from=YYYY-MM-DD&to=YYYY-MM-DD&sector=Dirección`

El dev server de Vite proxea `/api/*` a `http://localhost:4000`, así que el frontend no necesita `.env`.

## Esquema de base de datos

Tabla `visitors` (creada automáticamente al iniciar el backend):

```sql
CREATE TABLE visitors (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  firstName    TEXT NOT NULL,
  lastName     TEXT NOT NULL,
  dni          TEXT NOT NULL,
  sector       TEXT NOT NULL,
  photoBase64  TEXT,
  entryTime    TEXT NOT NULL,   -- ISO 8601
  exitTime     TEXT,            -- NULL mientras está dentro
  createdAt    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Un registro con `exitTime IS NULL` representa un visitante actualmente adentro. La salida actualiza ese mismo registro (no inserta uno nuevo).

## Build de producción

```powershell
cd D:\Descargas\ProyectoEntrada
npm run build
npm start     # arranca el backend compilado; servir client/dist por separado
```

## Tips para uso como kiosco

- Chrome con `--kiosk http://localhost:5173 --autoplay-policy=no-user-gesture-required`. Dar permiso de cámara una vez.
- Configurar la impresora de credenciales como **impresora predeterminada del sistema**.
- Acceso al admin: tocar el **logo izquierdo 5 veces seguidas** (dentro de 1.5 s) abre `/admin/login`. Idea: cambiar el shortcut o agregar una contraseña adicional si querés más seguridad.
- Deshabilitar atajos de navegador y protector de pantalla.

## Funcionalidad clave

- **Falla de cámara no bloquea** — el registro se guarda sin foto.
- **Falla de impresión no bloquea** — el `INSERT` ya se hizo antes de abrir la ventana de impresión.
- **Dashboard auto-refresca cada 30 s.**
- **El auto-reset está deshabilitado en el dashboard** (requisito explícito).
