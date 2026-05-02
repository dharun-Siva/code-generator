"""
Migration script to add epic_title and story_title columns to project_items table
Run this once to update the database schema
"""

from database import SessionLocal, engine
from sqlalchemy import text

def add_columns():
    """Add missing columns to project_items table"""
    db = SessionLocal()
    try:
        # Check if epic_title column exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='project_items' AND column_name='epic_title'
        """))
        
        if result.fetchone() is None:
            print("Adding epic_title column...")
            db.execute(text("""
                ALTER TABLE project_items 
                ADD COLUMN epic_title VARCHAR NOT NULL DEFAULT 'Untitled Epic'
            """))
            print("✓ epic_title column added")
        else:
            print("✓ epic_title column already exists")
        
        # Check if story_title column exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='project_items' AND column_name='story_title'
        """))
        
        if result.fetchone() is None:
            print("Adding story_title column...")
            db.execute(text("""
                ALTER TABLE project_items 
                ADD COLUMN story_title VARCHAR
            """))
            print("✓ story_title column added")
        else:
            print("✓ story_title column already exists")
        
        db.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting database migration...")
    add_columns()
