# RideGraph - Viva Notes

## 1. Three-tier architecture
* **Presentation tier** - a **React** single-page app (built with **Vite**, animated with **Framer Motion**) in `src/frontend/src`. It only shows data and sends `fetch()` requests to `/api/...`.
* **Application tier** - Flask (`src/backend/app.py`). Validates input, applies business rules (fare, who may accept/cancel), calls Neo4j, returns JSON with proper status codes (400/401/403/404/409).
* **Data tier** - Neo4j graph database, accessed through the official Python driver (`db.py`). All Cypher is in `queries.py`.

The browser never talks to the database directly; only Flask does. `npm run build` turns the React code into plain static files in `src/frontend/dist`, and Flask serves them, so one URL (http://localhost:5000) runs everything and Node.js is not needed to *run* the project.

## 1b. Tech stack and why
| Technology | Why we use it |
|---|---|
| **Neo4j** (Cypher) | Ride-hailing is about relationships (rider-ride-driver-zone-location); a graph stores and queries them naturally. |
| **Python + Flask** | Small, readable REST API; easy to explain in a viva. Parameterised queries, password hashing (werkzeug). |
| **React** | The UI is a tree of reusable components (ride card, stepper, stars...) and the screen updates automatically when the data changes (e.g. ride status refreshing every 5 s) without manual DOM code. |
| **Vite** | Very fast dev server (hot reload) and one-command production build (`npm run build`); proxies `/api` to Flask in development so there are no CORS problems. |
| **React Router** | Separate pages (/login, /rider, /driver, /admin) in one app without full page reloads; Flask returns `index.html` for those URLs so refresh still works. |
| **Framer Motion** | Declarative animations (page transitions, staggered lists, animated stepper, count-up numbers, confetti) with built-in support for `prefers-reduced-motion` accessibility. |

Why not plain HTML/JS any more? The old version (kept in `frontend_old/`) re-rendered HTML strings by hand; React keeps the screen in sync with the data and makes animations much simpler.

## 2. Why a graph database fits ride-hailing
* The domain is *relationships*: rider -> ride -> driver -> vehicle -> zone, ride -> pickup/dropoff location, ride -> payment/rating/promo/cancellation. A graph stores these as first-class relationships.
* "Find available drivers in the pickup zone" is a short **traversal** (Ride -> Location -> Zone <- Driver). In SQL this needs 3-4 JOINs; in Cypher it is one readable pattern.
* Neo4j follows relationships by direct pointers (*index-free adjacency*), so traversals stay fast as data grows, whereas JOIN cost grows with table size.
* Flexible schema: we can add a new node type or relationship (e.g. `Ride-[:USES_COUPON]`) without altering tables.
* Weakness (be honest in the viva): heavy aggregations over millions of rows and strict multi-table transactions are often easier in relational DBs.

## 3. Five most important Cypher queries (all in `queries.py`)

### Q1. Nearby available drivers (`NEARBY_DRIVERS_BY_RIDE`)
```cypher
MATCH (:Ride {ride_id: $ride_id})-[:PICKUP_AT]->(:Location)-[:IN_ZONE]->(z:Zone)
      <-[:LOCATED_IN]-(d:Driver {status: 'available'})
MATCH (d)-[:DRIVES]->(v:Vehicle)
RETURN d.name, d.rating_avg, v.model, v.plate_number
ORDER BY d.rating_avg DESC
```
1. Start at the Ride node with the given id. 2. Follow `PICKUP_AT` to its Location, then `IN_ZONE` to the Zone. 3. Walk *backwards* along `LOCATED_IN` to every Driver in that zone, keeping only `status = 'available'`. 4. Follow `DRIVES` to get each driver's vehicle. 5. Sort by rating, best first.

### Q2. Create a ride with all its relationships (`CREATE_RIDE`)
```cypher
MATCH (u:User {user_id:$user_id}), (t:RideType {...}), (pl:Location {...}), (dl:Location {...})
CREATE (r:Ride {ride_id:$ride_id, status:'requested', distance_km:$d, fare_amount:$f, ...})
CREATE (u)-[:REQUESTED]->(r)  CREATE (r)-[:OF_TYPE]->(t)
CREATE (r)-[:PICKUP_AT]->(pl) CREATE (r)-[:DROPOFF_AT]->(dl)
```
1. `MATCH` finds the four existing nodes (if any is missing, nothing is created). 2. `CREATE` makes the new Ride node. 3. Four `CREATE` relationship lines wire it into the graph. The fare was calculated in Python (haversine + base + per-km - promo) and passed in as parameters.

### Q3. Accept a ride safely (`ACCEPT_RIDE`)
```cypher
MATCH (d:Driver {driver_id:$driver_id, status:'available'})-[:LOCATED_IN]->(z:Zone)
MATCH (r:Ride {ride_id:$ride_id, status:'requested'})-[:PICKUP_AT]->(:Location)-[:IN_ZONE]->(z)
SET r.status='accepted', d.status='busy'
CREATE (d)-[:ACCEPTED]->(r)
```
1. Find an *available* driver and their zone. 2. Find a *still requested* ride whose pickup is in **the same zone variable `z`** (reusing `z` forces both to be the same zone). 3. If both match, set statuses and create the `ACCEPTED` relationship. If someone else accepted first, the pattern no longer matches and nothing changes - this prevents double booking.

### Q4. Open requests for a driver (`OPEN_REQUESTS_FOR_DRIVER`)
```cypher
MATCH (:Driver {driver_id:$driver_id})-[:LOCATED_IN]->(:Zone)<-[:IN_ZONE]-(:Location)<-[:PICKUP_AT]-(r:Ride {status:'requested'})
```
Start at the driver, go to their Zone, then backwards to all Locations in the zone, then backwards to every Ride whose pickup is one of them and which is still `requested`. Four hops, no JOINs.

### Q5. Admin statistics: rides per zone and top drivers (`STAT_RIDES_PER_ZONE`, `STAT_TOP_DRIVERS`)
```cypher
MATCH (z:Zone)
OPTIONAL MATCH (z)<-[:IN_ZONE]-(:Location)<-[:PICKUP_AT]-(r:Ride)
RETURN z.zone_name, count(r) AS rides ORDER BY rides DESC
```
1. Take every Zone. 2. `OPTIONAL MATCH` (like a LEFT JOIN) walks to rides picked up there; zones with no rides still appear with 0. 3. `count(r)` groups automatically by the non-aggregated column `zone_name` (Cypher has no `GROUP BY`). Top drivers works the same: `MATCH (d)-[:ACCEPTED]->(r {status:'completed'})`, `count(r)`, sorted by `rating_avg`.

*Bonus - updating a driver's rating (`UPDATE_DRIVER_RATING`):* `MATCH (d)-[:ACCEPTED]->(:Ride)-[:HAS_RATING]->(rt) WITH d, avg(rt.score) AS a SET d.rating_avg = round(a*100)/100.0`.

## 4. Ten likely teacher questions

1. **What is a graph database?** One that stores data as nodes (things) and relationships (connections between them), both with properties.
2. **What are nodes, relationships and properties here?** Nodes: 11 labels like User, Driver, Ride. Relationships: e.g. `REQUESTED`, `ACCEPTED`, `PICKUP_AT`. Properties: key-value data like `fare_amount`.
3. **How is this different from SQL?** Tables/rows/foreign keys/JOINs become nodes/relationships/traversal. Relationships are stored directly, so no JOIN is computed at query time.
4. **What is Cypher?** Neo4j's query language; it draws patterns in ASCII art: `(a)-[:REL]->(b)`.
5. **MATCH vs MERGE vs CREATE?** MATCH finds, CREATE always makes a new one, MERGE finds-or-creates (used in `seed.py` so re-running never duplicates).
6. **What are constraints and why use them?** Uniqueness constraints on every `*_id` stop duplicate ids and also create an index so lookups by id are fast.
7. **How is the fare calculated?** Haversine formula gives the straight-line distance between the two locations' latitude/longitude; fare = base_fare + per_km_rate x distance; then the promo percentage is subtracted.
8. **How do you stop SQL/Cypher injection?** Every query uses `$parameters`; user input is never concatenated into the query text.
9. **How are passwords stored?** Never as plain text; werkzeug's `generate_password_hash` stores a salted hash and `check_password_hash` verifies it.
10. **How do you stop two drivers accepting the same ride?** The `ACCEPT_RIDE` query only matches rides still in status `requested` and drivers still `available`; the second driver's query matches nothing and the API returns 409.

Extra possible questions:
* **What is the ER-to-graph mapping?** Each entity -> node label, each relationship -> relationship type, foreign keys disappear into relationships.
* **Why is there no JWT?** Kept simple for a college project; limitation: the API trusts the ids sent by the browser.
* **How did you test it?** `tests/test_api.py` runs 73 checks through a full ride flow (login -> request -> accept -> complete -> pay -> rate) plus cancellation and error cases.
* **What is `OPTIONAL MATCH`?** Cypher's LEFT JOIN: keeps the row (with null) when the optional pattern is missing, e.g. a ride with no driver yet.
* **Why React and Framer Motion?** React keeps the UI in sync with the data using components and state; Framer Motion gives declarative animations and respects the user's "reduce motion" setting.
* **How does Flask serve a React app?** `npm run build` creates static files in `src/frontend/dist`; Flask serves them and returns `index.html` for any non-API URL so React Router can handle pages like `/rider` (refreshing still works).
* **Why does a wrong login give one generic message?** Saying only "Incorrect username or password" never reveals whether the username exists, which prevents attackers from discovering valid accounts.
