"""Travel Buddy REST API (Django).

A single-file Django project: settings, API resources and URL routes live here,
the data layer lives in models.py and sample data in seed.py.

    python seed.py              # create tables + sample data
    python app.py runserver     # serve the API on http://127.0.0.1:8000/api/
"""
import json
import os
import sys
from importlib import import_module
from pathlib import Path

if __name__ == "__main__":
    # Run as a script, import ourselves under the canonical name "app" so the app
    # config, the URLconf and the resources all share one module instance.
    import app

    app.main()
    sys.exit()

import django
from django.apps import AppConfig
from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.wsgi import get_wsgi_application
from django.db import IntegrityError
from django.db.models import Avg, Count, Q
from django.http import HttpResponse, JsonResponse
from django.urls import path
from django.views import View

# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #
BASE_DIR = Path(__file__).resolve().parent
DEBUG = os.environ.get("DEBUG", "1") == "1"
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError("SECRET_KEY must be set when DEBUG is off.")
    SECRET_KEY = "dev-only-insecure-key"

CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")


class BuddyConfig(AppConfig):
    """Registers the models that live in the top-level models.py module."""

    name = "app"
    label = "buddy"
    default_auto_field = "django.db.models.BigAutoField"

    def import_models(self):
        self.models = self.apps.all_models[self.label]
        self.models_module = import_module("models")  # registers the model classes


if not settings.configured:
    settings.configure(
        DEBUG=DEBUG,
        SECRET_KEY=SECRET_KEY,
        ALLOWED_HOSTS=os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(","),
        ROOT_URLCONF="app",
        INSTALLED_APPS=["app.BuddyConfig"],
        MIDDLEWARE=["app.CorsMiddleware"],
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
            }
        },
        DEFAULT_AUTO_FIELD="django.db.models.BigAutoField",
        USE_TZ=True,
        TIME_ZONE="UTC",
    )
    django.setup()

from models import Destination, Review, Trip, User  # noqa: E402


# --------------------------------------------------------------------------- #
# Middleware: CORS for the React dev server. Auth uses a bearer header, not
# cookies, so CSRF protection is not needed.
# --------------------------------------------------------------------------- #
class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)
        origin = request.headers.get("Origin")
        if origin in CORS_ALLOWED_ORIGINS:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response["Vary"] = "Origin"
        return response


# --------------------------------------------------------------------------- #
# Auth helpers
# --------------------------------------------------------------------------- #
TOKEN_SALT = "travel-buddy-auth"
TOKEN_MAX_AGE = 7 * 24 * 60 * 60  # one week
MIN_PASSWORD_LENGTH = 8


def make_token(user):
    return signing.dumps({"uid": user.id}, salt=TOKEN_SALT)


def user_from_request(request):
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    try:
        payload = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
    except signing.BadSignature:  # also covers expired tokens
        return None
    return User.objects.filter(pk=payload["uid"]).first()


# --------------------------------------------------------------------------- #
# Resource base class
# --------------------------------------------------------------------------- #
class ApiError(Exception):
    def __init__(self, status, error):
        super().__init__(error)
        self.status = status
        self.error = error


class Resource(View):
    """Base class for API resources: one class per URL, one method per verb."""

    def dispatch(self, request, *args, **kwargs):
        request.api_user = user_from_request(request)
        try:
            return super().dispatch(request, *args, **kwargs)
        except ApiError as exc:
            return JsonResponse({"error": exc.error}, status=exc.status)

    # -- request helpers ---------------------------------------------------- #
    @staticmethod
    def payload(request):
        try:
            data = json.loads(request.body or b"{}")
        except (ValueError, UnicodeDecodeError):
            raise ApiError(400, "Request body must be valid JSON.")
        if not isinstance(data, dict):
            raise ApiError(400, "Request body must be a JSON object.")
        return data

    @staticmethod
    def require_user(request):
        if request.api_user is None:
            raise ApiError(401, "Authentication required.")
        return request.api_user

    def require_admin(self, request):
        user = self.require_user(request)
        if not user.is_admin:
            raise ApiError(403, "Admin access required.")
        return user

    def require_owner(self, request, owner_id):
        user = self.require_user(request)
        if not user.is_admin and user.id != owner_id:
            raise ApiError(403, "You do not have access to this resource.")
        return user

    @staticmethod
    def get_object(queryset, pk):
        obj = queryset.filter(pk=pk).first()
        if obj is None:
            raise ApiError(404, "Not found.")
        return obj

    @staticmethod
    def save(instance, data, fields):
        """Copy whitelisted fields from `data`, validate, and save."""
        for field in fields:
            if field in data:
                setattr(instance, field, data[field])
        try:
            instance.full_clean()
            instance.save()
        except ValidationError as exc:
            raise ApiError(422, exc.message_dict)
        except IntegrityError:
            raise ApiError(409, "That value conflicts with an existing record.")
        return instance

    # -- response helpers --------------------------------------------------- #
    @staticmethod
    def ok(data, status=200):
        return JsonResponse(data, status=status, safe=False)

    @staticmethod
    def no_content():
        return HttpResponse(status=204)


