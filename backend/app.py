"""
app.py - the Flask web server (the "application tier").

It does two jobs:
  1. Serves the HTML/CSS/JS files from ../frontend  (open http://localhost:5000)
  2. Offers a JSON API under /api/...  that talks to Neo4j.

All Cypher lives in queries.py; this file only validates input, runs the
queries and returns JSON with proper HTTP status codes
(200 OK, 201 Created, 400 bad input, 401 wrong login, 403 not allowed,
 404 not found, 409 conflict, 503 database down).
"""
import os
import uuid
from datetime import datetime

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from neo4j.exceptions import ServiceUnavailable, AuthError
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import safe_join

import queries as q
from db import run_read, run_write
from utils import haversine_km, calc_fare

# The React app is built (npm run build) into frontend/dist. Flask serves that folder.
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist"))

app = Flask(__name__, static_folder=None)   # we serve the frontend ourselves (see bottom of the routes)
CORS(app)

# Hardcoded admin account (fine for a college demo)
ADMIN_EMAIL = "prakash"          # admin username
ADMIN_PASSWORD = "admin123"

PAYMENT_METHODS = ("cash", "upi", "card")
LOGIN_FAILED = "Incorrect username or password. Please try again."


# ---------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------
class ApiError(Exception):
    """Raise this anywhere to send a clean JSON error to the browser."""
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


@app.errorhandler(ApiError)
def handle_api_error(e):
    return jsonify({"error": e.message}), e.status


@app.errorhandler(ServiceUnavailable)
@app.errorhandler(AuthError)
def handle_db_down(e):
    return jsonify({"error": "Cannot connect to the Neo4j database. "
                             "Is 'ridegraph-db' started and is the password in .env correct?"}), 503


