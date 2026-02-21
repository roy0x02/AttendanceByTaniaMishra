#!/usr/bin/env python3
"""
Complete mapping: Group (from attendance) → Section (from people file) → BO (from SAO file)
"""

import pandas as pd
import json
from collections import defaultdict
import re

print("="*100)
print("COMPLETE GROUP → SECTION → BO MAPPING ANALYSIS")
print("="*100)

# STEP 1: Read BO to Section mapping from "Details of SAO.xlsx"
print("\n[STEP 1] Reading BO assignments from 'Details of SAO.xlsx'...")
df_sao = pd.read_excel('/Users/naaa/Desktop/attendance/Details of SAO.xlsx', sheet_name=0)

bo_mapping = {}
current_bo_num = None
current_bo_name = None
current_sections = []

for idx, row in df_sao.iterrows():
    col0 = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
    col1 = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ''
    col2 = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ''
    
    if col0.isdigit():
        if current_bo_num and current_bo_name:
            bo_mapping[current_bo_num] = {
                'name': current_bo_name,
                'assigned_sections': current_sections.copy()
            }
        current_bo_num = int(col0)
        current_bo_name = col1
        current_sections = [col2] if col2 and col2 != 'nan' else []
    elif col2 and col2 != 'nan' and current_bo_num:
        current_sections.append(col2)

if current_bo_num and current_bo_name:
    bo_mapping[current_bo_num] = {
        'name': current_bo_name,
        'assigned_sections': current_sections.copy()
    }

print(f"   ✓ Found {len(bo_mapping)} Branch Officers")

# STEP 2: Read attendance file to understand Group structure
print("\n[STEP 2] Analyzing  attendance data (09-12-2025 attendance data.xlsx)...")
df_attendance = pd.read_excel('/Users/naaa/Desktop/attendance/09-12-2025 attendance data.xlsx', sheet_name=0)

# Extract Group from "Division/Units" column
df_attendance['Group'] = df_attendance[' Division/Units'].str.extract(r'(.*?)\s+Group')[0]
df_attendance['Group'] = df_attendance['Group'].str.strip()

unique_groups = df_attendance['Group'].dropna().unique()
print(f"   Groups found in attendance data: {sorted(unique_groups)}")

group_counts = df_attendance['Group'].value_counts()
print(f"\n   Attendance records per group:")
for group, count in group_counts.items():
    print(f"      {group}: {count} records")

# STEP 3: Read People/Section/Group mapping
print("\n[STEP 3] Reading people data with sections...")

# The file contains Admin/Accounts/Fund groups
df_people_raw = pd.read_excel('/Users/naaa/Desktop/attendance/Admin Accounts and Fund Group wise Data.xlsx', sheet_name=0)
df_people = df_people_raw.iloc[1:].copy()
df_people.columns = ['SerialNo', 'Name', 'Designation', 'Section']
df_people = df_people.reset_index(drop=True)
df_people['Section'] = df_people['Section'].str.strip()

# Infer Group from filename - this file contains "Administration Group"
# We need to check the file title
file_title = df_people_raw.iloc[0, 0]
print(f"   File title: {file_title}")

# Extract group from file title
if 'Administration' in file_title:
    df_people['Group'] = 'Administration'
elif 'Accounts' in file_title:
    df_people['Group'] = 'Accounts'
elif 'Fund' in file_title:
    df_people['Group'] = 'Fund'
else:
    df_people['Group'] = 'Unknown'

print(f"   ✓ Loaded {len(df_people)} people from {df_people['Group'].iloc[0]} Group")

# Show section distribution
section_counts = df_people['Section'].value_counts()
print(f"\n   Top sections in people data:")
for section, count in section_counts.head(15).items():
    print(f"      {section}: {count} people")

# STEP 4: Create Section → BO mapping using intelligent matching
print("\n[STEP 4] Creating Section → BO mapping...")

def normalize_section_name(s):
    """Normalize section names for matching"""
    s = s.upper()
    s = re.sub(r'[^A-Z0-9]', '', s)  # Remove all non-alphanumeric
    return s

section_to_bo = {}
matched_sections = []
unmatched_sections = []

for person_section in df_people['Section'].unique():
    if pd.isna(person_section):
        continue
        
    norm_person = normalize_section_name(person_section)
    matched = False
    
    for bo_num, bo_data in bo_mapping.items():
        for bo_section_string in bo_data['assigned_sections']:
            norm_bo = normalize_section_name(bo_section_string)
            
            # Check if normalized names match or contain each other
            if norm_person in norm_bo or norm_bo in norm_person:
                section_to_bo[person_section] = bo_num
                matched_sections.append(person_section)
                matched = True
                break
            
            # Also check partial matches for multi-section strings
            # Like "Admin-I, CR Cell" should match both "ADMINISTRATION-I" and "C.R.CELL"
            bo_parts = re.split(r'[,;]', bo_section_string)
            for part in bo_parts:
                norm_part = normalize_section_name(part)
                if norm_part and (norm_person in norm_part or norm_part in norm_person):
                    section_to_bo[person_section] = bo_num
                    matched_sections.append(person_section)
                    matched = True
                    break
            
            if matched:
                break
        if matched:
            break
    
    if not matched:
        unmatched_sections.append(person_section)

