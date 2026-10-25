"""Create the database tables and fill them with sample data.

    python seed.py            # idempotent: safe to run more than once
    python seed.py --reset    # wipe all data first
"""
import os
import sys
from datetime import date, timedelta

import app  # noqa: F401  (configures Django on import)
from django.core.management import call_command

from models import Destination, Review, Trip, User

PHOTO = "https://images.unsplash.com/photo-{}?auto=format&fit=crop&w=900&q=80"

DESTINATIONS = [
    ("Maldives", "beach", "Overwater villas, powder-white sand and warm turquoise lagoons.",
     "1507525428034-b723cf961d3e"),
    ("Paris", "city", "Cafés, world-class museums and the iron lady lighting up the skyline.",
     "1502602898657-3e91760cbb34"),
    ("Kyoto", "cultural", "Wooden machiya streets, pagodas and centuries-old tea houses.",
     "1493976040374-85c8e12f0c0e"),
    ("Swiss Alps", "mountain", "Snow-capped peaks above a sea of clouds, with trails for every level.",
     "1506905925346-21bda4d32df4"),
    ("Serengeti", "safari", "Endless savannah, golden sunsets and the great wildebeest migration.",
     "1516426122078-c23e76319801"),
    ("Machu Picchu", "cultural", "A mist-wrapped Inca citadel perched high in the Peruvian Andes.",
     "1526392060635-9d6019884377"),
    ("Agra", "cultural", "Home of the Taj Mahal, a monument to love in white marble.",
     "1548013146-72479768bada"),
    ("New York City", "city", "Skyscrapers, Broadway lights and a different cuisine on every block.",
     "1480714378408-67cf0d13bc1b"),
    ("Rome", "city", "Walk through 2,000 years of history, from the Colosseum to the Trevi Fountain.",
     "1552832230-c0197dd311b5"),
]

USERS = [
    # username, email, password, is_admin
    ("admin", "admin@travelbuddy.test", os.environ.get("ADMIN_PASSWORD", "admin12345"), True),
    ("demo", "demo@travelbuddy.test", "password123", False),
    ("amina", "amina@travelbuddy.test", "password123", False),
    ("kofi", "kofi@travelbuddy.test", "password123", False),
]

# (username, destination, days from today to start, length in days, travelers, status)
TRIPS = [
    ("demo", "Paris", 30, 6, 2, Trip.BOOKED),
    ("demo", "Maldives", 90, 8, 2, Trip.CANCELLED),
    ("demo", "Kyoto", -60, 7, 1, Trip.BOOKED),
    ("amina", "Serengeti", 45, 5, 3, Trip.BOOKED),
    ("kofi", "Kyoto", -120, 10, 1, Trip.BOOKED),
    ("kofi", "Paris", 20, 4, 2, Trip.BOOKED),
]

# (username, destination, rating, comment)
REVIEWS = [
    ("demo", "Kyoto", 5, "Quiet mornings in the temples were unforgettable. Go in autumn."),
    ("kofi", "Kyoto", 4, "Beautiful, but book restaurants well in advance."),
    ("amina", "Paris", 4, "Great food and museums. Skip the queues with pre-booked tickets."),
    ("kofi", "Serengeti", 5, "Saw the big five in three days. Worth every penny."),
]


def seed():
    call_command("migrate", run_syncdb=True, verbosity=0)

    for name, category, description, photo in DESTINATIONS:
        Destination.objects.update_or_create(
            name=name,
            defaults={
                "category": category,
                "description": description,
                "image_url": PHOTO.format(photo),
            },
        )

    for username, email, password, is_admin in USERS:
        user, created = User.objects.get_or_create(
            email=email, defaults={"username": username, "is_admin": is_admin}
        )
        if created:
            user.set_password(password)
            user.save()

    users = {u.username: u for u in User.objects.all()}
    destinations = {d.name: d for d in Destination.objects.all()}

    if not Trip.objects.exists():
        today = date.today()
        for username, place, offset, length, travelers, status in TRIPS:
            start = today + timedelta(days=offset)
            Trip.objects.create(
                user=users[username],
                destination=destinations[place],
                start_date=start,
                end_date=start + timedelta(days=length),
                travelers=travelers,
                status=status,
            )

    if not Review.objects.exists():
        for username, place, rating, comment in REVIEWS:
            Review.objects.create(
                user=users[username],
                destination=destinations[place],
                rating=rating,
                comment=comment,
            )


if __name__ == "__main__":
    if "--reset" in sys.argv:
        call_command("migrate", run_syncdb=True, verbosity=0)
        call_command("flush", interactive=False, verbosity=0)
    seed()
    print(
        f"Seeded {Destination.objects.count()} destinations, {User.objects.count()} users, "
        f"{Trip.objects.count()} trips and {Review.objects.count()} reviews."
    )
    print("Log in as demo@travelbuddy.test / password123 (admin: admin@travelbuddy.test).")
