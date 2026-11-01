// =====================================================================
// RideGraph - queries.cypher
// The important Cypher operations used by the application (src/backend/queries.py),
// written with literal values so each one can be run directly in Neo4j Browser.
// Run schema.cypher and sample_data.cypher first.
// For each query, the SQL feature it corresponds to is noted in [brackets].
// =====================================================================


// ---------------------------------------------------------------------
// A. CREATE / READ / UPDATE / DELETE        [INSERT, SELECT, UPDATE, DELETE]
// ---------------------------------------------------------------------

// A1. INSERT - register a new rider.  (app: CREATE_USER)
CREATE (u:User {user_id: 'U900', name: 'Demo Student', email: 'demo.student@example.com',
                phone: '9000000900', password_hash: 'hash-created-by-the-app'})
RETURN u.user_id, u.name;

// A2. INSERT with relationships - a rider requests a ride.  (app: CREATE_RIDE)
// MATCH finds the four existing nodes; if any is missing nothing is created.
MATCH (u:User {user_id: 'U900'})
MATCH (t:RideType {ride_type_id: 'RT1'})
MATCH (pl:Location {location_id: 'L1'})
MATCH (dl:Location {location_id: 'L4'})
CREATE (r:Ride {ride_id: 'R900', requested_at: toString(localdatetime()), status: 'requested',
                distance_km: 3.96, fare_amount: 87.52})
CREATE (u)-[:REQUESTED]->(r)
CREATE (r)-[:OF_TYPE]->(t)
CREATE (r)-[:PICKUP_AT]->(pl)
CREATE (r)-[:DROPOFF_AT]->(dl)
RETURN r.ride_id, r.status;

// A3. SELECT - one ride with all its details.  (app: GET_RIDE)
// OPTIONAL MATCH behaves like LEFT JOIN: missing driver/payment/rating -> null.
MATCH (r:Ride {ride_id: 'R1'})
MATCH (rider:User)-[:REQUESTED]->(r)
MATCH (r)-[:OF_TYPE]->(t:RideType)
MATCH (r)-[:PICKUP_AT]->(pl:Location)
MATCH (r)-[:DROPOFF_AT]->(dl:Location)
OPTIONAL MATCH (drv:Driver)-[:ACCEPTED]->(r)
OPTIONAL MATCH (drv)-[:DRIVES]->(v:Vehicle)
OPTIONAL MATCH (r)-[:PAID_BY]->(pay:Payment)
OPTIONAL MATCH (r)-[:HAS_RATING]->(rt:Rating)
RETURN r.ride_id, rider.name AS rider, t.type_name AS ride_type,
       pl.address AS pickup, dl.address AS dropoff,
       drv.name AS driver, v.model AS vehicle, r.fare_amount AS fare,
       pay.status AS payment, rt.score AS rating;

// A4. UPDATE (safe, conditional) - a driver accepts the ride.  (app: ACCEPT_RIDE)
// Only matches if the ride is still 'requested', the driver is 'available' and
// both are in the same zone z. If another driver accepted first, nothing changes.
MATCH (d:Driver {driver_id: 'D11', status: 'available'})-[:LOCATED_IN]->(z:Zone)
MATCH (r:Ride {ride_id: 'R900', status: 'requested'})-[:PICKUP_AT]->(:Location)-[:IN_ZONE]->(z)
SET r.status = 'accepted', d.status = 'busy'
CREATE (d)-[:ACCEPTED]->(r)
RETURN r.ride_id, r.status, d.name, d.status;

// A5. UPDATE + INSERT - the driver completes the ride; a pending Payment is created.  (app: COMPLETE_RIDE)
MATCH (d:Driver {driver_id: 'D11'})-[:ACCEPTED]->(r:Ride {ride_id: 'R900', status: 'accepted'})
SET r.status = 'completed', d.status = 'available'
CREATE (p:Payment {payment_id: 'PAY900', amount: r.fare_amount, method: 'unpaid', status: 'pending'})
CREATE (r)-[:PAID_BY]->(p)
RETURN r.status, p.payment_id, p.amount;

// A6. UPDATE - the rider pays.  (app: PAY_RIDE)
MATCH (:User {user_id: 'U900'})-[:REQUESTED]->(r:Ride {ride_id: 'R900', status: 'completed'})
      -[:PAID_BY]->(p:Payment {status: 'pending'})
SET p.status = 'paid', p.method = 'upi'
RETURN p.payment_id, p.status, p.method;

// A7. INSERT with a NOT EXISTS check - rate a ride only once.  (app: CREATE_RATING)
MATCH (:User {user_id: 'U900'})-[:REQUESTED]->(r:Ride {ride_id: 'R900', status: 'completed'})
WHERE NOT (r)-[:HAS_RATING]->(:Rating)
CREATE (rt:Rating {rating_id: 'RT900', score: 5, comment: 'Great demo ride'})
CREATE (r)-[:HAS_RATING]->(rt)
RETURN rt.rating_id, rt.score;

