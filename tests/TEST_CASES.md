# RideGraph – Test Cases

All of these cases are automated in `tests/test_api.py`. Start the server, then run `python tests/test_api.py`. The script prints `PASS` or `FAIL` for each check and a total at the end. Results below are from the run on 01-11-2026: **73 passed, 0 failed** (see `screenshots/08_tests.png`). TC39 was observed with Neo4j stopped, and TC40 was run in Neo4j.

| ID | Feature | Input / action | Expected outcome | Actual |
|---|---|---|---|---|
| TC01 | Lookup data | GET /api/locations, /zones, /ride-types | 15 locations, 6 zones, 4 ride types | Pass |
| TC02 | Promo lookup | GET /api/promo/WELCOME20 | 200, discount 20% | Pass |
| TC03 | Invalid promo | GET /api/promo/NOPE | 404 Not found | Pass |
| TC04 | Register rider | New name, email, phone, password | 201 Created, user_id returned | Pass |
| TC05 | Duplicate email | Register again with the same email | 409 "That email is already registered" | Pass |
| TC06 | Missing fields | Register with only a name | 400 "'email' is required" | Pass |
| TC07 | Register driver | New driver in zone Z1 with vehicle | 201, zone = T. Nagar | Pass |
| TC08 | Login rider | Correct email + password | 200, no password_hash in response | Pass |
| TC09 | Wrong password | Correct email, wrong password | 401, generic message | Pass |
| TC10 | Unknown user | Unknown email/phone | 401, same generic message as TC09 | Pass |
| TC11 | Empty login fields | Empty password / username | 400 "Please enter ..." | Pass |
| TC12 | Admin login | prakash / admin123; then wrong password | 200; 401 | Pass |
| TC13 | Fare estimate | L1 → L4, Economy | fare = base + per_km × distance | Pass |
| TC14 | Promo on fare | Same trip + WELCOME20 | fare reduced by exactly 20% | Pass |
| TC15 | Same pickup and dropoff | pickup = dropoff | 400 "Pickup and dropoff must be different locations" | Pass |
| TC16 | Unknown rider | Request ride with user_id that does not exist | 404 | Pass |
| TC17 | Request ride | Valid rider, pickup, dropoff, type, promo | 201, status = requested, fare = estimate | Pass |
| TC18 | Nearby drivers | GET nearby drivers for the ride | Only available drivers in the pickup zone, sorted by rating | Pass |
| TC19 | Zone visibility | Open requests for a driver in the zone / another zone | Visible in the zone; not visible from another zone | Pass |
| TC20 | Accept from wrong zone | Driver from another zone accepts | 403 "This ride is outside your zone" | Pass |
| TC21 | Accept ride | Driver in the zone accepts | 200, status = accepted, driver = busy | Pass |
| TC22 | Double accept | Accept the same ride again | 409 Conflict | Pass |
| TC23 | Wrong driver completes | Another driver completes | 403 | Pass |
| TC24 | Complete ride | Accepting driver completes | 200, Payment created with status pending, driver available | Pass |
| TC25 | Invalid payment method | method = "bitcoin" | 400 "method must be one of: ..." | Pass |
| TC26 | Pay ride | method = upi | 200, payment = paid | Pass |
| TC27 | Double payment | Pay again | 409 "This ride is already paid" | Pass |
| TC28 | Rate ride | score 5 + comment | 201, rating saved | Pass |
| TC29 | Double rating | Rate again | 409 "This ride is already rated" | Pass |
| TC30 | Invalid score | score 9 | 400 | Pass |
| TC31 | Rating average | After rating | driver rating_avg recalculated (0–5) | Pass |
| TC32 | Cancel by another user | Different rider cancels | 403 "This is not your ride" | Pass |
| TC33 | Cancel accepted ride | Rider cancels with reason | 200, status = cancelled, driver available again | Pass |
| TC34 | Double cancel | Cancel again | 409 | Pass |
| TC35 | Cancel unaccepted ride | Cancel a ride still requested | 200, cancelled | Pass |
| TC36 | Ride history | Rider history / driver rides | Includes the test rides, driver earnings updated | Pass |
| TC37 | Unknown user history | History for an unknown user | 404 | Pass |
| TC38 | Admin statistics | GET /api/admin/stats | totals, revenue > 0, 6 zones, top drivers, cancellations | Pass |
| TC39 | Database down | Stop Neo4j, call any API | 503 "Cannot connect to the Neo4j database" | Pass |
| TC40 | Constraint violation (database) | `CREATE (:User {user_id:'U1'})` in Neo4j Browser | ConstraintValidationFailed | Pass |
