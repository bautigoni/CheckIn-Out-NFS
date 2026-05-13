# CheckIn-Out-NFS

App MVP de registro de visitantes para recepcion escolar, con frontend React + TypeScript + Vite, backend Node.js + Express + TypeScript, SQLite local persistente, dashboard admin protegido, camara y credencial de visitante con impresion manual luego del registro.

Produccion esperada:

- Dominio DuckDNS: `checkinout.duckdns.org`
- IP local del servidor Ubuntu: `192.168.0.35`
- URL publica: `https://checkinout.duckdns.org`

## Stack Docker

El servidor solo necesita Docker y Docker Compose.

Servicios:

- `client`: compila React/Vite y sirve `dist` con nginx.
- `server`: API Node/Express en `0.0.0.0:3001`.
- `caddy`: reverse proxy publico con HTTPS automatico.

Solo Caddy publica puertos al host:

- `80:80`
- `443:443`

El backend no se expone directo a internet. Caddy lo alcanza por la red interna Docker como `server:3001`.

## Archivos de despliegue

- `docker-compose.yml`
- `Caddyfile`
- `client/Dockerfile`
- `client/nginx.conf`
- `server/Dockerfile`
- `.dockerignore`
- `.env.example`

## Instalar Docker en Ubuntu

```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin -y
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Cerrar sesion y volver a entrar para que el grupo `docker` aplique.

## Clonar repo

```bash
git clone URL_DEL_REPO
cd NOMBRE_DEL_REPO
```

## Crear `.env`

```bash
cp .env.example .env
nano .env
```

Cambiar en produccion:

```env
ADMIN_USER=admin
ADMIN_PASSWORD=cambiar-esta-password
SESSION_SECRET=cambiar-este-secreto-largo-y-aleatorio
```

No usar `admin/admin123` ni passwords simples en produccion.

## Levantar la app

```bash
docker compose up -d --build
```

Abrir:

```text
https://checkinout.duckdns.org
```

## Ver logs

```bash
docker compose logs -f
```

Logs por servicio:

```bash
docker compose logs -f caddy
docker compose logs -f server
docker compose logs -f client
```

## Apagar

```bash
docker compose down
```

Esto no borra la base SQLite porque vive en `./server/data`.

## Actualizar

```bash
git pull
docker compose up -d --build
```

## DuckDNS y router

En DuckDNS, el dominio debe apuntar a la IP publica de tu conexion.

En el router hay que redirigir puertos hacia el servidor Ubuntu:

```text
80  -> 192.168.0.35:80
443 -> 192.168.0.35:443
```

Conviene reservar la IP `192.168.0.35` en el router para que el servidor no cambie de direccion local.

## HTTPS con Caddy

El `Caddyfile` incluido:

```caddyfile
checkinout.duckdns.org {
    reverse_proxy /api/* server:3001
    reverse_proxy client:80
}
```

Caddy escucha en 80/443, solicita y renueva certificados HTTPS automaticamente para `checkinout.duckdns.org`.

Para que HTTPS funcione:

- DuckDNS debe resolver hacia tu IP publica.
- El router debe reenviar 80 y 443 a `192.168.0.35`.
- El firewall del servidor debe permitir 80 y 443.

## Frontend y rutas SPA

El frontend usa rutas relativas:

- `/api/entry`
- `/api/exit`
- `/api/admin/...`

No usa `http://localhost:3001` en produccion.

Las rutas SPA como `/admin/login` y `/admin/dashboard` funcionan porque nginx usa:

```nginx
try_files $uri $uri/ /index.html;
```

## Backend

Variables usadas por el backend:

```env
NODE_ENV=production
PORT=3001
DATABASE_PATH=/app/data/visitors.db
UPLOADS_DIR=/app/uploads
ADMIN_USER=admin
ADMIN_PASSWORD=cambiar-esta-password
SESSION_SECRET=cambiar-este-secreto-largo-y-aleatorio
```

El backend escucha en `0.0.0.0` dentro del contenedor.

## SQLite persistente

La base se guarda en:

```text
./server/data:/app/data
```

Archivo dentro del contenedor:

```text
/app/data/visitors.db
```

Si se reinicia o reconstruye Docker, la base se conserva.

Si en el futuro se usan archivos/fotos en disco, el volumen preparado es:

```text
./server/uploads:/app/uploads
```

## Seguridad

- Cambiar `ADMIN_USER`, `ADMIN_PASSWORD` y `SESSION_SECRET` antes de publicar.
- No dejar `admin/admin123` en produccion.
- No exponer el backend directo al host ni a internet.
- El dashboard y endpoints admin requieren login/token.
- No mostrar datos sensibles sin login.
- Mantener actualizado el servidor Ubuntu y Docker.

## Uso de la app

Rutas publicas:

- `/`: HOME de kiosco.
- `/entry`: registro de entrada, camara y opcion de imprimir credencial luego del guardado.
- `/exit`: registro de salida.

Rutas admin:

- `/admin/login`
- `/admin/dashboard`

Auto reset:

- Vuelve a HOME luego de 7 segundos de inactividad en pantallas publicas.
- No aplica al dashboard admin.

Camara:

- `navigator.mediaDevices.getUserMedia` requiere contexto seguro.
- En produccion, usar `https://checkinout.duckdns.org`.
- Si la camara falla o no tiene permiso, el registro se guarda sin foto.

Impresion:

- La credencial no se imprime automaticamente al registrar.
- Luego de guardar una entrada, aparece la confirmacion con:
  - `Imprimir credencial`
  - `Finalizar sin imprimir`
- La impresion manual usa la credencial del registro recien guardado.

## Desarrollo local sin Docker

```bash
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:4000
```

En desarrollo, Vite proxea `/api` al backend local.
