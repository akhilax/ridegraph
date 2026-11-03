-- =====================================================================
-- RideGraph - sample_data.sql  (synthetic Chennai demo data, same as seed.py)
-- Run after schema.sql:   sqlite3 ridegraph.db < sample_data.sql
-- Passwords are stored only as salted hashes (demo accounts: riders rider123,
-- drivers driver123 - synthetic test accounts, not real credentials).
-- =====================================================================
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

INSERT INTO zones (zone_id, zone_name, city) VALUES
  ('Z1', 'T. Nagar', 'Chennai'),
  ('Z2', 'Mylapore', 'Chennai'),
  ('Z3', 'Anna Nagar', 'Chennai'),
  ('Z4', 'Guindy', 'Chennai'),
  ('Z5', 'Velachery', 'Chennai'),
  ('Z6', 'Chennai Central', 'Chennai');

INSERT INTO locations (location_id, address, latitude, longitude, zone_id) VALUES
  ('L1', 'Pondy Bazaar, T. Nagar', 13.0418, 80.2341, 'Z1'),
  ('L2', 'Panagal Park, T. Nagar', 13.0382, 80.234, 'Z1'),
  ('L3', 'Mambalam Railway Station', 13.0383, 80.2203, 'Z1'),
  ('L4', 'Kapaleeshwarar Temple, Mylapore', 13.0337, 80.2697, 'Z2'),
  ('L5', 'Santhome Cathedral Basilica', 13.0336, 80.2792, 'Z2'),
  ('L6', 'Marina Lighthouse', 13.0409, 80.2825, 'Z2'),
  ('L7', 'Anna Nagar Tower Park', 13.085, 80.2101, 'Z3'),
  ('L8', 'VR Chennai Mall, Anna Nagar', 13.0802, 80.2007, 'Z3'),
  ('L9', 'Koyambedu Bus Terminus (CMBT)', 13.0694, 80.1948, 'Z3'),
  ('L10', 'Guindy National Park', 13.0067, 80.2206, 'Z4'),
  ('L11', 'Chennai International Airport', 12.9941, 80.1709, 'Z4'),
  ('L12', 'Phoenix Marketcity, Velachery', 12.9926, 80.218, 'Z5'),
  ('L13', 'Velachery MRTS Station', 12.9808, 80.2186, 'Z5'),
  ('L14', 'Chennai Central Railway Station', 13.0827, 80.2757, 'Z6'),
  ('L15', 'Government Museum, Egmore', 13.0732, 80.2564, 'Z6');

INSERT INTO ride_types (ride_type_id, type_name, base_fare, per_km_rate) VALUES
  ('RT1', 'Economy', 40.0, 12.0),
  ('RT2', 'Premium', 80.0, 20.0),
  ('RT3', 'Auto', 30.0, 10.0),
  ('RT4', 'Bike', 20.0, 6.0);

INSERT INTO promo_codes (promo_id, code, discount_percent) VALUES
  ('P1', 'WELCOME20', 20),
  ('P2', 'RIDE10', 10),
  ('P3', 'SAVE15', 15);

