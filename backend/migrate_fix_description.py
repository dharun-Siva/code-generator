"""
Migration script to fix description column constraint
Allows description to be nullable or empty
"""

from database import SessionLocal, engine
from sqlalchemy import text

def fix_description_constraint():
    """Alter description column to allow NULL/empty values"""
    db = SessionLocal()
    try:
        print("Altering description column to allow NULL values...")
        
        # PostgreSQL syntax to alter column to allow NULL
        db.execute(text("""
            ALTER TABLE project_items
            ALTER COLUMN description DROP NOT NULL,
            ALTER COLUMN description SET DEFAULT NULL
        """))
        
        db.commit()
        print("✅ Description column constraint removed successfully!")
        print("The description column now allows NULL values.")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_description_constraint()
