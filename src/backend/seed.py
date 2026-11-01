"""
seed.py - loads the Chennai demo data into Neo4j.

* Safe to run many times: it uses MERGE, so nothing is duplicated.
* This file is the ONLY source of the data, so the whole database can be
  rebuilt on any computer just by running it.
* Run  `python seed.py --reset`  to first DELETE EVERYTHING and start fresh.

Demo passwords (also listed in README.md):
  every rider  -> rider123      every driver -> driver123
"""
import sys
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

from db import driver, run_write
from utils import haversine_km, calc_fare

# ---------------------------------------------------------------------
# THE DATA
# ---------------------------------------------------------------------
ZONES = [
    ("Z1", "T. Nagar"), ("Z2", "Mylapore"), ("Z3", "Anna Nagar"),
    ("Z4", "Guindy"), ("Z5", "Velachery"), ("Z6", "Chennai Central"),
]

# (id, address, latitude, longitude, zone_id)
LOCATIONS = [
    ("L1", "Pondy Bazaar, T. Nagar", 13.0418, 80.2341, "Z1"),
    ("L2", "Panagal Park, T. Nagar", 13.0382, 80.2340, "Z1"),
    ("L3", "Mambalam Railway Station", 13.0383, 80.2203, "Z1"),
    ("L4", "Kapaleeshwarar Temple, Mylapore", 13.0337, 80.2697, "Z2"),
    ("L5", "Santhome Cathedral Basilica", 13.0336, 80.2792, "Z2"),
    ("L6", "Marina Lighthouse", 13.0409, 80.2825, "Z2"),
    ("L7", "Anna Nagar Tower Park", 13.0850, 80.2101, "Z3"),
    ("L8", "VR Chennai Mall, Anna Nagar", 13.0802, 80.2007, "Z3"),
    ("L9", "Koyambedu Bus Terminus (CMBT)", 13.0694, 80.1948, "Z3"),
    ("L10", "Guindy National Park", 13.0067, 80.2206, "Z4"),
    ("L11", "Chennai International Airport", 12.9941, 80.1709, "Z4"),
    ("L12", "Phoenix Marketcity, Velachery", 12.9926, 80.2180, "Z5"),
    ("L13", "Velachery MRTS Station", 12.9808, 80.2186, "Z5"),
    ("L14", "Chennai Central Railway Station", 13.0827, 80.2757, "Z6"),
    ("L15", "Government Museum, Egmore", 13.0732, 80.2564, "Z6"),
]

# (id, type_name, base_fare, per_km_rate)
RIDE_TYPES = [
    ("RT1", "Economy", 40.0, 12.0),
    ("RT2", "Premium", 80.0, 20.0),
    ("RT3", "Auto", 30.0, 10.0),
    ("RT4", "Bike", 20.0, 6.0),
]

# (id, code, discount_percent)
PROMOS = [("P1", "WELCOME20", 20), ("P2", "RIDE10", 10), ("P3", "SAVE15", 15)]

# (id, name, email, phone)  -- U1 is the demo rider
RIDERS = [
    ("U1", "Akhil", "akhil@example.com", "9876511001"),
    ("U2", "Priya Nair", "priya@example.com", "9876511002"),
    ("U3", "Arjun Reddy", "arjun@example.com", "9876511003"),
    ("U4", "Sneha Iyer", "sneha@example.com", "9876511004"),
    ("U5", "Vikram Singh", "vikram@example.com", "9876511005"),
    ("U6", "Ananya Gowda", "ananya@example.com", "9876511006"),
    ("U7", "Karthik Rao", "karthik@example.com", "9876511007"),
    ("U8", "Divya Menon", "divya@example.com", "9876511008"),
    ("U9", "Rohan Das", "rohan@example.com", "9876511009"),
    ("U10", "Meera Pillai", "meera@example.com", "9876511010"),
]

