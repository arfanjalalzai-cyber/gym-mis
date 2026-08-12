FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . ./

RUN useradd --create-home --shell /usr/sbin/nologin appuser \
    && mkdir -p /data/media \
    && chown -R appuser:appuser /app /data

USER appuser
EXPOSE 8000

CMD ["/bin/sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && if [ \"${CREATE_DEFAULT_SUPERUSER:-false}\" = \"true\" ]; then python manage.py ensure_superuser; fi && exec gunicorn gym.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --timeout 120 --access-logfile - --error-logfile -"]
