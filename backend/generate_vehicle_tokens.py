#!/usr/bin/env python3
"""
Generate API tokens for vehicles
Run this once to generate tokens for existing vehicles
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.models import db, Vehicle

def generate_tokens():
    """Generate API tokens for all vehicles without one"""
    with app.app_context():
        vehicles = Vehicle.query.filter(Vehicle.api_token.is_(None)).all()

        if not vehicles:
            print("All vehicles already have API tokens.")
            return

        print(f"Generating API tokens for {len(vehicles)} vehicles...")

        for vehicle in vehicles:
            token = vehicle.generate_api_token()
            print(f"  {vehicle.name} (device_id: {vehicle.device_id})")
            print(f"    Token: {token}")

        db.session.commit()
        print(f"\n✓ Successfully generated {len(vehicles)} API tokens")
        print("\n⚠️  IMPORTANT: Save these tokens securely!")
        print("   These tokens are required for GPS data submission.")

if __name__ == '__main__':
    generate_tokens()