# (id, name, licence, phone, zone, plate, model, colour) -- D11 (Praveen) is the demo driver
DRIVERS = [
    ("D1", "Virat Kohli", "TN01-2015-0001", "9876500001", "Z1", "TN01AB1001", "Maruti Swift", "White"),
    ("D2", "Rohit Sharma", "TN01-2016-0002", "9876500002", "Z1", "TN01AB1002", "Hyundai i20", "Silver"),
    ("D3", "MS Dhoni", "TN03-2014-0003", "9876500003", "Z2", "TN03CD2003", "Toyota Etios", "White"),
    ("D4", "Jasprit Bumrah", "TN03-2017-0004", "9876500004", "Z2", "TN03CD2004", "Honda Amaze", "Grey"),
    ("D5", "Ravindra Jadeja", "TN51-2013-0005", "9876500005", "Z3", "TN51EF3005", "Maruti Dzire", "Blue"),
    ("D6", "Hardik Pandya", "TN51-2018-0006", "9876500006", "Z3", "TN51EF3006", "Tata Tiago", "Red"),
    ("D7", "Shubman Gill", "TN05-2015-0007", "9876500007", "Z4", "TN05GH4007", "Bajaj Auto", "Yellow"),
    ("D8", "KL Rahul", "TN05-2019-0008", "9876500008", "Z4", "TN05GH4008", "Hero Splendor", "Black"),
    ("D9", "Rishabh Pant", "TN02-2016-0009", "9876500009", "Z5", "TN02JK5009", "Toyota Innova", "Black"),
    ("D10", "Suryakumar Yadav", "TN04-2017-0010", "9876500010", "Z6", "TN04LM6010", "Honda City", "White"),
    # D11 Praveen is the DEMO DRIVER (login: phone 9876500011 / driver123).
    # He lives in T. Nagar (Z1), a busy zone with 3 pickup locations.
    ("D11", "Praveen", "TN01-2018-0011", "9876500011", "Z1", "TN01AB1011", "Hyundai Verna", "White"),
]

# 20 historical rides: (pickup, dropoff, ride_type, status, days_ago, promo, pay_method,
#                       rating_score, rating_comment, (cancel_reason, cancelled_by, driver_had_accepted))
RIDES = [
    ("L1", "L4", "RT1", "completed", 30, None, "upi", 5, "Smooth ride, polite driver", None),
    ("L2", "L12", "RT2", "completed", 28, "P2", "card", 4, "Comfortable car", None),
    ("L4", "L7", "RT1", "completed", 27, None, "cash", 4, "On time", None),
    ("L7", "L8", "RT3", "completed", 25, "P1", "upi", 5, "Quick trip", None),
    ("L10", "L11", "RT4", "cancelled", 24, None, None, None, None, ("Changed my plans", "rider", False)),
    ("L12", "L13", "RT1", "completed", 22, None, "upi", 3, "Driver took a longer route", None),
    ("L14", "L15", "RT2", "completed", 21, "P3", "card", 5, "Excellent service", None),
    ("L5", "L6", "RT3", "completed", 19, None, "cash", 4, "Good", None),
    ("L3", "L1", "RT4", "completed", 18, None, "upi", 5, "Very fast", None),
    ("L8", "L9", "RT1", "completed", 16, "P2", "upi", 4, "Nice driver", None),
    ("L15", "L14", "RT1", "completed", 15, None, "cash", 4, "Okay ride", None),
    ("L6", "L2", "RT1", "cancelled", 14, None, None, None, None, ("Driver taking too long", "rider", True)),
    ("L11", "L10", "RT3", "completed", 12, None, "cash", 3, "Auto was a bit noisy", None),
    ("L13", "L12", "RT2", "completed", 11, None, "card", 5, "Luxurious!", None),
    ("L1", "L5", "RT1", "completed", 9, "P1", "upi", 5, "Great", None),
    ("L9", "L7", "RT1", "completed", 7, None, "upi", 4, "Good ride", None),
    ("L4", "L6", "RT4", "completed", 5, None, "cash", 4, "Quick bike taxi", None),
    ("L12", "L1", "RT1", "cancelled", 4, None, None, None, None, ("Vehicle breakdown", "driver", True)),
    ("L2", "L3", "RT3", "completed", 2, None, "upi", 5, "Perfect", None),
    ("L14", "L7", "RT2", "completed", 1, None, "card", 4, "Long but comfortable ride", None),
]


# Praveen's (D11) completed rides: same tuple layout as RIDES. They are numbered
# R21..R24 and always use driver D11 (see ALL_RIDES below).
PRAVEEN_RIDES = [
    ("L1", "L5", "RT1", "completed", 8, None, "upi", 5, "Very professional driver", None),
    ("L2", "L4", "RT2", "completed", 6, "P2", "card", 5, "Spotless car, smooth driving", None),
    ("L3", "L7", "RT1", "completed", 3, None, "cash", 4, "Good ride", None),
    ("L1", "L14", "RT2", "completed", 1, None, "upi", 5, "Reached early, great service", None),
]


