"""
utils.py - small helper functions (no database code here).
"""
import math


def haversine_km(lat1, lon1, lat2, lon2):
    """
    Haversine formula: straight-line ("as the crow flies") distance in km
    between two latitude/longitude points on the Earth's surface.
    """
    R = 6371.0  # radius of the Earth in km
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def calc_fare(base_fare, per_km_rate, distance_km, discount_percent=0):
    """Fare = base_fare + per_km_rate * distance_km, then minus promo discount.
    Returns (fare_before_discount, fare_after_discount)."""
    gross = base_fare + per_km_rate * distance_km
    net = gross * (1 - discount_percent / 100.0)
    return round(gross, 2), round(net, 2)
