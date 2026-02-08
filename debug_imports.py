import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

print("Checking imports...")
try:
    import recognition_model.model.imports
    print("SUCCESS: recognition_model.model.imports loaded")
except ImportError as e:
    print(f"FAILURE: {e}")
except Exception as e:
    print(f"ERROR: {e}")

print("\nChecking face_recognition...")
try:
    import face_recognition
    print("SUCCESS: face_recognition loaded")
except ImportError as e:
    print(f"FAILURE: {e}")
