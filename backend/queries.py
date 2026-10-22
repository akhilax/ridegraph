"""
queries.py - ALL Cypher queries of RideGraph live here.
Every query uses $parameters (never string concatenation of user input),
which protects us from Cypher-injection, the graph version of SQL-injection.

Quick Cypher reminder:
  (a:Label {prop: value})   a node          -[:REL]->   a relationship
  MATCH  = find a pattern   MERGE = find it or create it   CREATE = always create
"""

# =====================================================================
# 1. USERS AND DRIVERS (register / login)
# =====================================================================

# Find a rider by email (used for login and to check duplicates).
GET_USER_BY_EMAIL = """
MATCH (u:User {email: $email})
RETURN u.user_id AS user_id, u.name AS name, u.email AS email,
       u.phone AS phone, u.password_hash AS password_hash
"""

GET_USER_BY_ID = """
MATCH (u:User {user_id: $user_id})
RETURN u.user_id AS user_id, u.name AS name, u.email AS email, u.phone AS phone
"""

# Create a new rider node.
CREATE_USER = """
CREATE (u:User {user_id: $user_id, name: $name, email: $email,
                phone: $phone, password_hash: $password_hash})
RETURN u.user_id AS user_id, u.name AS name, u.email AS email, u.phone AS phone
"""

# Find a driver by phone number (drivers log in with phone) + vehicle + zone.
GET_DRIVER_BY_PHONE = """
MATCH (d:Driver {phone: $phone})
OPTIONAL MATCH (d)-[:DRIVES]->(v:Vehicle)
OPTIONAL MATCH (d)-[:LOCATED_IN]->(z:Zone)
RETURN d.driver_id AS driver_id, d.name AS name, d.phone AS phone,
       d.license_number AS license_number, d.rating_avg AS rating_avg,
       d.status AS status, d.password_hash AS password_hash,
       v.plate_number AS plate_number, v.model AS model, v.color AS color,
       z.zone_id AS zone_id, z.zone_name AS zone_name
"""

GET_DRIVER_BY_ID = """
MATCH (d:Driver {driver_id: $driver_id})
OPTIONAL MATCH (d)-[:DRIVES]->(v:Vehicle)
OPTIONAL MATCH (d)-[:LOCATED_IN]->(z:Zone)
RETURN d.driver_id AS driver_id, d.name AS name, d.phone AS phone,
       d.license_number AS license_number, d.rating_avg AS rating_avg,
       d.status AS status,
       v.plate_number AS plate_number, v.model AS model, v.color AS color,
       z.zone_id AS zone_id, z.zone_name AS zone_name
"""

# Is the licence number already registered?
GET_DRIVER_BY_LICENSE = """
MATCH (d:Driver {license_number: $license_number}) RETURN d.driver_id AS driver_id
"""

# Create a driver + their vehicle + link to their zone, all in one query.
# The zone must already exist (MATCH), otherwise nothing is created.
CREATE_DRIVER = """
MATCH (z:Zone {zone_id: $zone_id})
CREATE (d:Driver {driver_id: $driver_id, name: $name, license_number: $license_number,
                  phone: $phone, rating_avg: 0.0, status: 'available',
                  password_hash: $password_hash})
CREATE (v:Vehicle {vehicle_id: $vehicle_id, plate_number: $plate_number,
                   model: $model, color: $color})
CREATE (d)-[:DRIVES]->(v)
CREATE (d)-[:LOCATED_IN]->(z)
RETURN d.driver_id AS driver_id
"""

# =====================================================================
# 2. LOOKUP DATA (locations, zones, ride types, promo)
# =====================================================================

# All locations together with the zone they belong to.
LIST_LOCATIONS = """
MATCH (l:Location)-[:IN_ZONE]->(z:Zone)
RETURN l.location_id AS location_id, l.address AS address,
       l.latitude AS latitude, l.longitude AS longitude,
       z.zone_id AS zone_id, z.zone_name AS zone_name
ORDER BY z.zone_name, l.address
"""

LIST_ZONES = """
MATCH (z:Zone)
RETURN z.zone_id AS zone_id, z.zone_name AS zone_name, z.city AS city
ORDER BY z.zone_name
"""

