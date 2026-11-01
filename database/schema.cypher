// =====================================================================
// RideGraph - schema.cypher
// Neo4j 5.x (Cypher). Neo4j is schema-optional, so the 'schema' is the set
// of node labels, relationship types and constraints/indexes below.
// Run in Neo4j Browser / Desktop Query, or: cypher-shell -f schema.cypher
// (The application creates the same constraints automatically in seed.py.)
// =====================================================================

// ---------- 1. PRIMARY KEYS: one uniqueness constraint per node label ----------
// Equivalent of PRIMARY KEY in SQL. Each constraint also creates an index.
CREATE CONSTRAINT user_user_id IF NOT EXISTS FOR (n:User) REQUIRE n.user_id IS UNIQUE;
CREATE CONSTRAINT driver_driver_id IF NOT EXISTS FOR (n:Driver) REQUIRE n.driver_id IS UNIQUE;
CREATE CONSTRAINT vehicle_vehicle_id IF NOT EXISTS FOR (n:Vehicle) REQUIRE n.vehicle_id IS UNIQUE;
CREATE CONSTRAINT ridetype_ride_type_id IF NOT EXISTS FOR (n:RideType) REQUIRE n.ride_type_id IS UNIQUE;
CREATE CONSTRAINT zone_zone_id IF NOT EXISTS FOR (n:Zone) REQUIRE n.zone_id IS UNIQUE;
CREATE CONSTRAINT location_location_id IF NOT EXISTS FOR (n:Location) REQUIRE n.location_id IS UNIQUE;
CREATE CONSTRAINT ride_ride_id IF NOT EXISTS FOR (n:Ride) REQUIRE n.ride_id IS UNIQUE;
CREATE CONSTRAINT payment_payment_id IF NOT EXISTS FOR (n:Payment) REQUIRE n.payment_id IS UNIQUE;
CREATE CONSTRAINT rating_rating_id IF NOT EXISTS FOR (n:Rating) REQUIRE n.rating_id IS UNIQUE;
CREATE CONSTRAINT promocode_promo_id IF NOT EXISTS FOR (n:PromoCode) REQUIRE n.promo_id IS UNIQUE;
CREATE CONSTRAINT cancellation_cancellation_id IF NOT EXISTS FOR (n:Cancellation) REQUIRE n.cancellation_id IS UNIQUE;

// ---------- 2. CANDIDATE / ALTERNATE KEYS (UNIQUE) ----------
CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE;
CREATE CONSTRAINT driver_phone_unique IF NOT EXISTS FOR (d:Driver) REQUIRE d.phone IS UNIQUE;
CREATE CONSTRAINT driver_license_unique IF NOT EXISTS FOR (d:Driver) REQUIRE d.license_number IS UNIQUE;
CREATE CONSTRAINT vehicle_plate_unique IF NOT EXISTS FOR (v:Vehicle) REQUIRE v.plate_number IS UNIQUE;
CREATE CONSTRAINT promo_code_unique IF NOT EXISTS FOR (p:PromoCode) REQUIRE p.code IS UNIQUE;

// ---------- 3. SECONDARY INDEXES for frequent filters ----------
CREATE INDEX ride_status_idx IF NOT EXISTS FOR (r:Ride) ON (r.status);
CREATE INDEX ride_requested_at_idx IF NOT EXISTS FOR (r:Ride) ON (r.requested_at);
CREATE INDEX driver_status_idx IF NOT EXISTS FOR (d:Driver) ON (d.status);

// ---------- 4. NOT NULL / domain rules ----------
// Property-existence and type constraints need Neo4j Enterprise Edition, so on
// Community/Desktop these rules are enforced in the Flask API (backend/app.py):
//   * Ride.status       IN ['requested','accepted','completed','cancelled']
//   * Driver.status     IN ['available','busy']
//   * Payment.method    IN ['cash','card','upi'] (plus 'unpaid' until paid)
//   * Payment.status    IN ['pending','paid']
//   * Rating.score      integer 1..5, at most one Rating per Ride
//   * Cancellation.cancelled_by IN ['rider','driver']
//   * password >= 6 characters, stored only as a salted hash
// Enterprise-only examples (optional):
// CREATE CONSTRAINT ride_status_exists IF NOT EXISTS FOR (r:Ride) REQUIRE r.status IS NOT NULL;
// CREATE CONSTRAINT ride_fare_type IF NOT EXISTS FOR (r:Ride) REQUIRE r.fare_amount IS :: FLOAT;

// ---------- 5. RELATIONSHIP TYPES (the 'foreign keys' of the graph) ----------
// (:User)-[:REQUESTED]->(:Ride)            1 : N
// (:Driver)-[:ACCEPTED]->(:Ride)           1 : N
// (:Ride)-[:OF_TYPE]->(:RideType)          N : 1
// (:Ride)-[:PICKUP_AT]->(:Location)        N : 1
// (:Ride)-[:DROPOFF_AT]->(:Location)       N : 1
// (:Ride)-[:APPLIES]->(:PromoCode)         N : 1 (optional)
// (:Ride)-[:PAID_BY]->(:Payment)           1 : 1
// (:Ride)-[:HAS_RATING]->(:Rating)         1 : 1
// (:Ride)-[:RESULTED_IN]->(:Cancellation)  1 : 1
// (:Driver)-[:DRIVES]->(:Vehicle)          1 : 1
// (:Driver)-[:LOCATED_IN]->(:Zone)         N : 1
// (:Location)-[:IN_ZONE]->(:Zone)          N : 1

SHOW CONSTRAINTS;