INSERT INTO users (user_id, name, email, phone, password_hash) VALUES
  ('U1', 'Akhil', 'akhil@example.com', '9876511001', 'scrypt:32768:8:1$kTHNiLZX97tSRPOg$f360251fe08d3d20f5ffab2fd888407ab52ff31d610e543978711254a73abda3a5c0166e31f3a62de9f1124b181ddcc750b7d66e73e1e19ca22e18c16f4c886e'),
  ('U2', 'Priya Nair', 'priya@example.com', '9876511002', 'scrypt:32768:8:1$kTHNiLZX97tSRPOg$f360251fe08d3d20f5ffab2fd888407ab52ff31d610e543978711254a73abda3a5c0166e31f3a62de9f1124b181ddcc750b7d66e73e1e19ca22e18c16f4c886e'),
  ('U3', 'Arjun Reddy', 'arjun@example.com', '9876511003', 'scrypt:32768:8:1$kTHNiLZX97tSRPOg$f360251fe08d3d20f5ffab2fd888407ab52ff31d610e543978711254a73abda3a5c0166e31f3a62de9f1124b181ddcc750b7d66e73e1e19ca22e18c16f4c886e'),
  ('U4', 'Sneha Iyer', 'sneha@example.com', '9876511004', 'scrypt:32768:8:1$kTHNiLZX97tSRPOg$f360251fe08d3d20f5ffab2fd888407ab52ff31d610e543978711254a73abda3a5c0166e31f3a62de9f1124b181ddcc750b7d66e73e1e19ca22e18c16f4c886e'),
  ('U5', 'Vikram Singh', 'vikram@example.com', '9876511005', 'scrypt:32768:8:1$kTHNiLZX97tSRPOg$f360251fe08d3d20f5ffab2fd888407ab52ff31d610e543978711254a73abda3a5c0166e31f3a62de9f1124b181ddcc750b7d66e73e1e19ca22e18c16f4c886e'),
  ('U6', 'Ananya Gowda', 'ananya@example.com', '9876511006', 'scrypt:32768:8:1$kTHNiLZX97tSRPOg$f360251fe08d3d20f5ffab2fd888407ab52ff31d610e543978711254a73abda3a5c0166e31f3a62de9f1124b181ddcc750b7d66e73e1e19ca22e18c16f4c886e'),
  ('U7', 'Karthik Rao', 'karthik@example.com', '9876511007', 'scrypt:32768:8:1$kTHNiLZX97tSRPOg$f360251fe08d3d20f5ffab2fd888407ab52ff31d610e543978711254a73abda3a5c0166e31f3a62de9f1124b181ddcc750b7d66e73e1e19ca22e18c16f4c886e'),
  ('U8', 'Divya Menon', 'divya@example.com', '9876511008', 'scrypt:32768:8:1$kTHNiLZX97tSRPOg$f360251fe08d3d20f5ffab2fd888407ab52ff31d610e543978711254a73abda3a5c0166e31f3a62de9f1124b181ddcc750b7d66e73e1e19ca22e18c16f4c886e'),
  ('U9', 'Rohan Das', 'rohan@example.com', '9876511009', 'scrypt:32768:8:1$kTHNiLZX97tSRPOg$f360251fe08d3d20f5ffab2fd888407ab52ff31d610e543978711254a73abda3a5c0166e31f3a62de9f1124b181ddcc750b7d66e73e1e19ca22e18c16f4c886e'),
  ('U10', 'Meera Pillai', 'meera@example.com', '9876511010', 'scrypt:32768:8:1$kTHNiLZX97tSRPOg$f360251fe08d3d20f5ffab2fd888407ab52ff31d610e543978711254a73abda3a5c0166e31f3a62de9f1124b181ddcc750b7d66e73e1e19ca22e18c16f4c886e');

