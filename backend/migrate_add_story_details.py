"""
Migration script to add story_details column to project_items table
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    exit(1)

# Create engine
engine = create_engine(DATABASE_URL)

def run_migration():
    """Add or convert story_details column to JSONB in project_items table"""
    try:
        with engine.connect() as conn:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name, data_type
                FROM information_schema.columns 
                WHERE table_name='project_items' AND column_name='story_details'
            """))
            
            column_info = result.fetchone()
            if column_info:
                column_type = column_info[1]
                if column_type.upper() == 'JSONB':
                    print("✓ Column 'story_details' already exists as JSONB type")
                    return
                else:
                    # Convert TEXT to JSONB
                    print(f"Converting 'story_details' column from {column_type} to JSONB...")
                    conn.execute(text("""
                        ALTER TABLE project_items 
                        ALTER COLUMN story_details TYPE jsonb USING story_details::jsonb
                    """))
                    conn.commit()
                    print("✓ Successfully converted 'story_details' column to JSONB type")
                    return
            
            # Add the column as JSONB if it doesn't exist
            conn.execute(text("""
                ALTER TABLE project_items 
                ADD COLUMN story_details JSONB DEFAULT NULL
            """))
            
            conn.commit()
            print("✓ Successfully added 'story_details' column as JSONB type to project_items table")
    except Exception as e:
        print(f"✗ Error running migration: {str(e)}")
        raise

if __name__ == "__main__":
    print("Running migration: Add story_details column...")
    run_migration()
    print("Migration complete!")
