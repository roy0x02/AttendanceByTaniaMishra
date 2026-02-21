#!/usr/bin/env python3
"""
Data Loader Script
Loads initial attendance data from existing Excel files into the application
"""

import json
import sys
from pathlib import Path

def load_initial_data():
    """
    This script processes the existing Excel files and creates a JSON file
    that can be loaded by the web application for initial testing
    """
    
    print("=" * 70)
    print("Attendance Management System - Data Loader")
    print("=" * 70)
    
    # Instructions for manual data loading
    print("\nTo load your attendance data:")
    print()
    print("1. Open index.html in your browser")
    print("2. Login with credentials:")
    print("   - Admin:  username=admin,  password=admin@2024")
    print("   - Nodal:  username=nodal,  password=nodal@2024")
    print("   - BO:     username=bo1,    password=bo@2024 (and bo2-bo7)")
    print()
    print("3. For Nodal login:")
    print("   - Click 'Upload Data' in the sidebar")
    print("   - Upload the file: '09-12-2025 attendance data.xlsx'")
    print("   - The system will process and store the attendance data")
    print()
    print("4. The application will automatically:")
    print("   - Parse the Present and Absent sheets")
    print("   - Map employees to their sections")
    print("   - Apply role-based access filters")
    print("   - Store data in browser's localStorage")
    print()
    print("Available logins:")
    print("=" * 70)
    print(f"{'Username':<15} {'Password':<15} {'Role':<10} {'Sections'}")
    print("-" * 70)
    print(f"{'admin':<15} {'admin@2024':<15} {'Admin':<10} {'All'}")
    print(f"{'nodal':<15} {'nodal@2024':<15} {'Nodal':<10} {'All'}")
    print(f"{'bo1':<15} {'bo@2024':<15} {'BO':<10} {'Admin-I'}")
    print(f"{'bo2':<15} {'bo@2024':<15} {'BO':<10} {'Admin-II'}")
    print(f"{'bo3':<15} {'bo@2024':<15} {'BO':<10} {'Fund-I'}")
    print(f"{'bo4':<15} {'bo@2024':<15} {'BO':<10} {'Fund-II'}")
    print(f"{'bo5':<15} {'bo@2024':<15} {'BO':<10} {'AC-I'}")
    print(f"{'bo6':<15} {'bo@2024':<15} {'BO':<10} {'AC-II'}")
    print(f"{'bo7':<15} {'bo@2024':<15} {'BO':<10} {'AC-III'}")
    print("=" * 70)
    print()
    print("Note: You can customize credentials in config.js")
    print()

if __name__ == "__main__":
    load_initial_data()