LIST_RIDE_TYPES = """
MATCH (t:RideType)
RETURN t.ride_type_id AS ride_type_id, t.type_name AS type_name,
       t.base_fare AS base_fare, t.per_km_rate AS per_km_rate
ORDER BY t.base_fare
"""

# Look up a promo code (case-insensitive).
GET_PROMO = """
MATCH (p:PromoCode)
WHERE toUpper(p.code) = toUpper($code)
RETURN p.promo_id AS promo_id, p.code AS code, p.discount_percent AS discount_percent
"""

# Get one location (we need its lat/long for the distance calculation).
GET_LOCATION = """
MATCH (l:Location {location_id: $location_id})
RETURN l.location_id AS location_id, l.address AS address,
       l.latitude AS latitude, l.longitude AS longitude
"""

GET_RIDE_TYPE = """
MATCH (t:RideType {ride_type_id: $ride_type_id})
RETURN t.ride_type_id AS ride_type_id, t.type_name AS type_name,
       t.base_fare AS base_fare, t.per_km_rate AS per_km_rate
"""

# =====================================================================
# 3. RIDES
# =====================================================================

# Create a ride and connect it to the rider, ride type, pickup and dropoff
# nodes. An optional promo is linked afterwards with LINK_PROMO.
# This is the heart of the graph model: one Ride node, many relationships.
CREATE_RIDE = """
MATCH (u:User {user_id: $user_id})
MATCH (t:RideType {ride_type_id: $ride_type_id})
MATCH (pl:Location {location_id: $pickup_id})
MATCH (dl:Location {location_id: $dropoff_id})
CREATE (r:Ride {ride_id: $ride_id, requested_at: $requested_at, status: 'requested',
                distance_km: $distance_km, fare_amount: $fare_amount})
CREATE (u)-[:REQUESTED]->(r)
CREATE (r)-[:OF_TYPE]->(t)
CREATE (r)-[:PICKUP_AT]->(pl)
CREATE (r)-[:DROPOFF_AT]->(dl)
RETURN r.ride_id AS ride_id
"""

# Attach a promo code to a ride.
LINK_PROMO = """
MATCH (r:Ride {ride_id: $ride_id}), (p:PromoCode {promo_id: $promo_id})
MERGE (r)-[:APPLIES]->(p)
"""

# Reusable "give me everything about this ride" tail. It is appended to
# queries that already have a ride variable `r`. OPTIONAL MATCH is like a
# SQL LEFT JOIN: if the driver/payment/rating doesn't exist yet we get null.
RIDE_DETAIL = """
MATCH (rider:User)-[:REQUESTED]->(r)
MATCH (r)-[:OF_TYPE]->(t:RideType)
MATCH (r)-[:PICKUP_AT]->(pl:Location)
MATCH (r)-[:DROPOFF_AT]->(dl:Location)
OPTIONAL MATCH (drv:Driver)-[:ACCEPTED]->(r)
OPTIONAL MATCH (drv)-[:DRIVES]->(v:Vehicle)
OPTIONAL MATCH (r)-[:PAID_BY]->(pay:Payment)
OPTIONAL MATCH (r)-[:HAS_RATING]->(rt:Rating)
OPTIONAL MATCH (r)-[:APPLIES]->(pc:PromoCode)
OPTIONAL MATCH (r)-[:RESULTED_IN]->(c:Cancellation)
RETURN r.ride_id AS ride_id, r.requested_at AS requested_at, r.status AS status,
       r.distance_km AS distance_km, r.fare_amount AS fare_amount,
       rider.user_id AS user_id, rider.name AS rider_name, rider.phone AS rider_phone,
       t.type_name AS ride_type,
       pl.location_id AS pickup_id, pl.address AS pickup,
       dl.location_id AS dropoff_id, dl.address AS dropoff,
       drv.driver_id AS driver_id, drv.name AS driver_name, drv.phone AS driver_phone,
       drv.rating_avg AS driver_rating,
       v.model AS vehicle_model, v.plate_number AS plate_number, v.color AS vehicle_color,
       pay.payment_id AS payment_id, pay.status AS payment_status,
       pay.method AS payment_method, pay.amount AS payment_amount,
       rt.score AS rating_score, rt.comment AS rating_comment,
       pc.code AS promo_code, pc.discount_percent AS promo_percent,
       c.reason AS cancel_reason, c.cancelled_by AS cancelled_by
"""

