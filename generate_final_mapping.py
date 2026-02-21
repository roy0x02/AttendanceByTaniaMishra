#!/usr/bin/env python3
"""
FINAL COMPLETE MAPPING: Process all groups (Admin, Fund, Accounts) and map to 39 BOs
"""

import pandas as pd
import json
from collections import defaultdict
import re

print("="*100)
print("FINAL COMPLETE MAPPING: ALL GROUPS → SECTIONS → 39 BOs")
print("="*100)

# STEP 1: Read BO assignments
print("\n[1] Loading BO assignments from 'Details of SAO.xlsx'...")
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
                'assigned_sections_raw': current_sections.copy()
            }
        current_bo_num = int(col0)
        current_bo_name = col1
        current_sections = [col2] if col2 and col2 != 'nan' else []
    elif col2 and col2 != 'nan' and current_bo_num:
        current_sections.append(col2)

if current_bo_num and current_bo_name:
    bo_mapping[current_bo_num] = {
        'name': current_bo_name,
        'assigned_sections_raw': current_sections.copy()
    }

print(f"   ✓ Loaded {len(bo_mapping)} Branch Officers\n")

# STEP 2: Read all people data from all 3 group sheets
print("[2] Loading people data from all groups...")

file_path = '/Users/naaa/Desktop/attendance/Admin Accounts and Fund Group wise Data.xlsx'
all_people = []

# Process Admin sheet
df_admin_raw = pd.read_excel(file_path, sheet_name='Admin')
df_admin = df_admin_raw.iloc[1:].copy()
df_admin.columns = ['SerialNo', 'Name', 'Designation', 'Section']
df_admin = df_admin.reset_index(drop=True)
df_admin['Section'] = df_admin['Section'].str.strip()
df_admin['Group'] = 'Administration'
all_people.append(df_admin[['Name', 'Designation', 'Section', 'Group']])
print(f"  - Admin Group: {len(df_admin)} people")

# Process Fund sheet
df_fund_raw = pd.read_excel(file_path, sheet_name='Fund')
df_fund = df_fund_raw.iloc[2:].copy()  # Skip title rows
df_fund.columns = df_fund_raw.iloc[1].tolist()  # Use row 1 as headers
df_fund = df_fund.reset_index(drop=True)
df_fund = df_fund.rename(columns={
    'Sl No': 'SerialNo',
    'Name of the Official': 'Name',
    'Designation': 'Designation',
    'Name of the section where presently posted': 'Section'
})
df_fund['Section'] = df_fund['Section'].str.strip() if 'Section' in df_fund.columns else ''
df_fund['Group'] = 'Fund'
all_people.append(df_fund[['Name', 'Designation', 'Section', 'Group']])
print(f"   - Fund Group: {len(df_fund)} people")

# Process Accounts sheet
df_accounts = pd.read_excel(file_path, sheet_name='Accounts')
# Fix column names (has trailing space)
df_accounts.columns = df_accounts.columns.str.strip()
df_accounts.columns = ['Name' if col.startswith('Name') else col for col in df_accounts.columns]
df_accounts['Group'] = 'Accounts'
all_people.append(df_accounts[['Name', 'Designation', 'Section', 'Group']])
print(f"   - Accounts Group: {len(df_accounts)} people")

# Combine all
df_all_people = pd.concat(all_people, ignore_index=True)
df_all_people = df_all_people[df_all_people['Name'].notna()]
print(f"\n   ✓ Total people across all groups: {len(df_all_people)}\n")

# STEP 3: Create normalized section matching
print("[3] Creating Section → BO mapping with intelligent matching...")

def normalize(s):
    """Normalize for matching"""
    if pd.isna(s):
        return ''
    s = str(s).upper()
    s = re.sub(r'[^A-Z0-9]', '', s)
    return s

section_to_bo = {}
bo_sections = defaultdict(set)  # Track actual sections per BO

for section in df_all_people['Section'].unique():
    if pd.isna(section) or section == '':
        continue
    
    norm_section = normalize(section)
    matched = False
    
    for bo_num, bo_data in bo_mapping.items():
        for bo_section_str in bo_data['assigned_sections_raw']:
            norm_bo = normalize(bo_section_str)
            
            # Direct match
            if norm_section in norm_bo or norm_bo in norm_section:
                section_to_bo[section] = bo_num
                bo_sections[bo_num].add(section)
                matched = True
                break
            
            # Multi-section match (e.g., "Admin-I, CR Cell")
            parts = re.split(r'[,;]', bo_section_str)
            for part in parts:
                norm_part = normalize(part.strip())
                if norm_part and len(norm_part) > 2:
                    if norm_section in norm_part or norm_part in norm_section:
                        section_to_bo[section] = bo_num
                        bo_sections[bo_num].add(section)
                        matched = True
                        break
            
            if matched:
                break
        if matched:
            break

