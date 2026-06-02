#!/usr/bin/env python3
"""
Migration script to add github_repo_url column to chats table
Run this if you have existing database and get AlchemyError about missing column
"""

import sqlalchemy as sa
from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as connection:
        try:
            # Check if column already exists
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='chats' AND column_name='github_repo_url'"
            ))
            if result.fetchone():
                print("✓ github_repo_url column already exists")
                return
        except:
            # PostgreSQL check failed, try SQLite approach
            pass
        
        try:
            # SQLite version
            connection.execute(text(
                "ALTER TABLE chats ADD COLUMN github_repo_url VARCHAR(255)"
            ))
            connection.commit()
            print("✓ Successfully added github_repo_url column to chats table")
        except Exception as e:
            print(f"✗ Error adding column: {e}")
            
            # Try PostgreSQL version
            try:
                connection.execute(text(
                    "ALTER TABLE chats ADD COLUMN IF NOT EXISTS github_repo_url VARCHAR(255)"
                ))
                connection.commit()
                print("✓ Successfully added github_repo_url column (PostgreSQL)")
            except Exception as e2:
                print(f"✗ Migration failed: {e2}")

if __name__ == "__main__":
    migrate()