# One ride by id.
GET_RIDE = "MATCH (r:Ride {ride_id: $ride_id})\n" + RIDE_DETAIL

# A rider's ride history, newest first.
RIDES_OF_USER = ("MATCH (:User {user_id: $user_id})-[:REQUESTED]->(r:Ride)\n"
                 + RIDE_DETAIL + "\nORDER BY r.requested_at DESC")

# A driver's accepted rides, newest first.
RIDES_OF_DRIVER = ("MATCH (:Driver {driver_id: $driver_id})-[:ACCEPTED]->(r:Ride)\n"
                   + RIDE_DETAIL + "\nORDER BY r.requested_at DESC")

# Open requests a driver can accept: status 'requested' AND the pickup
# location lies in the same zone as the driver. We walk the graph:
# Driver -> Zone <- Location <- Ride.
OPEN_REQUESTS_FOR_DRIVER = ("""
MATCH (:Driver {driver_id: $driver_id})-[:LOCATED_IN]->(:Zone)
      <-[:IN_ZONE]-(:Location)<-[:PICKUP_AT]-(r:Ride {status: 'requested'})
""" + RIDE_DETAIL + "\nORDER BY r.requested_at")

# Driver earnings = sum of fares of the driver's completed rides.
DRIVER_EARNINGS = """
MATCH (:Driver {driver_id: $driver_id})-[:ACCEPTED]->(r:Ride {status: 'completed'})
RETURN coalesce(sum(r.fare_amount), 0.0) AS total_earnings, count(r) AS completed_rides
"""

# Available drivers in a given location's zone, best rated first.
NEARBY_DRIVERS_BY_LOCATION = """
MATCH (:Location {location_id: $location_id})-[:IN_ZONE]->(z:Zone)
      <-[:LOCATED_IN]-(d:Driver {status: 'available'})
MATCH (d)-[:DRIVES]->(v:Vehicle)
RETURN d.driver_id AS driver_id, d.name AS name, d.rating_avg AS rating_avg,
       v.model AS model, v.plate_number AS plate_number, v.color AS color,
       z.zone_name AS zone_name
ORDER BY d.rating_avg DESC
"""

# Same thing, but starting from a ride (uses the ride's pickup location).
NEARBY_DRIVERS_BY_RIDE = """
MATCH (:Ride {ride_id: $ride_id})-[:PICKUP_AT]->(:Location)-[:IN_ZONE]->(z:Zone)
      <-[:LOCATED_IN]-(d:Driver {status: 'available'})
MATCH (d)-[:DRIVES]->(v:Vehicle)
RETURN d.driver_id AS driver_id, d.name AS name, d.rating_avg AS rating_avg,
       v.model AS model, v.plate_number AS plate_number, v.color AS color,
       z.zone_name AS zone_name
ORDER BY d.rating_avg DESC
"""

# Driver accepts a ride. The pattern makes it safe: it only matches if the
# ride is still 'requested', the driver is 'available' and the driver's zone is
# the pickup zone. If it returns no row, nothing was changed.
ACCEPT_RIDE = """
MATCH (d:Driver {driver_id: $driver_id, status: 'available'})-[:LOCATED_IN]->(z:Zone)
MATCH (r:Ride {ride_id: $ride_id, status: 'requested'})-[:PICKUP_AT]->(:Location)-[:IN_ZONE]->(z)
SET r.status = 'accepted', d.status = 'busy'
CREATE (d)-[:ACCEPTED]->(r)
RETURN r.ride_id AS ride_id
"""

# Complete a ride: status -> completed, driver free again, and a Payment node
# is created and linked with PAID_BY. Only the driver who accepted may do it.
COMPLETE_RIDE = """
MATCH (d:Driver {driver_id: $driver_id})-[:ACCEPTED]->(r:Ride {ride_id: $ride_id, status: 'accepted'})
SET r.status = 'completed', d.status = 'available'
CREATE (p:Payment {payment_id: $payment_id, amount: r.fare_amount,
                   method: 'unpaid', status: 'pending'})
CREATE (r)-[:PAID_BY]->(p)
RETURN r.ride_id AS ride_id
"""