// A8. UPDATE with aggregation - recompute the driver's average rating.  (app: UPDATE_DRIVER_RATING)
MATCH (d:Driver {driver_id: 'D11'})-[:ACCEPTED]->(:Ride)-[:HAS_RATING]->(rt:Rating)
WITH d, avg(rt.score) AS average
SET d.rating_avg = round(average * 100) / 100.0
RETURN d.name, d.rating_avg;

// A9. DELETE - remove the demo rider, ride and everything created above.
// DETACH DELETE removes a node together with its relationships (like ON DELETE CASCADE).
MATCH (r:Ride {ride_id: 'R900'})
OPTIONAL MATCH (r)-[:PAID_BY|HAS_RATING|RESULTED_IN]->(x)
DETACH DELETE r, x;
MATCH (u:User {user_id: 'U900'}) DETACH DELETE u;

// A10. UPDATE - recompute the driver's rating now that the demo rating is gone.
MATCH (d:Driver {driver_id: 'D11'})-[:ACCEPTED]->(:Ride)-[:HAS_RATING]->(rt:Rating)
WITH d, avg(rt.score) AS average
SET d.rating_avg = round(average * 100) / 100.0
RETURN d.name, d.rating_avg;


// ---------------------------------------------------------------------
// B. TRAVERSALS                              [multi-table JOINs]
// ---------------------------------------------------------------------

// B1. Available drivers in the pickup zone, best rated first.  (app: NEARBY_DRIVERS_BY_LOCATION)
// SQL would need Location JOIN Zone JOIN Driver JOIN Vehicle.
MATCH (:Location {location_id: 'L1'})-[:IN_ZONE]->(z:Zone)
      <-[:LOCATED_IN]-(d:Driver {status: 'available'})
MATCH (d)-[:DRIVES]->(v:Vehicle)
RETURN d.name, d.rating_avg, v.model, v.plate_number, z.zone_name
ORDER BY d.rating_avg DESC;

// B2. Open ride requests a driver can see (rides picked up in the driver's zone).  (app: OPEN_REQUESTS_FOR_DRIVER)
MATCH (:Driver {driver_id: 'D11'})-[:LOCATED_IN]->(:Zone)
      <-[:IN_ZONE]-(:Location)<-[:PICKUP_AT]-(r:Ride {status: 'requested'})
RETURN r.ride_id, r.requested_at, r.fare_amount
ORDER BY r.requested_at;

// B3. A rider's ride history, newest first.  (app: RIDES_OF_USER)
MATCH (:User {user_id: 'U1'})-[:REQUESTED]->(r:Ride)
MATCH (r)-[:PICKUP_AT]->(pl:Location), (r)-[:DROPOFF_AT]->(dl:Location)
OPTIONAL MATCH (d:Driver)-[:ACCEPTED]->(r)
RETURN r.ride_id, r.status, pl.address AS pickup, dl.address AS dropoff, d.name AS driver, r.fare_amount
ORDER BY r.requested_at DESC;

// B4. Multi-hop: drivers who have already served this rider before (repeat drivers).
MATCH (:User {user_id: 'U1'})-[:REQUESTED]->(:Ride)<-[:ACCEPTED]-(d:Driver)
RETURN d.name, count(*) AS rides_together
ORDER BY rides_together DESC;


// ---------------------------------------------------------------------
// C. AGGREGATION / GROUPING                  [GROUP BY, SUM, COUNT, AVG, CASE]
// Cypher groups automatically by the non-aggregated columns.
// ---------------------------------------------------------------------

