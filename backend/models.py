"""Database models for Travel Buddy.

Relationships:
    User 1 ── * Trip * ── 1 Destination      (Trip is the booking / join model)
    User 1 ── * Review * ── 1 Destination
    User * ── * Destination  (through Trip)
"""
from datetime import date

from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

APP_LABEL = "buddy"


class User(models.Model):
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)  # always a hash, never plain text
    is_admin = models.BooleanField(default=False)

    class Meta:
        app_label = APP_LABEL
        ordering = ["id"]

    def __str__(self):
        return self.username

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "is_admin": self.is_admin,
        }


class Destination(models.Model):
    CATEGORIES = [
        ("beach", "Beach"),
        ("city", "City"),
        ("mountain", "Mountain"),
        ("safari", "Safari"),
        ("cultural", "Cultural"),
    ]

    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    description = models.CharField(max_length=300)
    image_url = models.URLField(max_length=500)
    # Every user who has a trip to this destination.
    users = models.ManyToManyField(User, through="Trip", related_name="destinations")

    class Meta:
        app_label = APP_LABEL
        ordering = ["name"]

    def __str__(self):
        return self.name

    def to_dict(self, detail=False):
        data = {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "image_url": self.image_url,
        }
        reviews = list(self.reviews.select_related("user"))
        data["review_count"] = len(reviews)
        data["average_rating"] = (
            round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else None
        )
        if detail:
            data["reviews"] = [r.to_dict() for r in reviews]
            data["users"] = [
                {"id": u.id, "username": u.username} for u in self.users.distinct()
            ]
        return data


class Trip(models.Model):
    BOOKED = "booked"
    CANCELLED = "cancelled"
    STATUSES = [(BOOKED, "Booked"), (CANCELLED, "Cancelled")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trips")
    destination = models.ForeignKey(
        Destination, on_delete=models.CASCADE, related_name="trips"
    )
    start_date = models.DateField()
    end_date = models.DateField()
    travelers = models.PositiveSmallIntegerField(
        default=1, validators=[MinValueValidator(1), MaxValueValidator(20)]
    )
    status = models.CharField(max_length=10, choices=STATUSES, default=BOOKED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = APP_LABEL
        ordering = ["start_date", "id"]

    def __str__(self):
        return f"{self.user} -> {self.destination} ({self.start_date})"

    def clean(self):
        # clean_fields() may have left a raw, unparsed value behind on bad input.
        if isinstance(self.start_date, date) and isinstance(self.end_date, date):
            if self.end_date < self.start_date:
                raise ValidationError({"end_date": "End date cannot be before start date."})

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "destination_id": self.destination_id,
            "destination": {
                "id": self.destination_id,
                "name": self.destination.name,
                "category": self.destination.category,
                "image_url": self.destination.image_url,
            },
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "travelers": self.travelers,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    destination = models.ForeignKey(
        Destination, on_delete=models.CASCADE, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = APP_LABEL
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "destination"],
                name="one_review_per_user_per_destination",
                violation_error_message="You have already reviewed this destination.",
            )
        ]

    def __str__(self):
        return f"{self.user} on {self.destination}: {self.rating}/5"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.user.username,
            "destination_id": self.destination_id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat(),
        }
