"""
test_api.py - tests every endpoint with a full ride flow.
Start the Flask server first (src/backend/app.py), then run:  python tests/test_api.py
Uses only the standard library, so it needs no extra packages.
"""
import json
import sys
import time
import urllib.request
import urllib.error
import os

# test_api.py lives in tests/; the cleanup step imports db.py/queries.py from src/backend
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "backend"))

BASE = "http://127.0.0.1:5000"   # 127.0.0.1 avoids a slow IPv6 lookup on Windows
passed = failed = 0


def call(method, path, data=None):
    """Send a request; return (status_code, parsed_json)."""
    req = urllib.request.Request(
        BASE + path, method=method,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def check(name, condition, extra=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS  {name}")
    else:
        failed += 1
        print(f"  FAIL  {name}  {extra}")


print("== Static frontend ==")
with urllib.request.urlopen(BASE + "/") as r:
    check("GET / serves index.html", r.status == 200 and b"RideGraph" in r.read())

print("== Drivers: Praveen (demo driver) and Virat Kohli ==")
s, st0 = call("GET", "/api/admin/stats")
check("exactly 11 drivers in the database", s == 200 and st0["drivers"] == 11, st0.get("drivers"))
s, r = call("POST", "/api/login", {"role": "driver", "identifier": "9876500011", "password": "driver123"})
check("Praveen (D11) can log in", s == 200 and r["user"]["name"] == "Praveen" and r["user"]["driver_id"] == "D11", r)
check("Praveen: available, T. Nagar zone, own vehicle",
      r["user"]["status"] == "available" and r["user"]["zone_name"] == "T. Nagar" and r["user"]["plate_number"] == "TN01AB1011")
check("Praveen rating is high (seed value is about 4.7)", 4.5 <= r["user"]["rating_avg"] <= 5.0, r["user"]["rating_avg"])
s, pr = call("GET", "/api/drivers/D11/rides")
check("Praveen has at least his 4 history rides and earnings", s == 200 and pr["completed_rides"] >= 4 and pr["total_earnings"] >= 553, pr.get("total_earnings"))
seed_rides = [x for x in pr["rides"] if x["ride_id"] in ("R21", "R22", "R23", "R24")]
check("Praveen's 4 history rides (R21-R24) all have payment + rating",
      len(seed_rides) == 4 and all(x["payment_status"] == "paid" and x["rating_score"] is not None for x in seed_rides))
s, near = call("GET", "/api/locations/L1/nearby-drivers")
check("Praveen shows up in nearby drivers", s == 200 and any(d["driver_id"] == "D11" for d in near), near)
check("nearby drivers are sorted by rating", [d["rating_avg"] for d in near] == sorted([d["rating_avg"] for d in near], reverse=True))
s, r = call("POST", "/api/login", {"role": "driver", "identifier": "9876500001", "password": "driver123"})
check("Virat Kohli (D1) still exists and can log in", s == 200 and r["user"]["name"] == "Virat Kohli" and r["user"]["driver_id"] == "D1", r)

print("== Lookup data ==")
s, locs = call("GET", "/api/locations")
check("GET /api/locations (15)", s == 200 and len(locs) == 15, locs)
s, zones = call("GET", "/api/zones")
check("GET /api/zones (6)", s == 200 and len(zones) == 6)
s, types = call("GET", "/api/ride-types")
check("GET /api/ride-types (4)", s == 200 and len(types) == 4)
s, promo = call("GET", "/api/promo/welcome20")
check("GET /api/promo/<code>", s == 200 and promo["discount_percent"] == 20)
s, _ = call("GET", "/api/promo/NOPE")
check("invalid promo -> 404", s == 404)

print("== Register / login ==")
tag = str(int(time.time()))
email = f"test{tag}@example.com"
s, r = call("POST", "/api/register", {"role": "rider", "name": "Test Rider", "email": email,
                                      "phone": "9000000001", "password": "secret1"})
check("register rider -> 201", s == 201 and r["user"]["user_id"], r)
test_rider = r["user"]["user_id"]
s, r = call("POST", "/api/register", {"role": "rider", "name": "Dup", "email": email,
                                      "phone": "1", "password": "secret1"})
check("duplicate email -> 409", s == 409)
s, r = call("POST", "/api/register", {"role": "rider", "name": "x"})
check("missing fields -> 400", s == 400)
s, r = call("POST", "/api/register", {"role": "driver", "name": "Test Driver", "phone": "8" + tag,
                                      "license_number": "TST-" + tag, "password": "secret1",
                                      "zone_id": "Z1", "plate_number": "TN00TEST" + tag[-3:],
                                      "model": "Test Car", "color": "Pink"})
check("register driver -> 201", s == 201 and r["user"]["zone_name"] == "T. Nagar", r)
test_driver_id = r["user"].get("driver_id")
s, r = call("POST", "/api/login", {"role": "rider", "identifier": email, "password": "secret1"})
check("login new rider", s == 200 and "password_hash" not in r["user"])
s, r = call("POST", "/api/login", {"role": "rider", "identifier": email, "password": "wrong"})
check("wrong password -> 401", s == 401)

s, r = call("POST", "/api/login", {"role": "rider", "identifier": "akhil@example.com", "password": "rider123"})
check("login demo rider", s == 200 and r["user"]["user_id"] == "U1", r)
rider = r["user"]["user_id"]
s, r = call("POST", "/api/login", {"role": "driver", "identifier": "9876500001", "password": "driver123"})
check("login demo driver (T. Nagar)", s == 200 and r["user"]["zone_id"] == "Z1", r)
driver1 = r["user"]["driver_id"]
s, r = call("POST", "/api/login", {"role": "driver", "identifier": "9876500003", "password": "driver123"})
other_zone_driver = r["user"]["driver_id"]  # Indiranagar driver
s, r = call("POST", "/api/login", {"role": "admin", "identifier": "prakash", "password": "admin123"})
check("login admin", s == 200 and r["role"] == "admin")
s, r = call("POST", "/api/login", {"role": "admin", "identifier": "prakash", "password": "bad"})
check("bad admin password -> 401", s == 401)

print("== Login errors and renamed drivers ==")
MSG = "Incorrect username or password. Please try again."
s, r = call("POST", "/api/login", {"role": "rider", "identifier": "akhil@example.com", "password": "wrong-password"})
check("wrong password -> 401 + message", s == 401 and r.get("error") == MSG, r)
s, r = call("POST", "/api/login", {"role": "rider", "identifier": "nobody@example.com", "password": "rider123"})
check("wrong username -> 401, SAME message", s == 401 and r.get("error") == MSG, r)
s, r = call("POST", "/api/login", {"role": "driver", "identifier": "0000000000", "password": "driver123"})
check("unknown driver phone -> 401, same message", s == 401 and r.get("error") == MSG, r)
s, r = call("POST", "/api/login", {"role": "driver", "identifier": "9876500001", "password": "nope"})
check("driver wrong password -> 401, same message", s == 401 and r.get("error") == MSG, r)
s, r = call("POST", "/api/login", {"role": "admin", "identifier": "prakash", "password": "nope"})
check("admin wrong password -> 401, same message", s == 401 and r.get("error") == MSG, r)
s, r = call("POST", "/api/login", {"role": "rider", "identifier": "akhil@example.com", "password": ""})
check("empty password -> 400", s == 400 and "enter" in r.get("error", ""), r)
s, r = call("POST", "/api/login", {"role": "rider", "password": "rider123"})
check("missing username -> 400", s == 400 and "enter" in r.get("error", ""), r)
s, r = call("POST", "/api/login", {"role": "rider"})
check("missing both fields -> 400", s == 400, r)
s, r = call("POST", "/api/login", {"role": "driver", "identifier": "9876500001", "password": "driver123"})
check("renamed driver D1 logs in as Virat Kohli", s == 200 and r["user"]["name"] == "Virat Kohli" and r["user"]["driver_id"] == "D1", r)
expected = ["Virat Kohli", "Rohit Sharma", "MS Dhoni", "Jasprit Bumrah", "Ravindra Jadeja",
            "Hardik Pandya", "Shubman Gill", "KL Rahul", "Rishabh Pant", "Suryakumar Yadav"]
names_ok = True
for i, nm in enumerate(expected, start=1):
    s, r = call("POST", "/api/login", {"role": "driver", "identifier": f"98765000{i:02d}", "password": "driver123"})
    names_ok = names_ok and s == 200 and r["user"]["name"] == nm and r["user"]["driver_id"] == f"D{i}"
check("all 10 drivers log in with their cricketer names", names_ok)
s, r = call("POST", "/api/register", {"role": "rider", "name": "Dup", "email": "akhil@example.com",
                                      "phone": "1", "password": "secret1"})
check("duplicate email message", s == 409 and r.get("error") == "That email is already registered", r)

print("== Fare estimate and ride request ==")
s, est = call("POST", "/api/fare-estimate", {"pickup_id": "L1", "dropoff_id": "L4", "ride_type_id": "RT1"})
check("fare estimate", s == 200 and est["distance_km"] > 0, est)
expected = round(40 + 12 * est["distance_km"], 2)
check("fare = base + per_km * distance", abs(est["fare_amount"] - expected) < 0.02, (est, expected))
s, est2 = call("POST", "/api/fare-estimate", {"pickup_id": "L1", "dropoff_id": "L4",
                                              "ride_type_id": "RT1", "promo_code": "WELCOME20"})
check("promo gives 20% off", abs(est2["fare_amount"] - round(expected * 0.8, 2)) < 0.02, est2)
s, _ = call("POST", "/api/fare-estimate", {"pickup_id": "L1", "dropoff_id": "L1", "ride_type_id": "RT1"})
check("same pickup/dropoff -> 400", s == 400)
s, _ = call("POST", "/api/rides", {"user_id": rider, "pickup_id": "L1", "dropoff_id": "L4",
                                   "ride_type_id": "RT1", "promo_code": "BADCODE"})
check("bad promo on request -> 404", s == 404)
s, _ = call("POST", "/api/rides", {"user_id": "NOBODY", "pickup_id": "L1", "dropoff_id": "L4", "ride_type_id": "RT1"})
check("unknown rider -> 404", s == 404)

s, nearby0 = call("GET", "/api/locations/L1/nearby-drivers")
check("nearby drivers by location", s == 200 and len(nearby0) >= 2, nearby0)

s, ride = call("POST", "/api/rides", {"user_id": rider, "pickup_id": "L1", "dropoff_id": "L4",
                                      "ride_type_id": "RT1", "promo_code": "WELCOME20"})
check("request ride -> 201", s == 201 and ride["status"] == "requested", ride)
rid = ride["ride_id"]
check("ride fare matches estimate", abs(ride["fare_amount"] - est2["fare_amount"]) < 0.01)

s, nearby = call("GET", f"/api/rides/{rid}/nearby-drivers")
ratings = [d["rating_avg"] for d in nearby]
check("nearby drivers sorted by rating",
      s == 200 and len(nearby) >= 2 and ratings == sorted(ratings, reverse=True), nearby)
s, reqs = call("GET", f"/api/drivers/{driver1}/requests")
check("driver sees request in own zone", s == 200 and any(x["ride_id"] == rid for x in reqs))
s, reqs2 = call("GET", f"/api/drivers/{other_zone_driver}/requests")
check("driver in other zone does NOT see it", s == 200 and not any(x["ride_id"] == rid for x in reqs2))

print("== Accept / complete / pay / rate ==")
s, r = call("POST", f"/api/rides/{rid}/accept", {"driver_id": other_zone_driver})
check("driver from other zone cannot accept -> 403", s == 403, r)
s, r = call("POST", f"/api/rides/{rid}/accept", {"driver_id": driver1})
check("accept ride", s == 200 and r["status"] == "accepted" and r["driver_id"] == driver1, r)
s, d = call("GET", f"/api/drivers/{driver1}")
check("driver is now busy", d["status"] == "busy")
s, r = call("POST", f"/api/rides/{rid}/accept", {"driver_id": driver1})
check("accepting twice -> 409", s == 409)
s, r = call("POST", f"/api/rides/{rid}/complete", {"driver_id": other_zone_driver})
check("wrong driver cannot complete -> 403", s == 403)
s, r = call("POST", f"/api/rides/{rid}/complete", {"driver_id": driver1})
check("complete ride creates pending payment",
      s == 200 and r["status"] == "completed" and r["payment_status"] == "pending", r)
s, d = call("GET", f"/api/drivers/{driver1}")
check("driver free again", d["status"] == "available")
s, r = call("POST", f"/api/rides/{rid}/pay", {"user_id": rider, "method": "bitcoin"})
check("bad payment method -> 400", s == 400)
s, r = call("POST", f"/api/rides/{rid}/pay", {"user_id": rider, "method": "upi"})
check("pay ride", s == 200 and r["payment_status"] == "paid" and r["payment_method"] == "upi", r)
s, r = call("POST", f"/api/rides/{rid}/pay", {"user_id": rider, "method": "upi"})
check("paying twice -> 409", s == 409)
s, r = call("POST", f"/api/rides/{rid}/rate", {"user_id": rider, "score": 5, "comment": "Great"})
check("rate ride -> 201", s == 201 and r["rating_score"] == 5, r)
s, r = call("POST", f"/api/rides/{rid}/rate", {"user_id": rider, "score": 4})
check("rating twice -> 409", s == 409)
s, r = call("POST", f"/api/rides/{rid}/rate", {"user_id": rider, "score": 9})
check("score 9 -> 400", s == 400)
s, d = call("GET", f"/api/drivers/{driver1}")
check("driver rating_avg updated", 0 < d["rating_avg"] <= 5, d)

print("== Cancellation flow ==")
s, ride2 = call("POST", "/api/rides", {"user_id": rider, "pickup_id": "L2", "dropoff_id": "L3", "ride_type_id": "RT4"})
rid2 = ride2["ride_id"]
s, r = call("POST", f"/api/rides/{rid2}/accept", {"driver_id": driver1})
check("accept second ride", s == 200)
s, d = call("GET", f"/api/drivers/{driver1}")
check("driver busy again", d["status"] == "busy")
s, r = call("POST", f"/api/rides/{rid2}/cancel", {"cancelled_by": "rider", "user_id": test_rider, "reason": "x"})
check("someone else's cancel -> 403", s == 403)
s, r = call("POST", f"/api/rides/{rid2}/cancel", {"cancelled_by": "rider", "user_id": rider, "reason": "Changed my mind"})
check("cancel ride", s == 200 and r["status"] == "cancelled" and r["cancel_reason"] == "Changed my mind", r)
s, d = call("GET", f"/api/drivers/{driver1}")
check("driver freed after cancel", d["status"] == "available")
s, r = call("POST", f"/api/rides/{rid2}/cancel", {"cancelled_by": "rider", "user_id": rider})
check("cancel twice -> 409", s == 409)
# Cancel a ride that nobody accepted yet
s, ride3 = call("POST", "/api/rides", {"user_id": rider, "pickup_id": "L7", "dropoff_id": "L8", "ride_type_id": "RT3"})
s, r = call("POST", f"/api/rides/{ride3['ride_id']}/cancel", {"cancelled_by": "rider", "user_id": rider})
check("cancel un-accepted ride", s == 200 and r["status"] == "cancelled")

print("== History, earnings, admin ==")
s, hist = call("GET", f"/api/users/{rider}/rides")
check("rider history", s == 200 and any(x["ride_id"] == rid for x in hist) and len(hist) >= 5)
s, de = call("GET", f"/api/drivers/{driver1}/rides")
check("driver rides + earnings", s == 200 and de["total_earnings"] >= ride["fare_amount"]
      and any(x["ride_id"] == rid for x in de["rides"]), de.get("total_earnings"))
s, _ = call("GET", "/api/users/NOPE/rides")
check("unknown user history -> 404", s == 404)
s, st = call("GET", "/api/admin/stats")
check("admin stats", s == 200 and st["total_rides"] >= 23 and st["cancellation_count"] >= 5
      and st["revenue"] > 0 and len(st["rides_per_zone"]) == 6 and st["top_drivers"], st)

# ---- clean up: delete everything this test run created, so the database is
# ---- exactly as it was before (uses the backend folder's db.py and queries.py)
try:
    from db import run_write
    import queries
    run_write("""MATCH (r:Ride) WHERE r.ride_id IN $ids
                 OPTIONAL MATCH (r)-[:PAID_BY]->(p) OPTIONAL MATCH (r)-[:HAS_RATING]->(rt)
                 OPTIONAL MATCH (r)-[:RESULTED_IN]->(c)
                 DETACH DELETE r, p, rt, c""", ids=[rid, rid2, ride3["ride_id"]])
    run_write("MATCH (u:User {user_id: $id}) DETACH DELETE u", id=test_rider)
    run_write("MATCH (d:Driver {driver_id: $id})-[:DRIVES]->(v) DETACH DELETE d, v", id=test_driver_id)
    run_write(queries.UPDATE_ALL_DRIVER_RATINGS)
    print("(test data cleaned up)")
except Exception as e:
    print("Could not clean up test data automatically:", e, "- run 'python seed.py --reset' if needed")


print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