print(f"   ✓ Mapped {len(matched_sections)} sections to BOs")
print(f"   ⚠ Unmapped {len(unmatched_sections)} sections")

if unmatched_sections:
    print(f"\n   Unmapped sections:")
    for section in unmatched_sections[:15]:
        count = section_counts.get(section, 0)
        print(f"      - {section} ({count} people)")

# STEP 5: Calculate people per BO
print("\n[STEP 5] Computing people count per BO...")

bo_stats = defaultdict(lambda: {
    'people_count': 0,
    'sections': set()
})

for idx, row in df_people.iterrows():
    section = row['Section']
    if pd.notna(section) and section in section_to_bo:
        bo_num = section_to_bo[section]
        bo_stats[bo_num]['people_count'] += 1
        bo_stats[bo_num]['sections'].add(section)

print(f"\n   People distribution across BOs:")
for bo_num in sorted(bo_stats.keys()):
    stats = bo_stats[bo_num]
    bo_name = bo_mapping[bo_num]['name']
    print(f"   BO{bo_num:2d} ({bo_name})")
    print(f"        → {stats['people_count']} people across {len(stats['sections'])} sections")

unmapped_count = sum(1 for _, row in df_people.iterrows() 
                     if pd.notna(row['Section']) and row['Section'] not in section_to_bo)
print(f"\n   ⚠ Total unmapped people: {unmapped_count}/{len(df_people)}")

# STEP 6: Generate config.js
print("\n[STEP 6] Generating config.js with all 39 BOs...")

config_js = """// Auto-generated configuration for 39 Branch Officers
// Generated from Excel data analysis

const USER_CONFIG = {
  // Nodal Officer - can upload and view all data
  'nodal': {
    name: 'Nodal Officer',
    role: 'nodal',
    sections: []  // Empty means all sections
  },

"""

for bo_num in sorted(bo_mapping.keys()):
    username = f"bo{bo_num}"
    bo_data = bo_mapping[bo_num]
    sections_list = sorted(list(bo_stats[bo_num]['sections'])) if bo_num in bo_stats else []
    people_count = bo_stats[bo_num]['people_count'] if bo_num in bo_stats else 0
    
    config_js += f"  // BO{bo_num}: {people_count} people\n"
    config_js += f"  '{username}': {{\n"
    config_js += f"    name: {json.dumps(bo_data['name'])},\n"
    config_js += f"    role: 'bo',\n"
    config_js += f"    sections: {json.dumps(sections_list)}\n"
    config_js += f"  }},\n\n"

config_js += "};\n\n"
config_js += "// Password for all BO accounts: bo@2024\n"
config_js += "const BO_PASSWORD = 'bo@2024';\n"

# Save to file
with open('/Users/naaa/Desktop/attendance/config_39bos.js', 'w', encoding='utf-8') as f:
    f.write(config_js)

print(f"   ✓ Saved complete config to: config_39bos.js")

# STEP 7: Save detailed mapping for reference
mapping_data = {
    'total_bos': len(bo_mapping),
    'total_people_in_file': len(df_people),
    'mapped_people': len(df_people) - unmapped_count,
    'unmapped_people': unmapped_count,
    'section_to_bo_mapping': section_to_bo,
    'bo_details': {}
}

for bo_num, bo_data in bo_mapping.items():
    mapping_data['bo_details'][f'bo{bo_num}'] = {
        'bo_number': bo_num,
        'name': bo_data['name'],
        'assigned_sections_raw': bo_data['assigned_sections'],
        'actual_sections_found': sorted(list(bo_stats[bo_num]['sections'])) if bo_num in bo_stats else [],
        'people_count': bo_stats[bo_num]['people_count'] if bo_num in bo_stats else 0
    }

with open('/Users/naaa/Desktop/attendance/bo_complete_mapping.json', 'w', encoding='utf-8') as f:
    json.dump(mapping_data, f, indent=2, ensure_ascii=False)

print(f"   ✓ Saved detailed mapping to: bo_complete_mapping.json")

print("\n" + "="*100)
print("MAPPING COMPLETE!")
print(f"Summary: {len(bo_mapping)} BOs, {len(df_people) - unmapped_count}/{len(df_people)} people mapped")
print("="*100)
