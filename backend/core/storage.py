from __future__ import annotations

from datetime import datetime
from io import BytesIO
from urllib.parse import quote

from django.core.files.base import File
from django.core.files.storage import Storage
from django.utils import timezone


class DatabaseMediaStorage(Storage):
    """Django storage backend that keeps uploaded images in PostgreSQL."""

    def _model(self):
        from .models import UploadedMedia

        return UploadedMedia

    def _open(self, name, mode="rb"):
        media = self._model().objects.get(name=name)
        file = File(BytesIO(bytes(media.content)), name=name)
        return file

    def _save(self, name, content):
        model = self._model()
        model.objects.update_or_create(
            name=name,
            defaults={
                "content": content.read(),
                "content_type": getattr(content, "content_type", "") or "",
            },
        )
        return name

    def delete(self, name):
        self._model().objects.filter(name=name).delete()

    def exists(self, name):
        return self._model().objects.filter(name=name).exists()

    def size(self, name):
        return len(self._model().objects.only("content").get(name=name).content)

    def get_modified_time(self, name):
        return self._model().only("updated_at").get(name=name).updated_at

    def url(self, name):
        return f"/media/{quote(name, safe='/')}"
