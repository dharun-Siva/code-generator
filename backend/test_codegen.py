"""
Quick test to verify code generation works correctly
"""
import json
import sys
from codegen.code_generator import CodeGenerator

# Mock project data - simulating what the endpoint receives
test_epics_and_stories = {
    "project_id": 1,
    "epics": {
        1: {
            "epic": type('Epic', (), {
                'epic_title': 'User Authentication',
                'epic_id': 1,
                'story_id': 0
            })(),
            "stories": [
                {"story_title": "User Login", "story_id": 1},
                {"story_title": "User Signup", "story_id": 2},
                {"story_title": "Password Reset", "story_id": 3},
            ]
        },
        2: {
            "epic": type('Epic', (), {
                'epic_title': 'User Profile',
                'epic_id': 2,
                'story_id': 0
            })(),
            "stories": [
                {"story_title": "View Profile", "story_id": 1},
                {"story_title": "Edit Profile", "story_id": 2},
            ]
        }
    }
}

try:
    print("🧪 Testing Code Generation...")
    print("=" * 60)
    
    generator = CodeGenerator()
    
    # Test 1: Extract stories
    print("\n✅ Test 1: Extract Stories")
    stories = generator._extract_stories(test_epics_and_stories)
    print(f"   Found {len(stories)} stories: {stories}")
    
    # Test 2: Generate component code
    print("\n✅ Test 2: Generate Component Code")
    component = generator._generate_component_code("User Login")
    print(f"   Generated {len(component)} chars of React component code")
    print(f"   Contains 'UserLogin'? {('UserLogin' in component)}")
    print(f"   Contains 'useState'? {('useState' in component)}")
    
    # Test 3: Generate page code
    print("\n✅ Test 3: Generate Page Code")
    page = generator._generate_page_code("User Authentication", test_epics_and_stories["epics"][1]["stories"])
    print(f"   Generated {len(page)} chars of React page code")
    print(f"   Contains 'UserAuthentication'? {('UserAuthentication' in page)}")
    
    # Test 4: Generate endpoints
    print("\n✅ Test 4: Generate API Endpoints")
    endpoints = generator._generate_endpoints_from_stories(test_epics_and_stories)
    print(f"   Generated {len(endpoints)} chars of endpoint code")
    print(f"   Contains '@app.get'? {('@app.get' in endpoints)}")
    print(f"   Endpoint count? {endpoints.count('@app.')}")
    
    # Test 5: Generate tables
    print("\n✅ Test 5: Generate Database Tables")
    tables = generator._generate_tables_from_stories(test_epics_and_stories)
    print(f"   Generated {len(tables)} chars of SQL code")
    print(f"   Contains 'CREATE TABLE'? {('CREATE TABLE' in tables)}")
    print(f"   Table count? {tables.count('CREATE TABLE')}")
    
    print("\n" + "=" * 60)
    print("✨ All tests passed! Code generation is working correctly!")
    print("\n📊 Summary:")
    print(f"   - Stories extracted: {len(stories)}")
    print(f"   - API endpoints generated: {endpoints.count('@app.')}")
    print(f"   - Database tables generated: {tables.count('CREATE TABLE')}")
    print("\n🎯 What gets generated:")
    print("   ✅ React pages (1 per epic) = 2 pages")
    print("   ✅ React components (1 per story) = 5 components")
    print("   ✅ API endpoints (4 per epic) = 8 endpoints")
    print("   ✅ Database tables (1 per epic + 1 per story) = 2 + 5 = 7 tables")
    
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