# Rider pays: the pending Payment becomes paid with the chosen method.
PAY_RIDE = """
MATCH (:User {user_id: $user_id})-[:REQUESTED]->(r:Ride {ride_id: $ride_id, status: 'completed'})
      -[:PAID_BY]->(p:Payment {status: 'pending'})
SET p.status = 'paid', p.method = $method
RETURN p.payment_id AS payment_id
"""

# Cancel a ride (requested or accepted). Creates a Cancellation node. If a
# driver had accepted, that driver becomes available again.
# OPTIONAL MATCH keeps the row even when no driver is attached yet.
CANCEL_RIDE = """
MATCH (r:Ride {ride_id: $ride_id})
WHERE r.status IN ['requested', 'accepted']
OPTIONAL MATCH (d:Driver)-[:ACCEPTED]->(r)
SET r.status = 'cancelled'
FOREACH (x IN CASE WHEN d IS NULL THEN [] ELSE [d] END | SET x.status = 'available')
CREATE (c:Cancellation {cancellation_id: $cancellation_id, reason: $reason,
                        cancelled_by: $cancelled_by})
CREATE (r)-[:RESULTED_IN]->(c)
RETURN r.ride_id AS ride_id
"""

# Rate a completed ride (only once, only by the rider who booked it).
CREATE_RATING = """
MATCH (:User {user_id: $user_id})-[:REQUESTED]->(r:Ride {ride_id: $ride_id, status: 'completed'})
WHERE NOT (r)-[:HAS_RATING]->(:Rating)
CREATE (rt:Rating {rating_id: $rating_id, score: $score, comment: $comment})
CREATE (r)-[:HAS_RATING]->(rt)
RETURN rt.rating_id AS rating_id
"""

# Recalculate a driver's average rating from ALL ratings on rides they accepted.
UPDATE_DRIVER_RATING = """
MATCH (d:Driver {driver_id: $driver_id})-[:ACCEPTED]->(:Ride)-[:HAS_RATING]->(rt:Rating)
WITH d, avg(rt.score) AS average
SET d.rating_avg = round(average * 100) / 100.0
RETURN d.rating_avg AS rating_avg
"""

# Same recalculation for every driver (used by seed.py).
UPDATE_ALL_DRIVER_RATINGS = """
MATCH (d:Driver)-[:ACCEPTED]->(:Ride)-[:HAS_RATING]->(rt:Rating)
WITH d, avg(rt.score) AS average
SET d.rating_avg = round(average * 100) / 100.0
"""

# Which driver handled this ride?
DRIVER_OF_RIDE = """
MATCH (d:Driver)-[:ACCEPTED]->(:Ride {ride_id: $ride_id})
RETURN d.driver_id AS driver_id
"""

# =====================================================================
# 4. ADMIN STATISTICS
# =====================================================================

# Totals over all Ride nodes (revenue counts completed rides only).
STAT_TOTALS = """
MATCH (r:Ride)
RETURN count(r) AS total_rides,
       sum(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) AS completed_rides,
       sum(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_rides,
       sum(CASE WHEN r.status = 'completed' THEN r.fare_amount ELSE 0 END) AS revenue
"""

# Rides per zone: group rides by the zone of their pickup location.
STAT_RIDES_PER_ZONE = """
MATCH (z:Zone)
OPTIONAL MATCH (z)<-[:IN_ZONE]-(:Location)<-[:PICKUP_AT]-(r:Ride)
RETURN z.zone_name AS zone_name, count(r) AS rides
ORDER BY rides DESC, zone_name
"""

# Top drivers by rating, with number of completed rides.
STAT_TOP_DRIVERS = """
MATCH (d:Driver)-[:ACCEPTED]->(r:Ride {status: 'completed'})
RETURN d.driver_id AS driver_id, d.name AS name, d.rating_avg AS rating_avg,
       count(r) AS completed_rides
ORDER BY d.rating_avg DESC, completed_rides DESC
LIMIT 5
"""

# Number of Cancellation nodes, split by who cancelled.
STAT_CANCELLATIONS = """
MATCH (c:Cancellation)
RETURN c.cancelled_by AS cancelled_by, count(c) AS n
"""

# Head-count of riders and drivers.
STAT_COUNTS = """
MATCH (u:User) WITH count(u) AS riders
MATCH (d:Driver)
RETURN riders, count(d) AS drivers
"""
