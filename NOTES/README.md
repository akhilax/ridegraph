# RideGraph

A ride-hailing web app (Uber / Ola / Rapido style) built with **Neo4j** (graph database), **Python Flask** (backend API) and a **React + Vite + Framer Motion** frontend. Flask serves both the API and the built website, so everything runs from one address: **http://localhost:5000**

```
React app (browser)  --fetch /api-->  Flask API (Python)  --Cypher-->  Neo4j
 presentation tier                    application tier                  data tier
```

## Demo logins

| Role | Login | Password |
|------|-------|----------|
| Rider (**Akhil**) | `akhil@example.com` | `rider123` |
| Driver (**Praveen**) | `9876500011` (phone, T. Nagar zone) | `driver123` |
| Admin (**Prakash**) | `prakash` (username) | `admin123` |

The full list of all 21 logins is in `LOGINS.txt`. All riders use `rider123`, all drivers use `driver123`; drivers log in with their **phone number**. On the login page you can click a name in **Demo accounts** to fill the form, then press Login.

Praveen is the demo driver: he has 4 completed rides (about ₹553 earned) and a ~4.7 rating, and he shows up under "Drivers near pickup" for the T. Nagar locations. The other drivers (Virat Kohli, Rohit Sharma, ...) still work too.

## Try the full flow (2 browser windows)
1. Window 1: log in as rider **Akhil**, keep pickup *Pondy Bazaar, T. Nagar*, pick a dropoff, click **Request ride**.
2. Window 2 (a private/incognito window): log in as driver **Praveen**. The request appears -> **Accept ride**.
3. Praveen clicks **Complete ride** (confetti!). Akhil now sees **Pay** and **Rate driver**.
4. Log in as admin (**Prakash**) to see the statistics change.

## Running it (laptop or pendrive) - Node.js NOT needed
1. Open **Neo4j Desktop** -> click the **play button** on `ridegraph-db` and wait for RUNNING.
2. **Windows:** double-click `run_windows.bat` in the project folder (macOS: see the next section). It creates the Python venv, installs packages, loads the seed data, starts the server and opens http://localhost:5000.
   The website is already built in `frontend\dist`, so no Node.js is required. The first run needs internet (for `pip install`).
3. Close the black window to stop the server.

On **another PC** you need Python (tick *Add Python to PATH*) and Neo4j Desktop with a local instance whose password is `akhil123` (or edit `backend\.env`) listening on `bolt://localhost:7687`. The drive letter of the pendrive does not matter.

Manual run (PowerShell):
```powershell
cd <project>\backend
..\venv\Scripts\python.exe seed.py        # only needed if the DB is empty
..\venv\Scripts\python.exe app.py         # then open http://localhost:5000
..\venv\Scripts\python.exe test_api.py    # automatic tests (server must be running)
```

## Running it on a MacBook
1. Install **Python 3** and **Neo4j Desktop** for Mac. Create a local database whose password is `akhil123` (or edit `backend/.env`) and **Start** it (wait for RUNNING).
2. Open **Terminal** and run (type `bash`, a space, then drag `run_mac.command` into the window and press Enter):
   ```bash
   bash "/Volumes/SUNEAST/RideSense/run_mac.command"
   ```
   It creates its own `venv_mac` folder (the Windows `venv` is not used), installs packages, loads the seed data, starts the server and opens the browser. If you `chmod +x run_mac.command` once, you can double-click it in Finder afterwards.
3. **Port 5000:** macOS often uses it for *AirPlay Receiver*. The script notices this and uses **http://localhost:5001** instead (the address is printed, and the browser opens at the right one). You can also switch off AirPlay Receiver in System Settings -> General -> AirDrop & Handoff.
4. **Read-only pendrive:** if the drive is formatted as NTFS, a Mac can only read it and the script cannot create `venv_mac` there. Copy the whole `RideSense` folder to the Mac's disk (e.g. Documents) and run it from there. FAT32 / exFAT drives are fine.
5. Stop the server with Control+C in Terminal. Node.js is not needed (the website is pre-built).

## Editing the frontend (this is the only time you need Node.js)
The React source is in `frontend\src`. Node.js is only needed to change it.
```powershell
cd <project>\frontend
npm install          # first time only (downloads packages into node_modules)
npm run dev          # live-reload dev server at http://localhost:5173 (needs Flask running on :5000)
npm run build        # rebuilds frontend\dist, which Flask serves at http://localhost:5000
```
After changing the frontend, run `npm run build` and copy `frontend\dist` along with everything else. `node_modules` is NOT needed on the pendrive.

## Project layout
```
backend/
  app.py          Flask server: API routes + serves frontend/dist (index.html fallback for React Router)
  db.py           Neo4j connection (reads .env)
  queries.py      ALL Cypher queries, each commented
  seed.py         creates constraints + Chennai demo data (safe to re-run; `--reset` wipes first)
  utils.py        haversine distance + fare formula
  test_api.py     end-to-end API tests (73 checks; cleans up after itself)
  .env            DB settings (password!)   .env.example = template
frontend/
  src/pages/      Login.jsx, Rider.jsx, Driver.jsx, Admin.jsx
  src/components/ ui.jsx (stepper, radar, confetti, stars, skeletons...), RideRow.jsx
  src/            App.jsx (routes + page transitions), api.js, auth.jsx, toast.jsx, styles.css
  dist/           the BUILT website that Flask serves (needed to run without Node.js)
  vite.config.js  dev server + /api proxy to Flask
frontend_old/     the previous plain HTML/JS frontend (backup, not used)
run_windows.bat   one-click setup and run (Windows)
run_mac.command  one-click setup and run (macOS)
NOTES/            this README, LOGINS.txt, VIVA_NOTES.md
```

## API summary
| Method & path | Purpose |
|---|---|
| POST `/api/register`, `/api/login` | rider / driver accounts (hashed passwords) |
| GET `/api/locations`, `/api/zones`, `/api/ride-types`, `/api/promo/<code>` | lookup data |
| POST `/api/fare-estimate` | distance + fare preview |
| POST `/api/rides` | request a ride |
| GET `/api/rides/<id>/nearby-drivers`, `/api/locations/<id>/nearby-drivers` | available drivers in the pickup zone, best rated first |
| POST `/api/rides/<id>/accept` `/complete` `/pay` `/cancel` `/rate` | ride life-cycle |
| GET `/api/users/<id>/rides`, `/api/drivers/<id>/rides` | history (+ driver earnings) |
| GET `/api/drivers/<id>/requests` | open requests in a driver's zone |
| GET `/api/admin/stats` | totals, revenue, rides per zone, top drivers, cancellations |

## Things to know
* The login is deliberately simple (no JWT/tokens): the API trusts the ids the browser sends, and `/api/admin/stats` has no token check. Fine for a college demo, not for production.
* A wrong login always says "Incorrect username or password. Please try again." (it never reveals which one was wrong).
* `seed.py --reset` deletes **all** data in the `neo4j` database, then reloads the demo data. Plain `seed.py` only adds what is missing.
* The `.env` file contains the database password. Do not share it publicly / upload to GitHub (`.gitignore` excludes it).
* Distances are straight-line (haversine), not road distance.
* If the page says *Cannot connect to the Neo4j database*, start `ridegraph-db` in Neo4j Desktop.
* If you set "reduce motion" in Windows, the animations calm down automatically.
