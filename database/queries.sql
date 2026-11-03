-- =====================================================================
-- RideGraph - queries.sql  (relational version; tested with SQLite 3)
-- Run after schema.sql and sample_data.sql:
--     sqlite3 ridegraph.db < queries.sql
-- Each query mirrors a Cypher query in database/queries.cypher and
-- src/backend/queries.py, which is what the running application uses.
-- =====================================================================
PRAGMA foreign_keys = ON;
.headers on
.mode column

-- ---------------------------------------------------------------------
-- A. INSERT / SELECT / UPDATE / DELETE  (one full ride life cycle)
-- ---------------------------------------------------------------------

-- A1. INSERT: register a new rider
INSERT INTO users (user_id, name, email, phone, password_hash)
VALUES ('U900', 'Demo Student', 'demo.student@example.com', '9000000900', 'hash-created-by-the-app');

-- A2. INSERT: the rider requests Pondy Bazaar -> Kapaleeshwarar Temple, Economy
--     fare = 40 + 12 * 3.96 = 87.52
INSERT INTO rides (ride_id, requested_at, status, distance_km, fare_amount, user_id, driver_id,
                   ride_type_id, pickup_location_id, dropoff_location_id, promo_id)
VALUES ('R900', CURRENT_TIMESTAMP, 'requested', 3.96, 87.52, 'U900', NULL, 'RT1', 'L1', 'L4', NULL);

-- A3. SELECT + JOIN: available drivers in the pickup zone, best rated first
SELECT d.name, d.rating_avg, v.model, v.plate_number, z.zone_name
FROM rides r
JOIN locations l ON l.location_id = r.pickup_location_id
JOIN zones z     ON z.zone_id = l.zone_id
JOIN drivers d   ON d.zone_id = z.zone_id AND d.status = 'available'
JOIN vehicles v  ON v.driver_id = d.driver_id
WHERE r.ride_id = 'R900'
ORDER BY d.rating_avg DESC;

-- A4. TRANSACTION + UPDATE: driver D11 accepts. Both rows change together or not at all.
--     The WHERE conditions prevent double booking (ride must still be 'requested').
BEGIN TRANSACTION;
UPDATE rides   SET status = 'accepted', driver_id = 'D11'
WHERE ride_id = 'R900' AND status = 'requested';
UPDATE drivers SET status = 'busy'
WHERE driver_id = 'D11' AND status = 'available';
COMMIT;

-- A5. TRANSACTION: complete the ride and create a pending payment
BEGIN TRANSACTION;
UPDATE rides   SET status = 'completed' WHERE ride_id = 'R900' AND status = 'accepted';
UPDATE drivers SET status = 'available' WHERE driver_id = 'D11';
INSERT INTO payments (payment_id, ride_id, amount, method, status)
SELECT 'PAY900', ride_id, fare_amount, 'unpaid', 'pending' FROM rides WHERE ride_id = 'R900';
COMMIT;

-- A6. UPDATE: the rider pays by UPI
UPDATE payments SET status = 'paid', method = 'upi' WHERE ride_id = 'R900' AND status = 'pending';

-- A7. INSERT: rate the ride, then recompute the driver's average (UPDATE with a subquery)
INSERT INTO ratings (rating_id, ride_id, score, comment) VALUES ('RT900', 'R900', 5, 'Great demo ride');
UPDATE drivers
SET rating_avg = (SELECT ROUND(AVG(rt.score), 2) FROM ratings rt JOIN rides r ON r.ride_id = rt.ride_id
                  WHERE r.driver_id = drivers.driver_id)
WHERE driver_id = 'D11';

-- A8. SELECT from the VIEW: the ride we just created
SELECT * FROM ride_summary WHERE ride_id = 'R900';

-- A9. DELETE: remove the demo data (payment/rating are removed by ON DELETE CASCADE)
DELETE FROM rides WHERE ride_id = 'R900';
DELETE FROM users WHERE user_id = 'U900';
UPDATE drivers
SET rating_avg = (SELECT ROUND(AVG(rt.score), 2) FROM ratings rt JOIN rides r ON r.ride_id = rt.ride_id
                  WHERE r.driver_id = drivers.driver_id)
WHERE driver_id = 'D11';

-- ---------------------------------------------------------------------
-- B. JOINS
-- ---------------------------------------------------------------------

-- B1. A rider's ride history (LEFT JOIN: cancelled rides have no driver)
SELECT r.ride_id, r.status, pl.address AS pickup, dl.address AS dropoff, d.name AS driver, r.fare_amount
FROM rides r
JOIN locations pl   ON pl.location_id = r.pickup_location_id
JOIN locations dl   ON dl.location_id = r.dropoff_location_id
LEFT JOIN drivers d ON d.driver_id = r.driver_id
WHERE r.user_id = 'U1'
ORDER BY r.requested_at DESC;

