# Travel Buddy

Browse destinations, book trips, and review the places you've been.

- **Backend**: Django REST API, split into `backend/models.py`, `backend/app.py` (settings, resources, routes) and `backend/seed.py`.
- **Frontend**: React + Vite (`frontend/`).

## Run it

```bash
# API  (http://127.0.0.1:8000/api)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python seed.py              # creates db.sqlite3 with sample data (--reset wipes it first)
python app.py runserver

# UI  (http://localhost:5173, proxies /api to the API)
cd frontend
npm install
npm run dev
```

Sample logins: `demo@travelbuddy.test` / `password123`, and an admin `admin@travelbuddy.test` / `admin12345` (override with `ADMIN_PASSWORD` when seeding).

Environment variables for the API: `DEBUG` (default `1`), `SECRET_KEY` (required when `DEBUG=0`), `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`. The UI reads `VITE_API_URL` (default `/api`).

## Data model

| Model | Fields |
| --- | --- |
| User | id, username, email, password (hashed), is_admin |
| Destination | id, name, category, description, image_url |
| Trip (a booking) | id, user, destination, start_date, end_date, travelers, status (`booked`/`cancelled`) |
| Review | id, user, destination, rating (1-5), comment — one per user per destination |

A user has many trips and reviews; a destination has many reviews and many users through trips.

## API

Every resource is a class-based view (`Resource` subclass) in `app.py`. Auth is a bearer token from `POST /api/login` or `POST /api/users`.

| Resource | Endpoints | Access |
| --- | --- | --- |
| Login | `POST /api/login` | public |
| Me | `GET /api/me` | signed in |
| Users | `GET /api/users` · `POST /api/users` (register) | admin · public |
| User | `GET` `PATCH`/`PUT` `DELETE /api/users/<id>` | that user or admin |
| Destinations | `GET /api/destinations?category=&search=` · `POST` | public · admin |
| Destination | `GET /api/destinations/<id>` (with reviews and travelers) · `PATCH`/`PUT` · `DELETE` | public · admin |
| Trips | `GET /api/trips?status=` (your bookings) · `POST` | signed in |
| Trip | `GET` `PATCH`/`PUT` `DELETE /api/trips/<id>` | owner or admin |
| Trip cancel | `POST /api/trips/<id>/cancel` | owner or admin |
| Reviews | `GET /api/reviews?destination_id=&user_id=` · `POST` | public · signed in |
| Review | `GET` · `PATCH`/`PUT` `DELETE /api/reviews/<id>` | public · author or admin |

`PUT` and `PATCH` are both partial updates. Errors come back as `{"error": "message"}` or `{"error": {"field": ["message"]}}` with 400/401/403/404/409/422 status codes.