print(f"   ✓ Mapped {len(section_to_bo)} unique sections to BOs\n")

# STEP 4: Calculate statistics per BO
print("[4] Computing people distribution per BO...")

bo_stats = defaultdict(lambda: {'count': 0, 'sections': set(), 'people': []})

for idx, row in df_all_people.iterrows():
    section = row['Section']
    if pd.notna(section) and section in section_to_bo:
        bo_num = section_to_bo[section]
        bo_stats[bo_num]['count'] += 1
        bo_stats[bo_num]['sections'].add(section)
        bo_stats[bo_num]['people'].append(row['Name'])

total_mapped = sum(stats['count'] for stats in bo_stats.values())
total_unmapped = len(df_all_people) - total_mapped

print(f"\n   BO Account Summary (sorted by people count):")
print(f"   {'BO#':<5} {'People':<8} {'Sections':<10} {'Name':<50}")
print(f"   {'-'*80}")

for bo_num in sorted(bo_stats.keys(), key=lambda x: bo_stats[x]['count'], reverse=True):
    stats = bo_stats[bo_num]
    bo_name = bo_mapping[bo_num]['name'][:45]
    print(f"   BO{bo_num:<3} {stats['count']:<8} {len(stats['sections']):<10} {bo_name}")

print(f"\n   Total mapped: {total_mapped}/{len(df_all_people)} people")
print(f"   Total unmapped: {total_unmapped} people\n")

# Show unmapped sections
unmapped_sections = df_all_people[~df_all_people['Section'].isin(section_to_bo.keys())]
if len(unmapped_sections) > 0:
    print(f"   Unmapped sections ({unmapped_sections['Section'].nunique()}):")
    for section in unmapped_sections['Section'].unique()[:10]:
        count = len(unmapped_sections[unmapped_sections['Section'] == section])
        print(f"      - {section}: {count} people")

# STEP 5: Generate final config.js
print("\n[5] Generating final config.js for all 39 BOs...")

config_content = """/**
 * USER CONFIGURATION FOR ATTENDANCE MANAGEMENT SYSTEM
 * Auto-generated from Excel data mapping
 * 
 * Total BOs: 39
 * Total People Mapped: {mapped}/{total}
 */

const USER_CONFIG = {{
  // Nodal Officer - can upload data and view all sections
  'nodal': {{
    name: 'Nodal Officer',
    password: 'nodal@2024',
    role: 'nodal',
    sections: []  // Empty array means access to ALL sections
  }},

""".format(mapped=total_mapped,total=len(df_all_people))

# Add all 39 BOs
for bo_num in sorted(bo_mapping.keys()):
    username = f"bo{bo_num}"
    bo_name = bo_mapping[bo_num]['name']
    sections_list = sorted(list(bo_sections.get(bo_num, set())))
    people_count = bo_stats[bo_num]['count'] if bo_num in bo_stats else 0
    
    config_content += f"  // BO{bo_num}: {people_count} people\n"
    config_content += f"  '{username}': {{\n"
    config_content += f"    name: {json.dumps(bo_name)},\n"
    config_content += f"    password: 'bo@2024',\n"
    config_content += f"    role: 'bo',\n"
    config_content += f"    sections: {json.dumps(sections_list)}\n"
    config_content += f"  }},\n\n"

config_content += "};\n"

# Save to file
output_file = '/Users/naaa/Desktop/attendance/config_final_39bos.js'
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(config_content)

print(f"   ✓ Saved to: {output_file}\n")

# STEP 6: Save detailed mapping for reference
mapping_json = {
    'generation_date': '2025-12-16',
    'total_bos': len(bo_mapping),
    'total_people': len(df_all_people),
    'mapped_people': total_mapped,
    'unmapped_people': total_unmapped,
    'section_to_bo': section_to_bo,
    'bo_accounts': {}
}

for bo_num, bo_data in bo_mapping.items():
    mapping_json['bo_accounts'][f'bo{bo_num}'] = {
        'bo_number': bo_num,
        'name': bo_data['name'],
        'people_count': bo_stats[bo_num]['count'] if bo_num in bo_stats else 0,
        'sections': sorted(list(bo_sections.get(bo_num, set()))),
        'assigned_sections_raw': bo_data['assigned_sections_raw']
    }

with open('/Users/naaa/Desktop/attendance/complete_mapping_final.json', 'w', encoding='utf-8') as f:
    json.dump(mapping_json, f, indent=2, ensure_ascii=False)

print(f"   ✓ Saved detailed mapping to: complete_mapping_final.json")

print("\n" + "="*100)
print("✓ MAPPING COMPLETE!")
print(f"  Total: 39 BOs managing {total_mapped}/{len(df_all_people)} people")
print("="*100)