-- B2. Open requests a driver can see: rides still 'requested' picked up in the driver's zone
SELECT r.ride_id, r.requested_at, r.fare_amount
FROM drivers d
JOIN locations l ON l.zone_id = d.zone_id
JOIN rides r     ON r.pickup_location_id = l.location_id AND r.status = 'requested'
WHERE d.driver_id = 'D11';

-- ---------------------------------------------------------------------
-- C. GROUPING / AGGREGATES
-- ---------------------------------------------------------------------

-- C1. Totals and revenue (admin dashboard)
SELECT COUNT(*) AS total_rides,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
       ROUND(SUM(CASE WHEN status = 'completed' THEN fare_amount ELSE 0 END), 2) AS revenue
FROM rides;

-- C2. Rides per pickup zone, zones with 0 rides included (LEFT JOIN + GROUP BY)
SELECT z.zone_name, COUNT(r.ride_id) AS rides
FROM zones z
LEFT JOIN locations l ON l.zone_id = z.zone_id
LEFT JOIN rides r     ON r.pickup_location_id = l.location_id
GROUP BY z.zone_id, z.zone_name
ORDER BY rides DESC, z.zone_name;

-- C3. Revenue per ride type with HAVING
SELECT t.type_name, COUNT(*) AS rides, ROUND(SUM(r.fare_amount), 2) AS revenue, ROUND(AVG(r.fare_amount), 2) AS avg_fare
FROM rides r JOIN ride_types t ON t.ride_type_id = r.ride_type_id
WHERE r.status = 'completed'
GROUP BY t.type_name
HAVING COUNT(*) >= 2
ORDER BY revenue DESC;

-- C4. Top 5 drivers by rating with completed rides and earnings
SELECT d.name, d.rating_avg, COUNT(r.ride_id) AS completed_rides, ROUND(SUM(r.fare_amount), 2) AS earnings
FROM drivers d JOIN rides r ON r.driver_id = d.driver_id AND r.status = 'completed'
GROUP BY d.driver_id, d.name, d.rating_avg
ORDER BY d.rating_avg DESC, completed_rides DESC
LIMIT 5;

-- ---------------------------------------------------------------------
-- D. SUBQUERIES
-- ---------------------------------------------------------------------

-- D1. Completed rides whose fare is above the average fare
SELECT ride_id, fare_amount
FROM rides
WHERE status = 'completed'
  AND fare_amount > (SELECT AVG(fare_amount) FROM rides WHERE status = 'completed')
ORDER BY fare_amount DESC;

-- D2. EXISTS: riders who have used at least one promo code
SELECT u.name FROM users u
WHERE EXISTS (SELECT 1 FROM rides r WHERE r.user_id = u.user_id AND r.promo_id IS NOT NULL)
ORDER BY u.name;

-- D3. NOT EXISTS: zones with no available driver
SELECT z.zone_name FROM zones z
WHERE NOT EXISTS (SELECT 1 FROM drivers d WHERE d.zone_id = z.zone_id AND d.status = 'available');

-- ---------------------------------------------------------------------
-- E. VIEW
-- ---------------------------------------------------------------------
SELECT ride_id, rider, driver, ride_type, pickup_zone, status, fare_amount, promo
FROM ride_summary ORDER BY ride_id LIMIT 10;

-- ---------------------------------------------------------------------
-- F. CONSTRAINT VIOLATIONS (each statement below is EXPECTED to fail)
-- ---------------------------------------------------------------------
-- F1. duplicate primary key        -> UNIQUE constraint failed: users.user_id
INSERT INTO users (user_id, name, email, phone, password_hash) VALUES ('U1', 'Dup', 'dup@example.com', '1', 'x');
-- F2. duplicate unique email       -> UNIQUE constraint failed: users.email
INSERT INTO users (user_id, name, email, phone, password_hash) VALUES ('U999', 'Dup', 'akhil@example.com', '1', 'x');
-- F3. rating score out of range    -> CHECK constraint failed
INSERT INTO ratings (rating_id, ride_id, score) VALUES ('RT999', 'R5', 9);
-- F4. foreign key to a missing user -> FOREIGN KEY constraint failed
INSERT INTO rides (ride_id, requested_at, status, distance_km, fare_amount, user_id, ride_type_id, pickup_location_id, dropoff_location_id)
VALUES ('R999', CURRENT_TIMESTAMP, 'requested', 2, 50, 'NOBODY', 'RT1', 'L1', 'L4');
-- F5. same pickup and drop-off     -> CHECK constraint failed
INSERT INTO rides (ride_id, requested_at, status, distance_km, fare_amount, user_id, ride_type_id, pickup_location_id, dropoff_location_id)
VALUES ('R998', CURRENT_TIMESTAMP, 'requested', 2, 50, 'U1', 'RT1', 'L1', 'L1');

-- Check: nothing from section F was stored (expected 0)
SELECT COUNT(*) AS should_be_zero FROM rides WHERE ride_id IN ('R998', 'R999');
