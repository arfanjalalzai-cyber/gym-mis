from mimetypes import guess_type
from io import BytesIO

from django.http import FileResponse, Http404
from django.views.decorators.http import require_GET

from .models import UploadedMedia


@require_GET
def serve_database_media(request, path):
    try:
        media = UploadedMedia.objects.only("content", "content_type").get(name=path)
    except UploadedMedia.DoesNotExist as exc:
        raise Http404("Uploaded file not found.") from exc

    content_type = media.content_type or guess_type(path)[0] or "application/octet-stream"
    response = FileResponse(BytesIO(bytes(media.content)), content_type=content_type)
    response["Cache-Control"] = "public, max-age=86400"
    return response