# --------------------------------------------------------------------------- #
# Auth resources
# --------------------------------------------------------------------------- #
class LoginResource(Resource):
    def post(self, request):
        data = self.payload(request)
        identifier = str(data.get("email") or data.get("username") or "").strip()
        password = str(data.get("password") or "")
        user = User.objects.filter(
            Q(email__iexact=identifier) | Q(username=identifier)
        ).first()
        if not identifier or user is None or not user.check_password(password):
            raise ApiError(401, "Invalid credentials.")
        return self.ok({"token": make_token(user), "user": user.to_dict()})


class MeResource(Resource):
    def get(self, request):
        return self.ok(self.require_user(request).to_dict())


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
def apply_user_fields(user, data, resource):
    """Shared by create and update: normalise identity fields, hash the password."""
    if "password" in data:
        password = data["password"]
        if not isinstance(password, str) or len(password) < MIN_PASSWORD_LENGTH:
            raise ApiError(
                422, {"password": [f"Password must be at least {MIN_PASSWORD_LENGTH} characters."]}
            )
        user.set_password(password)
    if "username" in data:
        user.username = str(data["username"]).strip()
    if "email" in data:
        user.email = str(data["email"]).strip().lower()
    return resource.save(user, {}, [])


class UserListResource(Resource):
    def get(self, request):
        self.require_admin(request)
        return self.ok([u.to_dict() for u in User.objects.all()])

    def post(self, request):
        """Registration."""
        data = self.payload(request)
        if "password" not in data:
            raise ApiError(422, {"password": ["This field is required."]})
        user = apply_user_fields(User(), data, self)
        return self.ok({"token": make_token(user), "user": user.to_dict()}, status=201)


class UserResource(Resource):
    def get(self, request, pk):
        user = self.get_object(User.objects, pk)
        self.require_owner(request, user.id)
        return self.ok(user.to_dict())

    def patch(self, request, pk):
        user = self.get_object(User.objects, pk)
        self.require_owner(request, user.id)
        apply_user_fields(user, self.payload(request), self)
        return self.ok(user.to_dict())

    put = patch  # updates are partial: send only the fields you want to change

    def delete(self, request, pk):
        user = self.get_object(User.objects, pk)
        self.require_owner(request, user.id)
        user.delete()
        return self.no_content()


# --------------------------------------------------------------------------- #
# Destinations (public read, admin write)
# --------------------------------------------------------------------------- #
DESTINATION_FIELDS = ["name", "category", "description", "image_url"]


class DestinationListResource(Resource):
    def get(self, request):
        queryset = Destination.objects.annotate(
            review_count=Count("reviews", distinct=True),
            average_rating=Avg("reviews__rating"),
        )
        category = request.GET.get("category")
        if category:
            queryset = queryset.filter(category=category)
        search = request.GET.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        return self.ok([d.to_dict() for d in queryset])

    def post(self, request):
        self.require_admin(request)
        destination = self.save(Destination(), self.payload(request), DESTINATION_FIELDS)
        return self.ok(destination.to_dict(detail=True), status=201)


class DestinationResource(Resource):
    def get(self, request, pk):
        destination = self.get_object(Destination.objects, pk)
        return self.ok(destination.to_dict(detail=True))

    def patch(self, request, pk):
        self.require_admin(request)
        destination = self.get_object(Destination.objects, pk)
        self.save(destination, self.payload(request), DESTINATION_FIELDS)
        return self.ok(destination.to_dict(detail=True))

    put = patch

    def delete(self, request, pk):
        self.require_admin(request)
        self.get_object(Destination.objects, pk).delete()
        return self.no_content()