# ---------------------------------------------------------------------
# THE LOADING CODE
# ---------------------------------------------------------------------
def seed():
    # Hash the demo passwords once (never store plain passwords!)
    rider_hash = generate_password_hash("rider123")
    driver_hash = generate_password_hash("driver123")

    # 1. Uniqueness constraints: Neo4j will refuse duplicate ids from now on.
    for label, prop in [("User", "user_id"), ("Driver", "driver_id"), ("Vehicle", "vehicle_id"),
                        ("RideType", "ride_type_id"), ("Zone", "zone_id"), ("Location", "location_id"),
                        ("Ride", "ride_id"), ("Payment", "payment_id"), ("Rating", "rating_id"),
                        ("PromoCode", "promo_id"), ("Cancellation", "cancellation_id")]:
        run_write(f"CREATE CONSTRAINT {label.lower()}_{prop} IF NOT EXISTS "
                  f"FOR (n:{label}) REQUIRE n.{prop} IS UNIQUE")

    # 2. Zones, locations, ride types, promos.
    #    MERGE finds the node by id or creates it; ON CREATE SET fills in
    #    the other properties only when it was newly created.
    for zid, name in ZONES:
        run_write("MERGE (z:Zone {zone_id: $id}) ON CREATE SET z.zone_name = $name, z.city = 'Chennai'",
                  id=zid, name=name)
    for lid, addr, lat, lon, zid in LOCATIONS:
        run_write("""MERGE (l:Location {location_id: $id})
                     ON CREATE SET l.address = $addr, l.latitude = $lat, l.longitude = $lon
                     WITH l MATCH (z:Zone {zone_id: $zid}) MERGE (l)-[:IN_ZONE]->(z)""",
                  id=lid, addr=addr, lat=lat, lon=lon, zid=zid)
    for rid, name, base, per_km in RIDE_TYPES:
        run_write("MERGE (t:RideType {ride_type_id: $id}) "
                  "ON CREATE SET t.type_name = $name, t.base_fare = $base, t.per_km_rate = $per_km",
                  id=rid, name=name, base=base, per_km=per_km)
    for pid, code, pct in PROMOS:
        run_write("MERGE (p:PromoCode {promo_id: $id}) ON CREATE SET p.code = $code, p.discount_percent = $pct",
                  id=pid, code=code, pct=pct)

    # 3. Riders
    for uid, name, email, phone in RIDERS:
        run_write("MERGE (u:User {user_id: $id}) ON CREATE SET u.name = $name, u.email = $email, "
                  "u.phone = $phone, u.password_hash = $pw",
                  id=uid, name=name, email=email, phone=phone, pw=rider_hash)

    # 4. Drivers, each with a Vehicle and a Zone
    for did, name, lic, phone, zid, plate, model, color in DRIVERS:
        run_write("""MERGE (d:Driver {driver_id: $id})
                     ON CREATE SET d.name = $name, d.license_number = $lic, d.phone = $phone,
                                   d.rating_avg = 4.5, d.status = 'available', d.password_hash = $pw
                     MERGE (v:Vehicle {vehicle_id: $vid})
                     ON CREATE SET v.plate_number = $plate, v.model = $model, v.color = $color
                     MERGE (d)-[:DRIVES]->(v)
                     WITH d MATCH (z:Zone {zone_id: $zid}) MERGE (d)-[:LOCATED_IN]->(z)""",
                  id=did, name=name, lic=lic, phone=phone, pw=driver_hash,
                  vid="V" + did[1:], plate=plate, model=model, color=color, zid=zid)

    # 5. Historical rides
    loc = {l[0]: l for l in LOCATIONS}
    types = {t[0]: t for t in RIDE_TYPES}
    promos = {p[0]: p for p in PROMOS}
    zone_drivers = {}
    for d in DRIVERS[:10]:   # only the original 10: keeps the old ride -> driver mapping unchanged
        zone_drivers.setdefault(d[4], []).append(d[0])
    today = datetime.now().replace(microsecond=0)

    # (ride tuple, forced driver id or None) - old rides pick their driver by rotation
    all_rides = [(r, None) for r in RIDES] + [(r, "D11") for r in PRAVEEN_RIDES]

    for i, (ride, forced_driver) in enumerate(all_rides, start=1):
        pick, drop, rt, status, days_ago, promo, method, score, comment, cancel = ride
        ride_id = f"R{i}"
        rider_id = RIDERS[(i - 1) % len(RIDERS)][0]
        # The driver comes from the pickup zone (rotating through that zone's drivers)
        zone_list = zone_drivers[loc[pick][4]]
        driver_id = forced_driver or zone_list[i % len(zone_list)]

        dist = round(haversine_km(loc[pick][2], loc[pick][3], loc[drop][2], loc[drop][3]), 2)
        discount = promos[promo][2] if promo else 0
        _, fare = calc_fare(types[rt][2], types[rt][3], dist, discount)
        when = (today - timedelta(days=days_ago, hours=i % 5)).isoformat()

        run_write("""
            MERGE (r:Ride {ride_id: $rid})
            ON CREATE SET r.requested_at = $when, r.status = $status,
                          r.distance_km = $dist, r.fare_amount = $fare
            WITH r
            MATCH (u:User {user_id: $uid}), (t:RideType {ride_type_id: $rt}),
                  (pl:Location {location_id: $pick}), (dl:Location {location_id: $drop})
            MERGE (u)-[:REQUESTED]->(r)
            MERGE (r)-[:OF_TYPE]->(t)
            MERGE (r)-[:PICKUP_AT]->(pl)
            MERGE (r)-[:DROPOFF_AT]->(dl)""",
                  rid=ride_id, when=when, status=status, dist=dist, fare=fare,
                  uid=rider_id, rt=rt, pick=pick, drop=drop)

        if promo:
            run_write("MATCH (r:Ride {ride_id: $rid}), (p:PromoCode {promo_id: $p}) MERGE (r)-[:APPLIES]->(p)",
                      rid=ride_id, p=promo)

        if status == "completed":
            run_write("MATCH (d:Driver {driver_id: $d}), (r:Ride {ride_id: $rid}) MERGE (d)-[:ACCEPTED]->(r)",
                      d=driver_id, rid=ride_id)
            run_write("""MATCH (r:Ride {ride_id: $rid})
                         MERGE (p:Payment {payment_id: $pid})
                         ON CREATE SET p.amount = $fare, p.method = $method, p.status = 'paid'
                         MERGE (r)-[:PAID_BY]->(p)""",
                      rid=ride_id, pid=f"PAY{i}", fare=fare, method=method)
            run_write("""MATCH (r:Ride {ride_id: $rid})
                         MERGE (rt:Rating {rating_id: $xid})
                         ON CREATE SET rt.score = $score, rt.comment = $comment
                         MERGE (r)-[:HAS_RATING]->(rt)""",
                      rid=ride_id, xid=f"RT{i}", score=score, comment=comment)
        else:  # cancelled
            reason, by, had_driver = cancel
            if had_driver:
                run_write("MATCH (d:Driver {driver_id: $d}), (r:Ride {ride_id: $rid}) MERGE (d)-[:ACCEPTED]->(r)",
                          d=driver_id, rid=ride_id)
            run_write("""MATCH (r:Ride {ride_id: $rid})
                         MERGE (c:Cancellation {cancellation_id: $cid})
                         ON CREATE SET c.reason = $reason, c.cancelled_by = $by
                         MERGE (r)-[:RESULTED_IN]->(c)""",
                      rid=ride_id, cid=f"C{i}", reason=reason, by=by)

    # 6. Driver rating_avg = average of the ratings their rides received
    run_write("""MATCH (d:Driver)-[:ACCEPTED]->(:Ride)-[:HAS_RATING]->(rt:Rating)
                 WITH d, avg(rt.score) AS average
                 SET d.rating_avg = round(average * 100) / 100.0""")


if __name__ == "__main__":
    try:
        if "--reset" in sys.argv:
            print("Deleting ALL existing data ...")
            run_write("MATCH (n) DETACH DELETE n")
        print("Seeding RideGraph data ...")
        seed()
        summary = driver.execute_query("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS n ORDER BY label")
        for rec in summary.records:
            print(f"  {rec['label']:<13} {rec['n']}")
        print("Done.")
    except Exception as e:
        print("\nSEED FAILED:", e)
        print("Is Neo4j running? Open Neo4j Desktop and click Start on 'ridegraph-db'.")
        sys.exit(1)
    finally:
        driver.close()