INSERT INTO drivers (driver_id, name, phone, license_number, rating_avg, status, password_hash, zone_id) VALUES
  ('D1', 'Virat Kohli', '9876500001', 'TN01-2015-0001', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z1'),
  ('D2', 'Rohit Sharma', '9876500002', 'TN01-2016-0002', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z1'),
  ('D3', 'MS Dhoni', '9876500003', 'TN03-2014-0003', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z2'),
  ('D4', 'Jasprit Bumrah', '9876500004', 'TN03-2017-0004', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z2'),
  ('D5', 'Ravindra Jadeja', '9876500005', 'TN51-2013-0005', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z3'),
  ('D6', 'Hardik Pandya', '9876500006', 'TN51-2018-0006', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z3'),
  ('D7', 'Shubman Gill', '9876500007', 'TN05-2015-0007', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z4'),
  ('D8', 'KL Rahul', '9876500008', 'TN05-2019-0008', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z4'),
  ('D9', 'Rishabh Pant', '9876500009', 'TN02-2016-0009', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z5'),
  ('D10', 'Suryakumar Yadav', '9876500010', 'TN04-2017-0010', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z6'),
  ('D11', 'Praveen', '9876500011', 'TN01-2018-0011', 4.5, 'available', 'scrypt:32768:8:1$CzLm9bnQI04X84Sl$0502a7ed0c52487425fbbe077c23ca623f950012893f660339ab2cb0afcca9e6c4f8b091be4bff8b12467c698d01005579f75e7f1e0f23b93447a9a040c86618', 'Z1');

INSERT INTO vehicles (vehicle_id, plate_number, model, color, driver_id) VALUES
  ('V1', 'TN01AB1001', 'Maruti Swift', 'White', 'D1'),
  ('V2', 'TN01AB1002', 'Hyundai i20', 'Silver', 'D2'),
  ('V3', 'TN03CD2003', 'Toyota Etios', 'White', 'D3'),
  ('V4', 'TN03CD2004', 'Honda Amaze', 'Grey', 'D4'),
  ('V5', 'TN51EF3005', 'Maruti Dzire', 'Blue', 'D5'),
  ('V6', 'TN51EF3006', 'Tata Tiago', 'Red', 'D6'),
  ('V7', 'TN05GH4007', 'Bajaj Auto', 'Yellow', 'D7'),
  ('V8', 'TN05GH4008', 'Hero Splendor', 'Black', 'D8'),
  ('V9', 'TN02JK5009', 'Toyota Innova', 'Black', 'D9'),
  ('V10', 'TN04LM6010', 'Honda City', 'White', 'D10'),
  ('V11', 'TN01AB1011', 'Hyundai Verna', 'White', 'D11');

INSERT INTO rides (ride_id, requested_at, status, distance_km, fare_amount, user_id, driver_id, ride_type_id, pickup_location_id, dropoff_location_id, promo_id) VALUES
  ('R1', '2026-10-02 17:00:00', 'completed', 3.96, 87.52, 'U1', 'D2', 'RT1', 'L1', 'L4', NULL),
  ('R2', '2026-10-04 16:00:00', 'completed', 5.36, 168.48, 'U2', 'D1', 'RT2', 'L2', 'L12', 'P2'),
  ('R3', '2026-10-05 15:00:00', 'completed', 8.61, 143.32, 'U3', 'D4', 'RT1', 'L4', 'L7', NULL),
  ('R4', '2026-10-07 14:00:00', 'completed', 1.15, 33.2, 'U4', 'D5', 'RT3', 'L7', 'L8', 'P1'),
  ('R5', '2026-10-08 18:00:00', 'cancelled', 5.56, 53.36, 'U5', NULL, 'RT4', 'L10', 'L11', NULL),
  ('R6', '2026-10-10 17:00:00', 'completed', 1.31, 55.72, 'U6', 'D9', 'RT1', 'L12', 'L13', NULL),
  ('R7', '2026-10-11 16:00:00', 'completed', 2.34, 107.78, 'U7', 'D10', 'RT2', 'L14', 'L15', 'P3'),
  ('R8', '2026-10-13 15:00:00', 'completed', 0.89, 38.9, 'U8', 'D3', 'RT3', 'L5', 'L6', NULL),
  ('R9', '2026-10-14 14:00:00', 'completed', 1.54, 29.24, 'U9', 'D2', 'RT4', 'L3', 'L1', NULL),
  ('R10', '2026-10-16 18:00:00', 'completed', 1.36, 50.69, 'U10', 'D5', 'RT1', 'L8', 'L9', 'P2'),
  ('R11', '2026-10-17 17:00:00', 'completed', 2.34, 68.08, 'U1', 'D10', 'RT1', 'L15', 'L14', NULL),
  ('R12', '2026-10-18 16:00:00', 'cancelled', 5.26, 103.12, 'U2', 'D3', 'RT1', 'L6', 'L2', NULL),
  ('R13', '2026-10-20 15:00:00', 'completed', 5.56, 85.6, 'U3', 'D8', 'RT3', 'L11', 'L10', NULL),
  ('R14', '2026-10-21 14:00:00', 'completed', 1.31, 106.2, 'U4', 'D9', 'RT2', 'L13', 'L12', NULL),
  ('R15', '2026-10-23 18:00:00', 'completed', 4.97, 79.71, 'U5', 'D2', 'RT1', 'L1', 'L5', 'P1'),
  ('R16', '2026-10-25 17:00:00', 'completed', 2.4, 68.8, 'U6', 'D5', 'RT1', 'L9', 'L7', NULL),
  ('R17', '2026-10-27 16:00:00', 'completed', 1.6, 29.6, 'U7', 'D4', 'RT4', 'L4', 'L6', NULL),
  ('R18', '2026-10-28 15:00:00', 'cancelled', 5.74, 108.88, 'U8', 'D9', 'RT1', 'L12', 'L1', NULL),
  ('R19', '2026-10-30 14:00:00', 'completed', 1.48, 44.8, 'U9', 'D2', 'RT3', 'L2', 'L3', NULL),
  ('R20', '2026-10-31 18:00:00', 'completed', 7.11, 222.2, 'U10', 'D10', 'RT2', 'L14', 'L7', NULL),
  ('R21', '2026-10-24 17:00:00', 'completed', 4.97, 99.64, 'U1', 'D11', 'RT1', 'L1', 'L5', NULL),
  ('R22', '2026-10-26 16:00:00', 'completed', 3.9, 142.2, 'U2', 'D11', 'RT2', 'L2', 'L4', 'P2'),
  ('R23', '2026-10-29 15:00:00', 'completed', 5.31, 103.72, 'U3', 'D11', 'RT1', 'L3', 'L7', NULL),
  ('R24', '2026-10-31 14:00:00', 'completed', 6.4, 208.0, 'U4', 'D11', 'RT2', 'L1', 'L14', NULL);

INSERT INTO payments (payment_id, ride_id, amount, method, status) VALUES
  ('PAY1', 'R1', 87.52, 'upi', 'paid'),
  ('PAY2', 'R2', 168.48, 'card', 'paid'),
  ('PAY3', 'R3', 143.32, 'cash', 'paid'),
  ('PAY4', 'R4', 33.2, 'upi', 'paid'),
  ('PAY6', 'R6', 55.72, 'upi', 'paid'),
  ('PAY7', 'R7', 107.78, 'card', 'paid'),
  ('PAY8', 'R8', 38.9, 'cash', 'paid'),
  ('PAY9', 'R9', 29.24, 'upi', 'paid'),
  ('PAY10', 'R10', 50.69, 'upi', 'paid'),
  ('PAY11', 'R11', 68.08, 'cash', 'paid'),
  ('PAY13', 'R13', 85.6, 'cash', 'paid'),
  ('PAY14', 'R14', 106.2, 'card', 'paid'),
  ('PAY15', 'R15', 79.71, 'upi', 'paid'),
  ('PAY16', 'R16', 68.8, 'upi', 'paid'),
  ('PAY17', 'R17', 29.6, 'cash', 'paid'),
  ('PAY19', 'R19', 44.8, 'upi', 'paid'),
  ('PAY20', 'R20', 222.2, 'card', 'paid'),
  ('PAY21', 'R21', 99.64, 'upi', 'paid'),
  ('PAY22', 'R22', 142.2, 'card', 'paid'),
  ('PAY23', 'R23', 103.72, 'cash', 'paid'),
  ('PAY24', 'R24', 208.0, 'upi', 'paid');

INSERT INTO ratings (rating_id, ride_id, score, comment) VALUES
  ('RT1', 'R1', 5, 'Smooth ride, polite driver'),
  ('RT2', 'R2', 4, 'Comfortable car'),
  ('RT3', 'R3', 4, 'On time'),
  ('RT4', 'R4', 5, 'Quick trip'),
  ('RT6', 'R6', 3, 'Driver took a longer route'),
  ('RT7', 'R7', 5, 'Excellent service'),
  ('RT8', 'R8', 4, 'Good'),
  ('RT9', 'R9', 5, 'Very fast'),
  ('RT10', 'R10', 4, 'Nice driver'),
  ('RT11', 'R11', 4, 'Okay ride'),
  ('RT13', 'R13', 3, 'Auto was a bit noisy'),
  ('RT14', 'R14', 5, 'Luxurious!'),
  ('RT15', 'R15', 5, 'Great'),
  ('RT16', 'R16', 4, 'Good ride'),
  ('RT17', 'R17', 4, 'Quick bike taxi'),
  ('RT19', 'R19', 5, 'Perfect'),
  ('RT20', 'R20', 4, 'Long but comfortable ride'),
  ('RT21', 'R21', 5, 'Very professional driver'),
  ('RT22', 'R22', 5, 'Spotless car, smooth driving'),
  ('RT23', 'R23', 4, 'Good ride'),
  ('RT24', 'R24', 5, 'Reached early, great service');

INSERT INTO cancellations (cancellation_id, ride_id, reason, cancelled_by) VALUES
  ('C5', 'R5', 'Changed my plans', 'rider'),
  ('C12', 'R12', 'Driver taking too long', 'rider'),
  ('C18', 'R18', 'Vehicle breakdown', 'driver');

-- derived value: each driver's rating_avg = average score of their rated rides
UPDATE drivers SET rating_avg = (SELECT ROUND(AVG(rt.score), 2) FROM ratings rt JOIN rides r ON r.ride_id = rt.ride_id WHERE r.driver_id = drivers.driver_id)
WHERE driver_id IN (SELECT r.driver_id FROM rides r JOIN ratings rt ON rt.ride_id = r.ride_id);

COMMIT;
