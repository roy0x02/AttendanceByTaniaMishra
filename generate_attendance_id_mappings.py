#!/usr/bin/env python3
"""
Generate Attendance Id-based Mapping Files
Reads master data 2.xlsx and generates JSON mapping files for the attendance system
"""

import pandas as pd
import json
from datetime import datetime

def generate_mappings():
    """Generate all required mapping files from master data 2.xlsx"""
    
    print("=" * 80)
    print("GENERATING ATTENDANCE ID MAPPINGS")
    print("=" * 80)
    print(f"\nTimestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Read the Combines sheet - main employee data
    print("Reading master data 2.xlsx - Combines sheet...")
    df_employees = pd.read_excel('master data 2.xlsx', sheet_name='Combines')
    
    print(f"✓ Loaded {len(df_employees)} employees")
    print(f"✓ Verified {df_employees['Attendance Id'].nunique()} unique Attendance IDs\n")
    
    # ========================================
    # 1. ATTENDANCE_ID_TO_EMPLOYEE MAPPING
    # ========================================
    print("Generating attendance_id_to_employee.json...")
    
    attendance_id_mapping = {}
    for _, row in df_employees.iterrows():
        attendance_id_mapping[str(row['Attendance Id'])] = {
            'name': row['Name'],
            'designation': row['Designation'],
            'section': row['Section'],
            'group': row['Group']
        }
    
    with open('attendance_id_to_employee.json', 'w', encoding='utf-8') as f:
        json.dump(attendance_id_mapping, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Created attendance_id_to_employee.json with {len(attendance_id_mapping)} entries\n")
    
    # ========================================
    # 2. SECTION_TO_ATTENDANCE_IDS MAPPING
    # ========================================
    print("Generating section_to_attendance_ids.json...")
    
    section_mapping = {}
    for _, row in df_employees.iterrows():
        section = row['Section']
        attendance_id = str(row['Attendance Id'])
        
        if section not in section_mapping:
            section_mapping[section] = []
        section_mapping[section].append(attendance_id)
    
    # Sort attendance IDs within each section for consistency
    for section in section_mapping:
        section_mapping[section].sort()
    
    with open('section_to_attendance_ids.json', 'w', encoding='utf-8') as f:
        json.dump(section_mapping, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Created section_to_attendance_ids.json with {len(section_mapping)} sections\n")
    
    # ========================================
    # 3. BO_SECTION_MAPPING
    # ========================================
    print("Generating bo_section_mapping.json from List of BOs sheet...")
    
    # Read the BO sheet
    df_bos = pd.read_excel('master data 2.xlsx', sheet_name='List of BOs', header=1)
    
    # Clean up - remove completely empty rows
    df_bos = df_bos.dropna(how='all')
    
    bo_mapping = {}
    bo_count = 0
    
    for _, row in df_bos.iterrows():
        bo_name = row['Name of Branch Officer']
        sections_str = row['Sections under control']
        
        # Skip if BO name or sections are NaN
        if pd.isna(bo_name) or pd.isna(sections_str):
            continue
        
        # Skip group header rows
        if 'Group' in str(bo_name) or pd.isna(sections_str):
            continue
        
        bo_name = str(bo_name).strip()
        sections_str = str(sections_str).strip()
        
        # Parse sections (comma-separated)
        sections = [s.strip() for s in sections_str.split(',')]
        
        bo_mapping[bo_name] = sections
        bo_count += 1
    
    with open('bo_section_mapping.json', 'w', encoding='utf-8') as f:
        json.dump(bo_mapping, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Created bo_section_mapping.json with {bo_count} Branch Officers\n")
    
    # ========================================
    # SUMMARY
    # ========================================
    print("=" * 80)
    print("MAPPING GENERATION COMPLETE")
    print("=" * 80)
    print(f"\nFiles created:")
    print(f"  1. attendance_id_to_employee.json  ({len(attendance_id_mapping)} employees)")
    print(f"  2. section_to_attendance_ids.json  ({len(section_mapping)} sections)")
    print(f"  3. bo_section_mapping.json         ({bo_count} BOs)")
    
    # Sample data for verification
    print(f"\nSample Attendance ID mapping:")
    sample_id = list(attendance_id_mapping.keys())[0]
    print(f"  Attendance ID {sample_id}:")
    print(f"    → Name: {attendance_id_mapping[sample_id]['name']}")
    print(f"    → Section: {attendance_id_mapping[sample_id]['section']}")
    
    print(f"\nSample Section mapping:")
    sample_section = list(section_mapping.keys())[0]
    print(f"  Section '{sample_section}':")
    print(f"    → {len(section_mapping[sample_section])} employees")
    print(f"    → IDs: {', '.join(section_mapping[sample_section][:5])}...")
    
    print("\n✓ All mappings generated successfully!\n")

if __name__ == '__main__':
    generate_mappings()
