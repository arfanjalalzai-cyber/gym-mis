# Railway deployment

This repository deploys as two isolated Railway services. Set the service root directory and config-file path exactly as shown:

| Service | Root directory | Config as code path |
| --- | --- | --- |
| Backend | `/backend` | `/backend/railway.toml` |
| Frontend | `/frontend` | `/frontend/railway.toml` |

Both services use their own `Dockerfile`. Create a Railway PostgreSQL service, then set the backend `DATABASE_URL` variable to the PostgreSQL service's `DATABASE_URL` reference.

> The repository root also has a backend fallback `Dockerfile` and `railway.toml`. This prevents a Railpack "No start command detected" error if an existing backend service is still configured with no Root Directory. New deployments should still use `/backend` and `/frontend` as separate service root directories.

## Backend variables

Set these in the backend service:

```text
DEBUG=false
SECRET_KEY=<a-long-random-secret>
DATABASE_URL=${{Postgres.DATABASE_URL}}
MEDIA_ROOT=/data/media
FRONTEND_URL=https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
CORS_ALLOWED_ORIGINS=https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
CSRF_TRUSTED_ORIGINS=https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
DJANGO_ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}}
JWT_COOKIE_SECURE=true
EMAIL_HOST_USER=<smtp-user>
EMAIL_HOST_PASSWORD=<smtp-password>
DEFAULT_FROM_EMAIL=<from-address>
CREATE_DEFAULT_SUPERUSER=true
DJANGO_SUPERUSER_USERNAME=<initial-admin-username>
DJANGO_SUPERUSER_PASSWORD=<long-unique-password>
DJANGO_SUPERUSER_EMAIL=<initial-admin-email>
```

Attach a Railway Volume to the backend and mount it at `/data`; this preserves uploaded media. Database migrations and static-file collection run automatically before Gunicorn starts.

When `CREATE_DEFAULT_SUPERUSER=true`, the backend also runs `python manage.py ensure_superuser` after migrations. It creates the configured account once, or restores its admin privileges if it already exists. It does not replace an existing password unless `DEFAULT_SUPERUSER_UPDATE_PASSWORD=true` is set. The standard `python manage.py createsuperuser --noinput` is also supported and automatically assigns the required `role_name=admin`.

## Frontend variable

Set this on the frontend service **before its first build**:

```text
VITE_API_BASE_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api
```

Vite embeds `VITE_API_BASE_URL` into the build output, so redeploy the frontend whenever it changes. Generate public domains for both services before setting these references. Service names in variable references must match the names you choose in Railway.

## Local Docker builds

```sh
docker build -t gym-backend ./backend
docker build -t gym-frontend --build-arg VITE_API_BASE_URL=http://localhost:8000/api ./frontend
```

Run the frontend image with `-e PORT=8080`; Railway supplies `PORT` automatically.