# --------------------------------------------------------------------------- #
# Trips (bookings): users only ever see and change their own
# --------------------------------------------------------------------------- #
TRIP_FIELDS = ["destination_id", "start_date", "end_date", "travelers"]


class TripListResource(Resource):
    def get(self, request):
        user = self.require_user(request)
        queryset = Trip.objects.filter(user=user).select_related("destination")
        status = request.GET.get("status")
        if status:
            queryset = queryset.filter(status=status)
        return self.ok([t.to_dict() for t in queryset])

    def post(self, request):
        user = self.require_user(request)
        trip = self.save(Trip(user=user), self.payload(request), TRIP_FIELDS)
        return self.ok(trip.to_dict(), status=201)


class TripBase(Resource):
    def load(self, request, pk):
        trip = self.get_object(Trip.objects.select_related("destination"), pk)
        self.require_owner(request, trip.user_id)
        return trip


class TripResource(TripBase):
    def get(self, request, pk):
        return self.ok(self.load(request, pk).to_dict())

    def patch(self, request, pk):
        trip = self.load(request, pk)
        if trip.status == Trip.CANCELLED:
            raise ApiError(409, "Cancelled bookings cannot be modified.")
        self.save(trip, self.payload(request), TRIP_FIELDS)
        return self.ok(trip.to_dict())

    put = patch

    def delete(self, request, pk):
        self.load(request, pk).delete()
        return self.no_content()


class TripCancelResource(TripBase):
    """POST /trips/<id>/cancel keeps the booking on record, marked as cancelled."""

    def post(self, request, pk):
        trip = self.load(request, pk)
        if trip.status == Trip.CANCELLED:
            raise ApiError(409, "This booking is already cancelled.")
        trip.status = Trip.CANCELLED
        trip.save(update_fields=["status"])
        return self.ok(trip.to_dict())


# --------------------------------------------------------------------------- #
# Reviews (public read, authors write)
# --------------------------------------------------------------------------- #
class ReviewListResource(Resource):
    def get(self, request):
        queryset = Review.objects.select_related("user")
        try:
            if request.GET.get("destination_id"):
                queryset = queryset.filter(destination_id=request.GET["destination_id"])
            if request.GET.get("user_id"):
                queryset = queryset.filter(user_id=request.GET["user_id"])
        except ValueError:
            raise ApiError(400, "destination_id and user_id must be integers.")
        return self.ok([r.to_dict() for r in queryset])

    def post(self, request):
        user = self.require_user(request)
        review = self.save(
            Review(user=user), self.payload(request), ["destination_id", "rating", "comment"]
        )
        return self.ok(review.to_dict(), status=201)


class ReviewResource(Resource):
    def load(self, pk):
        return self.get_object(Review.objects.select_related("user"), pk)

    def get(self, request, pk):
        return self.ok(self.load(pk).to_dict())

    def patch(self, request, pk):
        review = self.load(pk)
        self.require_owner(request, review.user_id)
        self.save(review, self.payload(request), ["rating", "comment"])
        return self.ok(review.to_dict())

    put = patch

    def delete(self, request, pk):
        review = self.load(pk)
        self.require_owner(request, review.user_id)
        review.delete()
        return self.no_content()


# --------------------------------------------------------------------------- #
# URL routes
# --------------------------------------------------------------------------- #
urlpatterns = [
    path("api/login", LoginResource.as_view()),
    path("api/me", MeResource.as_view()),
    path("api/users", UserListResource.as_view()),
    path("api/users/<int:pk>", UserResource.as_view()),
    path("api/destinations", DestinationListResource.as_view()),
    path("api/destinations/<int:pk>", DestinationResource.as_view()),
    path("api/trips", TripListResource.as_view()),
    path("api/trips/<int:pk>", TripResource.as_view()),
    path("api/trips/<int:pk>/cancel", TripCancelResource.as_view()),
    path("api/reviews", ReviewListResource.as_view()),
    path("api/reviews/<int:pk>", ReviewResource.as_view()),
]

application = get_wsgi_application()  # for gunicorn: `gunicorn app:application`


def main():
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