@app.errorhandler(404)
def handle_404(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(Exception)
def handle_unexpected(e):
    app.logger.exception(e)
    return jsonify({"error": "Internal server error: " + str(e)}), 500


def body():
    """The JSON body of the request as a dict ({} if missing)."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be JSON")
    return data


def need(data, *fields):
    """Make sure every field is present and non-empty; return stripped strings."""
    out = []
    for f in fields:
        v = data.get(f)
        if v is None or (isinstance(v, str) and not v.strip()):
            raise ApiError(f"'{f}' is required")
        out.append(v.strip() if isinstance(v, str) else v)
    return out if len(out) > 1 else out[0]


def new_id(prefix):
    return prefix + uuid.uuid4().hex[:8].upper()


def one(rows, message, status=404):
    """Return the first row or raise an error if there is none."""
    if not rows:
        raise ApiError(message, status)
    return rows[0]


def get_ride_or_404(ride_id):
    return one(run_read(q.GET_RIDE, ride_id=ride_id), "Ride not found")


def calculate_trip(pickup_id, dropoff_id, ride_type_id, promo_code):
    """Shared by 'fare estimate' and 'request ride': distance, fare, promo."""
    if pickup_id == dropoff_id:
        raise ApiError("Pickup and dropoff must be different locations")
    pick = one(run_read(q.GET_LOCATION, location_id=pickup_id), "Pickup location not found")
    drop = one(run_read(q.GET_LOCATION, location_id=dropoff_id), "Dropoff location not found")
    rtype = one(run_read(q.GET_RIDE_TYPE, ride_type_id=ride_type_id), "Ride type not found")

    promo = None
    if promo_code:
        promo = one(run_read(q.GET_PROMO, code=promo_code), "Invalid promo code")
    discount = promo["discount_percent"] if promo else 0

    distance = round(haversine_km(pick["latitude"], pick["longitude"],
                                  drop["latitude"], drop["longitude"]), 2)
    gross, net = calc_fare(rtype["base_fare"], rtype["per_km_rate"], distance, discount)
    return {"pickup": pick["address"], "dropoff": drop["address"], "ride_type": rtype["type_name"],
            "distance_km": distance, "base_fare": rtype["base_fare"],
            "per_km_rate": rtype["per_km_rate"], "fare_before_discount": gross,
            "discount_percent": discount, "fare_amount": net,
            "promo_code": promo["code"] if promo else None,
            "promo_id": promo["promo_id"] if promo else None}


# ---------------------------------------------------------------------
# Register / login
# ---------------------------------------------------------------------
@app.route("/api/register", methods=["POST"])
def register():
    data = body()
    role = data.get("role", "rider")
    if role not in ("rider", "driver"):
        raise ApiError("role must be 'rider' or 'driver'")

    if role == "rider":
        name, email, phone, password = need(data, "name", "email", "phone", "password")
        email = email.lower()
        if "@" not in email or "." not in email:
            raise ApiError("Please enter a valid email address")
        if len(password) < 6:
            raise ApiError("Password must be at least 6 characters")
        if run_read(q.GET_USER_BY_EMAIL, email=email):
            raise ApiError("That email is already registered", 409)
        user = run_write(q.CREATE_USER, user_id=new_id("U"), name=name, email=email,
                         phone=phone, password_hash=generate_password_hash(password))[0]
        return jsonify({"role": "rider", "user": user}), 201

    # driver
    name, phone, license_no, password, zone_id, plate, model, color = need(
        data, "name", "phone", "license_number", "password", "zone_id",
        "plate_number", "model", "color")
    if len(password) < 6:
        raise ApiError("Password must be at least 6 characters")
    if run_read(q.GET_DRIVER_BY_PHONE, phone=phone):
        raise ApiError("That phone number is already registered", 409)
    if run_read(q.GET_DRIVER_BY_LICENSE, license_number=license_no):
        raise ApiError("That licence number is already registered", 409)
    driver_id = new_id("D")
    created = run_write(q.CREATE_DRIVER, driver_id=driver_id, name=name, license_number=license_no,
                        phone=phone, password_hash=generate_password_hash(password),
                        vehicle_id=new_id("V"), plate_number=plate, model=model, color=color,
                        zone_id=zone_id)
    if not created:
        raise ApiError("Zone not found", 404)
    user = run_read(q.GET_DRIVER_BY_ID, driver_id=driver_id)[0]
    return jsonify({"role": "driver", "user": user}), 201


@app.route("/api/login", methods=["POST"])
def login():
    """
    Body: {role: rider|driver|admin, identifier, password}
    identifier = email for riders/admin, phone number for drivers.
    """
    data = body()
    role = data.get("role", "rider")
    identifier = str(data.get("identifier") or "").strip()
    password = str(data.get("password") or "")
    if not identifier or not password:
        raise ApiError("Please enter your username/email and your password.", 400)
    if role not in ("rider", "driver", "admin"):
        raise ApiError("role must be rider, driver or admin", 400)

    # The SAME message is used for "unknown user" and "wrong password", so
    # nobody can find out which usernames exist.
    if role == "admin":
        if identifier.lower() != ADMIN_EMAIL or password != ADMIN_PASSWORD:
            raise ApiError(LOGIN_FAILED, 401)
        return jsonify({"role": "admin", "user": {"name": "Prakash", "email": ADMIN_EMAIL}})

    if role == "rider":
        row = one(run_read(q.GET_USER_BY_EMAIL, email=identifier.lower()), LOGIN_FAILED, 401)
    else:
        row = one(run_read(q.GET_DRIVER_BY_PHONE, phone=identifier), LOGIN_FAILED, 401)

    if not check_password_hash(row["password_hash"], password):
        raise ApiError(LOGIN_FAILED, 401)
    row.pop("password_hash")  # never send the hash to the browser
    return jsonify({"role": role, "user": row})


# ---------------------------------------------------------------------
# Lookup data
# ---------------------------------------------------------------------
@app.route("/api/locations")
def locations():
    return jsonify(run_read(q.LIST_LOCATIONS))


@app.route("/api/zones")
def zones():
    return jsonify(run_read(q.LIST_ZONES))


@app.route("/api/ride-types")
def ride_types():
    return jsonify(run_read(q.LIST_RIDE_TYPES))


@app.route("/api/promo/<code>")
def promo(code):
    return jsonify(one(run_read(q.GET_PROMO, code=code), "Invalid promo code"))


@app.route("/api/locations/<location_id>/nearby-drivers")
def nearby_by_location(location_id):
    """Available drivers in a location's zone (used before booking)."""
    one(run_read(q.GET_LOCATION, location_id=location_id), "Location not found")
    return jsonify(run_read(q.NEARBY_DRIVERS_BY_LOCATION, location_id=location_id))


# ---------------------------------------------------------------------
# Rides
# ---------------------------------------------------------------------
@app.route("/api/fare-estimate", methods=["POST"])
def fare_estimate():
    data = body()
    pickup, dropoff, rtype = need(data, "pickup_id", "dropoff_id", "ride_type_id")
    trip = calculate_trip(pickup, dropoff, rtype, (data.get("promo_code") or "").strip())
    trip.pop("promo_id")
    return jsonify(trip)


@app.route("/api/rides", methods=["POST"])
def request_ride():
    data = body()
    user_id, pickup, dropoff, rtype = need(data, "user_id", "pickup_id", "dropoff_id", "ride_type_id")
    one(run_read(q.GET_USER_BY_ID, user_id=user_id), "Rider not found")
    trip = calculate_trip(pickup, dropoff, rtype, (data.get("promo_code") or "").strip())

    ride_id = new_id("R")
    run_write(q.CREATE_RIDE, user_id=user_id, ride_type_id=rtype, pickup_id=pickup,
              dropoff_id=dropoff, ride_id=ride_id,
              requested_at=datetime.now().replace(microsecond=0).isoformat(),
              distance_km=trip["distance_km"], fare_amount=trip["fare_amount"])
    if trip["promo_id"]:
        run_write(q.LINK_PROMO, ride_id=ride_id, promo_id=trip["promo_id"])
    return jsonify(get_ride_or_404(ride_id)), 201


@app.route("/api/rides/<ride_id>")
def ride_detail(ride_id):
    return jsonify(get_ride_or_404(ride_id))


@app.route("/api/rides/<ride_id>/nearby-drivers")
def nearby_drivers(ride_id):
    get_ride_or_404(ride_id)
    return jsonify(run_read(q.NEARBY_DRIVERS_BY_RIDE, ride_id=ride_id))


@app.route("/api/rides/<ride_id>/accept", methods=["POST"])
def accept_ride(ride_id):
    driver_id = need(body(), "driver_id")
    ride = get_ride_or_404(ride_id)
    drv = one(run_read(q.GET_DRIVER_BY_ID, driver_id=driver_id), "Driver not found")
    # Explain clearly WHY it would fail, before trying.
    if ride["status"] != "requested":
        raise ApiError(f"Ride is already '{ride['status']}' and cannot be accepted", 409)
    if drv["status"] != "available":
        raise ApiError("You are busy with another ride", 409)
    if not run_write(q.ACCEPT_RIDE, driver_id=driver_id, ride_id=ride_id):
        raise ApiError("This ride is outside your zone", 403)
    return jsonify(get_ride_or_404(ride_id))


@app.route("/api/rides/<ride_id>/complete", methods=["POST"])
def complete_ride(ride_id):
    driver_id = need(body(), "driver_id")
    ride = get_ride_or_404(ride_id)
    if ride["driver_id"] != driver_id:
        raise ApiError("Only the driver of this ride can complete it", 403)
    if ride["status"] != "accepted":
        raise ApiError(f"Ride is '{ride['status']}', only accepted rides can be completed", 409)
    run_write(q.COMPLETE_RIDE, driver_id=driver_id, ride_id=ride_id, payment_id=new_id("PAY"))
    return jsonify(get_ride_or_404(ride_id))


@app.route("/api/rides/<ride_id>/pay", methods=["POST"])
def pay_ride(ride_id):
    data = body()
    user_id = need(data, "user_id")
    method = str(data.get("method", "")).lower()
    if method not in PAYMENT_METHODS:
        raise ApiError("method must be one of: " + ", ".join(PAYMENT_METHODS))
    ride = get_ride_or_404(ride_id)
    if ride["user_id"] != user_id:
        raise ApiError("This is not your ride", 403)
    if ride["status"] != "completed":
        raise ApiError("You can only pay for a completed ride", 409)
    if ride["payment_status"] == "paid":
        raise ApiError("This ride is already paid", 409)
    run_write(q.PAY_RIDE, user_id=user_id, ride_id=ride_id, method=method)
    return jsonify(get_ride_or_404(ride_id))


@app.route("/api/rides/<ride_id>/cancel", methods=["POST"])
def cancel_ride(ride_id):
    data = body()
    cancelled_by = str(data.get("cancelled_by", "rider")).lower()
    if cancelled_by not in ("rider", "driver"):
        raise ApiError("cancelled_by must be 'rider' or 'driver'")
    reason = (data.get("reason") or "No reason given").strip()[:200]
    ride = get_ride_or_404(ride_id)

    if cancelled_by == "rider" and ride["user_id"] != need(data, "user_id"):
        raise ApiError("This is not your ride", 403)
    if cancelled_by == "driver" and ride["driver_id"] != need(data, "driver_id"):
        raise ApiError("Only the driver of this ride can cancel as driver", 403)
    if ride["status"] not in ("requested", "accepted"):
        raise ApiError(f"A '{ride['status']}' ride cannot be cancelled", 409)

    run_write(q.CANCEL_RIDE, ride_id=ride_id, cancellation_id=new_id("C"),
              reason=reason, cancelled_by=cancelled_by)
    return jsonify(get_ride_or_404(ride_id))


@app.route("/api/rides/<ride_id>/rate", methods=["POST"])
def rate_ride(ride_id):
    data = body()
    user_id = need(data, "user_id")
    try:
        score = int(data.get("score"))
    except (TypeError, ValueError):
        raise ApiError("score must be a whole number from 1 to 5")
    if not 1 <= score <= 5:
        raise ApiError("score must be from 1 to 5")
    comment = (data.get("comment") or "").strip()[:300]

    ride = get_ride_or_404(ride_id)
    if ride["user_id"] != user_id:
        raise ApiError("This is not your ride", 403)
    if ride["status"] != "completed":
        raise ApiError("Only completed rides can be rated", 409)
    if ride["rating_score"] is not None:
        raise ApiError("This ride is already rated", 409)

    if not run_write(q.CREATE_RATING, user_id=user_id, ride_id=ride_id,
                     rating_id=new_id("RT"), score=score, comment=comment):
        raise ApiError("Could not save rating", 409)
    run_write(q.UPDATE_DRIVER_RATING, driver_id=ride["driver_id"])
    return jsonify(get_ride_or_404(ride_id)), 201


# ---------------------------------------------------------------------
# Rider / driver pages
# ---------------------------------------------------------------------
@app.route("/api/users/<user_id>/rides")
def user_rides(user_id):
    one(run_read(q.GET_USER_BY_ID, user_id=user_id), "Rider not found")
    return jsonify(run_read(q.RIDES_OF_USER, user_id=user_id))


@app.route("/api/drivers/<driver_id>")
def driver_profile(driver_id):
    return jsonify(one(run_read(q.GET_DRIVER_BY_ID, driver_id=driver_id), "Driver not found"))


@app.route("/api/drivers/<driver_id>/rides")
def driver_rides(driver_id):
    one(run_read(q.GET_DRIVER_BY_ID, driver_id=driver_id), "Driver not found")
    earnings = run_read(q.DRIVER_EARNINGS, driver_id=driver_id)[0]
    return jsonify({"rides": run_read(q.RIDES_OF_DRIVER, driver_id=driver_id),
                    "total_earnings": round(earnings["total_earnings"], 2),
                    "completed_rides": earnings["completed_rides"]})


@app.route("/api/drivers/<driver_id>/requests")
def driver_requests(driver_id):
    """Open ride requests in the driver's zone."""
    one(run_read(q.GET_DRIVER_BY_ID, driver_id=driver_id), "Driver not found")
    return jsonify(run_read(q.OPEN_REQUESTS_FOR_DRIVER, driver_id=driver_id))


# ---------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------
@app.route("/api/admin/stats")
def admin_stats():
    totals = run_read(q.STAT_TOTALS)[0]
    cancels = run_read(q.STAT_CANCELLATIONS)
    counts = run_read(q.STAT_COUNTS)[0]
    return jsonify({
        "total_rides": totals["total_rides"],
        "completed_rides": totals["completed_rides"],
        "revenue": round(totals["revenue"] or 0, 2),
        "cancellation_count": sum(c["n"] for c in cancels),
        "cancellations_by": {c["cancelled_by"]: c["n"] for c in cancels},
        "rides_per_zone": run_read(q.STAT_RIDES_PER_ZONE),
        "top_drivers": run_read(q.STAT_TOP_DRIVERS),
        "riders": counts["riders"], "drivers": counts["drivers"],
    })


# ---------------------------------------------------------------------
# Frontend (the built React app) - keep this LAST so /api/... routes win.
# React Router handles pages like /rider or /login in the browser, so for any
# URL that is not a real file we return index.html. That is why refreshing
# the page on /rider still works.
# ---------------------------------------------------------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def frontend(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    real_file = safe_join(DIST_DIR, path) if path else None
    if real_file and os.path.isfile(real_file):
        return send_from_directory(DIST_DIR, path)
    if os.path.isfile(os.path.join(DIST_DIR, "index.html")):
        return send_from_directory(DIST_DIR, "index.html")
    return ("RideGraph frontend is not built yet. Open a terminal in the 'frontend' folder "
            "and run:  npm install  then  npm run build", 503)


if __name__ == "__main__":
    # The port is 5000 unless RIDEGRAPH_PORT is set (run_mac.command uses this when
    # macOS has already taken port 5000 for AirPlay Receiver).
    port = int(os.getenv("RIDEGRAPH_PORT", "5000"))
    print(f"RideGraph running at http://localhost:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
