-- =====================================================================
-- RideGraph - schema.sql  (relational version of the design)
-- The running application stores this design in Neo4j (database/*.cypher,
-- approved by the faculty). This script is the same design as normalized
-- relations (3NF), so it can be executed on a relational DBMS.
-- Tested with SQLite 3:   sqlite3 ridegraph.db < schema.sql
-- (Standard SQL; also runs on MySQL 8 / PostgreSQL with minor type changes.)
-- =====================================================================
PRAGMA foreign_keys = ON;   -- SQLite: enforce foreign keys

DROP VIEW  IF EXISTS ride_summary;
DROP TABLE IF EXISTS cancellations;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS rides;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS promo_codes;
DROP TABLE IF EXISTS ride_types;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS zones;

CREATE TABLE zones (
    zone_id    VARCHAR(10)  PRIMARY KEY,
    zone_name  VARCHAR(60)  NOT NULL UNIQUE,
    city       VARCHAR(60)  NOT NULL
);

CREATE TABLE locations (
    location_id VARCHAR(10)  PRIMARY KEY,
    address     VARCHAR(120) NOT NULL,
    latitude    DECIMAL(9,6) NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
    longitude   DECIMAL(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    zone_id     VARCHAR(10)  NOT NULL REFERENCES zones(zone_id)
);

CREATE TABLE ride_types (
    ride_type_id VARCHAR(10)  PRIMARY KEY,
    type_name    VARCHAR(30)  NOT NULL UNIQUE,
    base_fare    DECIMAL(8,2) NOT NULL CHECK (base_fare   >= 0),
    per_km_rate  DECIMAL(8,2) NOT NULL CHECK (per_km_rate >= 0)
);

CREATE TABLE promo_codes (
    promo_id         VARCHAR(10) PRIMARY KEY,
    code             VARCHAR(30) NOT NULL UNIQUE,
    discount_percent INTEGER     NOT NULL CHECK (discount_percent BETWEEN 1 AND 100)
);

CREATE TABLE users (
    user_id       VARCHAR(20)  PRIMARY KEY,
    name          VARCHAR(80)  NOT NULL,
    email         VARCHAR(120) NOT NULL UNIQUE,
    phone         VARCHAR(15)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL          -- salted hash only, never the password
);

CREATE TABLE drivers (
    driver_id      VARCHAR(20)  PRIMARY KEY,
    name           VARCHAR(80)  NOT NULL,
    phone          VARCHAR(15)  NOT NULL UNIQUE,
    license_number VARCHAR(30)  NOT NULL UNIQUE,
    rating_avg     DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
    status         VARCHAR(10)  NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy')),
    password_hash  VARCHAR(255) NOT NULL,
    zone_id        VARCHAR(10)  NOT NULL REFERENCES zones(zone_id)
);

CREATE TABLE vehicles (
    vehicle_id   VARCHAR(20) PRIMARY KEY,
    plate_number VARCHAR(15) NOT NULL UNIQUE,
    model        VARCHAR(40) NOT NULL,
    color        VARCHAR(20) NOT NULL,
    driver_id    VARCHAR(20) NOT NULL UNIQUE REFERENCES drivers(driver_id) ON DELETE CASCADE  -- 1:1 DRIVES
);

CREATE TABLE rides (
    ride_id             VARCHAR(20)  PRIMARY KEY,
    requested_at        TIMESTAMP    NOT NULL,
    status              VARCHAR(10)  NOT NULL CHECK (status IN ('requested', 'accepted', 'completed', 'cancelled')),
    distance_km         DECIMAL(7,2) NOT NULL CHECK (distance_km > 0),
    fare_amount         DECIMAL(8,2) NOT NULL CHECK (fare_amount >= 0),   -- price snapshot (justified denormalization)
    user_id             VARCHAR(20)  NOT NULL REFERENCES users(user_id),
    driver_id           VARCHAR(20)  REFERENCES drivers(driver_id),        -- NULL until a driver accepts
    ride_type_id        VARCHAR(10)  NOT NULL REFERENCES ride_types(ride_type_id),
    pickup_location_id  VARCHAR(10)  NOT NULL REFERENCES locations(location_id),
    dropoff_location_id VARCHAR(10)  NOT NULL REFERENCES locations(location_id),
    promo_id            VARCHAR(10)  REFERENCES promo_codes(promo_id),
    CHECK (pickup_location_id <> dropoff_location_id),
    CHECK (status = 'requested' OR status = 'cancelled' OR driver_id IS NOT NULL)
);

CREATE TABLE payments (
    payment_id VARCHAR(20)  PRIMARY KEY,
    ride_id    VARCHAR(20)  NOT NULL UNIQUE REFERENCES rides(ride_id) ON DELETE CASCADE,  -- 1:1 PAID_BY
    amount     DECIMAL(8,2) NOT NULL CHECK (amount >= 0),
    method     VARCHAR(10)  NOT NULL CHECK (method IN ('unpaid', 'cash', 'card', 'upi')),
    status     VARCHAR(10)  NOT NULL CHECK (status IN ('pending', 'paid'))
);

CREATE TABLE ratings (
    rating_id VARCHAR(20)  PRIMARY KEY,
    ride_id   VARCHAR(20)  NOT NULL UNIQUE REFERENCES rides(ride_id) ON DELETE CASCADE,   -- 1:1 HAS_RATING
    score     INTEGER      NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment   VARCHAR(255)
);

CREATE TABLE cancellations (
    cancellation_id VARCHAR(20)  PRIMARY KEY,
    ride_id         VARCHAR(20)  NOT NULL UNIQUE REFERENCES rides(ride_id) ON DELETE CASCADE,  -- 1:1 RESULTED_IN
    reason          VARCHAR(255) NOT NULL,
    cancelled_by    VARCHAR(10)  NOT NULL CHECK (cancelled_by IN ('rider', 'driver'))
);

-- Indexes on frequent filters / join columns
CREATE INDEX idx_rides_status     ON rides(status);
CREATE INDEX idx_rides_user       ON rides(user_id);
CREATE INDEX idx_rides_driver     ON rides(driver_id);
CREATE INDEX idx_rides_pickup     ON rides(pickup_location_id);
CREATE INDEX idx_drivers_zone     ON drivers(zone_id, status);
CREATE INDEX idx_locations_zone   ON locations(zone_id);

-- View: one readable row per ride (same idea as RIDE_DETAIL in queries.py)
CREATE VIEW ride_summary AS
SELECT r.ride_id, r.requested_at, r.status, u.name AS rider, d.name AS driver,
       t.type_name AS ride_type, pl.address AS pickup, dl.address AS dropoff,
       z.zone_name AS pickup_zone, r.distance_km, r.fare_amount,
       pc.code AS promo, p.status AS payment_status, rt.score AS rating
FROM rides r
JOIN users u            ON u.user_id = r.user_id
JOIN ride_types t       ON t.ride_type_id = r.ride_type_id
JOIN locations pl       ON pl.location_id = r.pickup_location_id
JOIN locations dl       ON dl.location_id = r.dropoff_location_id
JOIN zones z            ON z.zone_id = pl.zone_id
LEFT JOIN drivers d     ON d.driver_id = r.driver_id
LEFT JOIN promo_codes pc ON pc.promo_id = r.promo_id
LEFT JOIN payments p    ON p.ride_id = r.ride_id
LEFT JOIN ratings rt    ON rt.ride_id = r.ride_id;
