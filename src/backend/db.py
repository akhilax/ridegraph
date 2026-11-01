"""
db.py - connects Python to Neo4j.
We create ONE driver for the whole app (the driver manages a pool of
connections for us) and give other files two helper functions:
  run_read()  -> for queries that only read data
  run_write() -> for queries that change data
"""
import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Read the secrets from backend/.env (so the password is not in the code)
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "")
DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))


def run_read(query, **params):
    """Run a read query; returns a list of dicts (one per result row)."""
    records, _, _ = driver.execute_query(
        query, parameters_=params, database_=DATABASE, routing_="r")
    return [r.data() for r in records]


def run_write(query, **params):
    """Run a write query; returns a list of dicts."""
    records, _, _ = driver.execute_query(
        query, parameters_=params, database_=DATABASE, routing_="w")
    return [r.data() for r in records]