// C1. Totals and revenue.  (app: STAT_TOTALS)
MATCH (r:Ride)
RETURN count(r) AS total_rides,
       sum(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) AS completed_rides,
       sum(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_rides,
       round(sum(CASE WHEN r.status = 'completed' THEN r.fare_amount ELSE 0 END) * 100) / 100.0 AS revenue;

// C2. Rides per zone, zones with 0 rides included.  (app: STAT_RIDES_PER_ZONE)  [LEFT JOIN + GROUP BY]
MATCH (z:Zone)
OPTIONAL MATCH (z)<-[:IN_ZONE]-(:Location)<-[:PICKUP_AT]-(r:Ride)
RETURN z.zone_name AS zone_name, count(r) AS rides
ORDER BY rides DESC, zone_name;

// C3. Top 5 drivers by rating with completed ride count.  (app: STAT_TOP_DRIVERS)
MATCH (d:Driver)-[:ACCEPTED]->(r:Ride {status: 'completed'})
RETURN d.name, d.rating_avg, count(r) AS completed_rides
ORDER BY d.rating_avg DESC, completed_rides DESC
LIMIT 5;

// C4. Driver earnings.  (app: DRIVER_EARNINGS)
MATCH (:Driver {driver_id: 'D11'})-[:ACCEPTED]->(r:Ride {status: 'completed'})
RETURN coalesce(sum(r.fare_amount), 0.0) AS total_earnings, count(r) AS completed_rides;

// C5. Cancellations split by who cancelled.  (app: STAT_CANCELLATIONS)
MATCH (c:Cancellation)
RETURN c.cancelled_by, count(c) AS n;

// C6. Revenue and average fare per ride type, with HAVING-style filter.
MATCH (r:Ride {status: 'completed'})-[:OF_TYPE]->(t:RideType)
WITH t.type_name AS ride_type, count(r) AS rides, sum(r.fare_amount) AS revenue, avg(r.fare_amount) AS avg_fare
WHERE rides >= 2
RETURN ride_type, rides, round(revenue * 100) / 100.0 AS revenue, round(avg_fare * 100) / 100.0 AS avg_fare
ORDER BY revenue DESC;

// C7. Payment method share.
MATCH (p:Payment {status: 'paid'})
RETURN p.method, count(p) AS payments, round(sum(p.amount) * 100) / 100.0 AS amount
ORDER BY payments DESC;


// ---------------------------------------------------------------------
// D. SUBQUERIES                               [nested SELECT, EXISTS]
// ---------------------------------------------------------------------

// D1. EXISTS subquery - riders who have used at least one promo code.
MATCH (u:User)
WHERE EXISTS { (u)-[:REQUESTED]->(:Ride)-[:APPLIES]->(:PromoCode) }
RETURN u.name ORDER BY u.name;

// D2. COUNT subquery - drivers with more than 2 completed rides.
MATCH (d:Driver)
WHERE COUNT { (d)-[:ACCEPTED]->(:Ride {status: 'completed'}) } > 2
RETURN d.name, d.rating_avg;

// D3. CALL subquery - rides whose fare is above the overall average fare
// (like WHERE fare > (SELECT AVG(fare) FROM rides)).
CALL {
  MATCH (r:Ride {status: 'completed'})
  RETURN avg(r.fare_amount) AS avg_fare
}
MATCH (r:Ride {status: 'completed'})
WHERE r.fare_amount > avg_fare
RETURN r.ride_id, r.fare_amount, round(avg_fare * 100) / 100.0 AS overall_avg
ORDER BY r.fare_amount DESC;

// D4. Zones that have NO available driver right now (NOT EXISTS).
MATCH (z:Zone)
WHERE NOT EXISTS { (z)<-[:LOCATED_IN]-(:Driver {status: 'available'}) }
RETURN z.zone_name;


// ---------------------------------------------------------------------
// E. "VIEWS"
// Neo4j has no CREATE VIEW. The equivalent is a named, reusable query; in the
// app the RIDE_DETAIL fragment in queries.py plays the role of a view that every
// ride query reuses. The query below is the "ride_summary" view.
// ---------------------------------------------------------------------

// E1. ride_summary "view"
MATCH (u:User)-[:REQUESTED]->(r:Ride)-[:OF_TYPE]->(t:RideType)
MATCH (r)-[:PICKUP_AT]->(:Location)-[:IN_ZONE]->(z:Zone)
OPTIONAL MATCH (d:Driver)-[:ACCEPTED]->(r)
OPTIONAL MATCH (r)-[:APPLIES]->(pc:PromoCode)
RETURN r.ride_id AS ride_id, u.name AS rider, d.name AS driver, t.type_name AS ride_type,
       z.zone_name AS pickup_zone, r.status AS status, r.fare_amount AS fare, pc.code AS promo
ORDER BY ride_id;


// ---------------------------------------------------------------------
// F. TRANSACTIONS
// Every query sent by the Flask app runs inside its own transaction
// (driver.execute_query in db.py), so a multi-step query such as ACCEPT_RIDE
// either applies completely or not at all. In cypher-shell an explicit
// transaction looks like this:
// ---------------------------------------------------------------------
// :begin
// MATCH (d:Driver {driver_id: 'D1'}) SET d.status = 'busy';
// MATCH (r:Ride {ride_id: 'R1'}) SET r.status = 'accepted';
// :rollback      // or :commit
//
// Batched transactions for bulk updates (Neo4j 5):
// MATCH (r:Ride) CALL { WITH r SET r.checked = true } IN TRANSACTIONS OF 100 ROWS;


// ---------------------------------------------------------------------
// G. CONSTRAINT VIOLATION DEMO                  [PRIMARY KEY violation]
// After schema.cypher, this fails with Neo.ClientError.Schema.ConstraintValidationFailed
// because user_id 'U1' already exists.
// ---------------------------------------------------------------------
// CREATE (:User {user_id: 'U1', name: 'Duplicate', email: 'dup@example.com'});


// ---------------------------------------------------------------------
// H. INDEXES - list them and see one being used
// ---------------------------------------------------------------------
SHOW INDEXES;
PROFILE MATCH (r:Ride {ride_id: 'R5'}) RETURN r;
