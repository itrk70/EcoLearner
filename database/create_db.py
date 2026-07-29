"""
create_db.py
============
Run this file ONCE to build the actual ecolearner.db file from
schema.sql. If you ever change schema.sql (add a column, add a table),
delete ecolearner.db and re-run this script to rebuild it fresh.

Why a separate script instead of just opening schema.sql in DB Browser?
Because this is repeatable and works the same way for every teammate -
anyone can clone the project, run this one file, and get an identical
database, without having to click through a GUI.
"""

import sqlite3
import os

# Names of the schema file (input) and database file (output).
# Using os.path so this works no matter which folder you run the
# script from.
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), "schema.sql")
DB_FILE = os.path.join(os.path.dirname(__file__), "ecolearner.db")


def create_database():
    # Safety check: if ecolearner.db already exists, running the schema
    # again would fail (you can't CREATE TABLE Users if Users already
    # exists). So we just warn and stop, rather than silently doing
    # nothing or crashing with a confusing error.
    if os.path.exists(DB_FILE):
        print(f"'{DB_FILE}' already exists - delete it first if you want to rebuild from scratch.")
        return

    # Read the whole schema.sql file into one big string of SQL commands.
    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    # connect() creates ecolearner.db the moment we connect, since it
    # doesn't exist yet.
    connection = sqlite3.connect(DB_FILE)

    # executescript() (instead of execute()) lets us run a whole file's
    # worth of SQL statements at once, rather than one at a time.
    connection.executescript(schema_sql)

    # Save all the CREATE TABLE / INSERT commands permanently to the file.
    connection.commit()
    connection.close()

    print(f"Success! Created '{DB_FILE}' with all 5 tables and seed badge data.")


if __name__ == "__main__":
    create_database()
