#!/usr/bin/env python3
"""
Corrected analysis script for BO-Section mapping
"""

import pandas as pd
import json
from collections import defaultdict

print("="*100)
print("COMPLETE BO-SECTION-PEOPLE MAPPING ANALYSIS")
print("="*100)

# 1. Read BO to Section mapping
print("\n[1] Reading BO assignments from 'Details of SAO.xlsx'...")
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
                'sections': current_sections.copy()
            }
        current_bo_num = int(col0)
        current_bo_name = col1
        current_sections = [col2] if col2 and col2 != 'nan' else []
    elif col2 and col2 != 'nan' and current_bo_num:
        current_sections.append(col2)

if current_bo_num and current_bo_name:
    bo_mapping[current_bo_num] = {
        'name': current_bo_name,
        'sections': current_sections.copy()
    }

print(f"   ✓ Found {len(bo_mapping)} Branch Officers\n")

# 2. Read People data from Administration Group file
print("[2] Reading people data from 'Admin Accounts and Fund Group wise Data.xlsx'...")
df_people_raw = pd.read_excel('/Users/naaa/Desktop/attendance/Admin Accounts and Fund Group wise Data.xlsx', sheet_name=0)

# The actual headers are in row 0, data starts from row 1
df_people = df_people_raw.iloc[1:].copy()  # Skip the header row
df_people.columns = ['SerialNo', 'Name', 'Designation', 'Section']  # Rename for clarity
df_people = df_people.reset_index(drop=True)

# Clean section names
df_people['Section'] = df_people['Section'].str.strip()

print(f"   ✓ Total people in Admin/Accounts/Fund groups: {len(df_people)}\n")

# Count people per section
section_counts = df_people['Section'].value_counts()
print(f"   People distribution (top 20 sections):")
for section, count in section_counts.head(20).items():
    print(f"      {section}: {count} people")

unique_sections_in_data = set(df_people['Section'].dropna().unique())
print(f"\n   ✓ Total unique sections in people data: {len(unique_sections_in_data)}\n")

# 3. Cross-reference sections
print("[3] Cross-referencing BO sections with people data...")

all_bo_sections = set()
for bo in bo_mapping.values():
    for section in bo['sections']:
        # Clean up section names - they might have multiple sections listed
        all_bo_sections.add(section.strip())

print(f"   BO-assigned sections: {len(all_bo_sections)}")
print(f"   Sections in people data: {len(unique_sections_in_data)}\n")

# Try to find matches (exact and partial)
exact_matches = all_bo_sections.intersection(unique_sections_in_data)
print(f"   Exact matches: {len(exact_matches)}")
if exact_matches:
    for sec in list(exact_matches)[:5]:
        print(f"      - {sec}")

# Check for partial matches (BO section strings might contain multiple section names)
print(f"\n   Analyzing section name patterns...")
print(f"   Sample BO section strings:")
for section in list(all_bo_sections)[:10]:
    print(f"      - '{section}'")

print(f"\n   Sample people data sections:")
for section in list(unique_sections_in_data)[:10]:
    print(f"      - '{section}'")

# 4. Create intelligent mapping
print("\n[4] Creating Section -> BO mapping...")

# For each person's section, find which BO it belongs to
section_to_bo = {}

for person_section in unique_sections_in_data:
    for bo_num, bo_data in bo_mapping.items():
        for bo_section_string in bo_data['sections']:
            # Check if person's section is mentioned in the BO's section string
            # This handles cases like "Admin-I, CR Cell" matching "ADMINISTRATION-I"
            if person_section.upper() in bo_section_string.upper() or \
               bo_section_string.upper() in person_section.upper() or \
               person_section.replace('-', '').replace(' ', '').upper() in bo_section_string.replace('-', '').replace(' ', '').upper():
                section_to_bo[person_section] = bo_num
                break
        if person_section in section_to_bo:
            break

print(f"   ✓ Mapped {len(section_to_bo)} sections to BOs\n")

# 5. Count people per BO
print("[5] Computing people count per BO...")
bo_people_count = defaultdict(int)
bo_section_details = defaultdict(lambda: defaultdict(int))

for idx, row in df_people.iterrows():
    section = row['Section']
    if pd.notna(section) and section in section_to_bo:
        bo_num = section_to_bo[section]
        bo_people_count[bo_num] += 1
        bo_section_details[bo_num][section] += 1

unassigned_count = 0
unassigned_sections = []
for idx, row in df_people.iterrows():
    section = row['Section']
    if pd.notna(section) and section not in section_to_bo:
        unassigned_count += 1
        if section not in unassigned_sections:
            unassigned_sections.append(section)

print(f"\n   People count per  BO:")
for bo_num in sorted(bo_people_count.keys())[:20]:
    bo_name = bo_mapping[bo_num]['name']
    count = bo_people_count[bo_num]
    sections = list(bo_section_details[bo_num].keys())
    print(f"   BO{bo_num:2d} ({bo_name}): {count:3d} people across {len(sections)} section(s)")

print(f"\n   ⚠ People NOT assigned to any BO: {unassigned_count}")
if unassigned_sections:
    print(f"   Unassigned sections ({len(unassigned_sections)}):")
    for sec in unassigned_sections[:10]:
        count = section_counts.get(sec, 0)
        print(f"      - {sec} ({count} people)")

# 6. Generate config
print("\n[6] Generating application config...")

config_output = {
    'bo_users': {},
    'section_to_bo': section_to_bo,
    'statistics': {
        'total_bos': len(bo_mapping),
        'total_people': len(df_people),
        'mapped_people': len(df_people) - unassigned_count,
        'unmapped_people': unassigned_count
    }
}

for bo_num, bo_data in bo_mapping.items():
    username = f"bo{bo_num}"
    config_output['bo_users'][username] = {
        'bo_number': bo_num,
        'name': bo_data['name'],
        'assigned_sections': bo_data['sections'],
        'actual_sections_in_data': list(bo_section_details.get(bo_num, {}).keys()),
        'people_count': bo_people_count.get(bo_num, 0)
    }

with open('/Users/naaa/Desktop/attendance/bo_mapping_correct.json', 'w', encoding='utf-8') as f:
    json.dump(config_output, f, indent=2, ensure_ascii=False)

print(f"   ✓ Saved to: bo_mapping_correct.json")

#7. Generate config.js snippet
print("\n[7] Generating config.js format...")
print("="*100)
print("\n// Complete USER_CONFIG for all 39 BOs")
print("const USER_CONFIG = {")
print("  // Nodal Officer")
print("  'nodal': {")
print("    name: 'Nodal Officer',")
print("    role: 'nodal',")
print("    sections: [] // Can see all sections")
print("  },\n")

for bo_num in sorted(bo_mapping.keys()):
    username = f"bo{bo_num}"
    bo_data = bo_mapping[bo_num]
    actual_sections = list(bo_section_details.get(bo_num, {}).keys())
    
    print(f"  '{username}': {{")
    print(f"    name: {json.dumps(bo_data['name'])},")
    print(f"    role: 'bo',")
    print(f"    bo_number: {bo_num},")
    print(f"    sections: {json.dumps(actual_sections)},  // {bo_people_count.get(bo_num, 0)} people")
    print(f"  }},\n")

print("};")

print("\n" + "="*100)
print("ANALYSIS COMPLETE!")
print(f"Total: {len(bo_mapping)} BOs, {len(df_people)} people, {len(section_to_bo)} sections mapped")
print("="*100)
