#!/usr/bin/env python3
"""
Analyze the new master data.xlsx structure to understand:
1. Designation mapping (AEBAS to Excel format)
2. BO to Section assignments
3. Employee to Section/Group mappings
"""

import pandas as pd
import json
from collections import defaultdict

print("="*100)
print("MASTER DATA ANALYSIS")
print("="*100)

# ========================================
# STEP 1: Analyze Designation Mapping
# ========================================
print("\n[STEP 1] Analyzing Designation Mapping...")
df_designation = pd.read_excel('master data.xlsx', sheet_name='Designation', skiprows=1)
df_designation.columns = ['In AEBAS', 'In Excel']
df_designation = df_designation.dropna(subset=['In AEBAS', 'In Excel'])

# Create designation mapping dictionary
designation_mapping = {}
for _, row in df_designation.iterrows():
    aebas = str(row['In AEBAS']).strip()
    excel = str(row['In Excel']).strip()
    if aebas and excel:
        designation_mapping[aebas.upper()] = excel.upper()

print(f"   ✓ Found {len(designation_mapping)} designation mappings")
print(f"   Sample mappings:")
for i, (aebas, excel) in enumerate(list(designation_mapping.items())[:5]):
    print(f"      {aebas} → {excel}")

# ========================================
# STEP 2: Analyze BO List
# ========================================
print("\n[STEP 2] Analyzing List of BOs...")
df_bos = pd.read_excel('master data.xlsx', sheet_name='List of BOs', skiprows=1)
df_bos = df_bos.dropna(how='all')

# Extract BO information
bo_list = []
current_group = None

for _, row in df_bos.iterrows():
    serial = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
    name = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ''
    sections = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ''
    
    # Check if this is a group header
    if 'Group' in serial or 'Group' in name:
        current_group = name if 'Group' in name else serial
        print(f"   Found group: {current_group}")
        continue
    
    # Check if this is a BO entry (has serial number)
    if serial.isdigit():
        bo_num = int(serial)
        
        # Parse sections - they might be comma/semicolon separated
        section_list = []
        if sections and sections != 'nan':
            # Split by comma
            for section in sections.split(','):
                section = section.strip()
                if section:
                    section_list.append(section)
        
        bo_list.append({
            'bo_num': bo_num,
            'name': name,
            'group': current_group,
            'sections_raw': sections,
            'sections': section_list
        })

print(f"   ✓ Found {len(bo_list)} Branch Officers")
print(f"   BO distribution:")
group_counts = defaultdict(int)
for bo in bo_list:
    group_counts[bo['group']] += 1
# Filter out None and sort
for group, count in sorted((k, v) for k, v in group_counts.items() if k is not None):
    print(f"      {group}: {count} BOs")

# ========================================
# STEP 3: Analyze Employee Combines Sheet
# ========================================
print("\n[STEP 3] Analyzing Employee Data (Combines sheet)...")
df_employees = pd.read_excel('master data.xlsx', sheet_name='Combines')
df_employees = df_employees.dropna(subset=['Name'])

print(f"   ✓ Total employees: {len(df_employees)}")
print(f"\n   Employees by Group:")
for group, count in df_employees['Group'].value_counts().items():
    print(f"      {group}: {count} employees")

print(f"\n   Sample employee data:")
print(df_employees[['Name', 'Designation', 'Group', 'Section']].head(5))

# Count employees per section
section_counts = df_employees.groupby('Section').size().to_dict()
print(f"\n   Total unique sections: {len(section_counts)}")

# ========================================
# STEP 4: Map Sections to BOs
# ========================================
print("\n[STEP 4] Mapping Sections to BOs...")

def normalize_section(s):
    """Normalize section name for matching"""
    if not s or pd.isna(s):
        return ''
    s = str(s).upper()
    # Remove special characters but keep spaces
    import re
    s = re.sub(r'[^A-Z0-9\s]', '', s)
    # Remove extra spaces
    s = ' '.join(s.split())
    return s

# Create section to BO mapping
section_to_bo = {}
bo_to_sections = defaultdict(set)

for bo in bo_list:
    bo_num = bo['bo_num']
    for section_raw in bo['sections']:
        # Normalize this BO's section
        norm_bo_section = normalize_section(section_raw)
        
        # Try to match with employee sections
        for emp_section in df_employees['Section'].unique():
            norm_emp_section = normalize_section(emp_section)
            
            # Check if they match or contain each other
            if norm_bo_section and norm_emp_section:
                if norm_emp_section in norm_bo_section or norm_bo_section in norm_emp_section:
                    section_to_bo[emp_section] = bo_num
                    bo_to_sections[bo_num].add(emp_section)

print(f"   ✓ Mapped {len(section_to_bo)} employee sections to BOs")

# Calculate employee count per BO
bo_employee_counts = defaultdict(int)
for _, row in df_employees.iterrows():
    section = row['Section']
    if section in section_to_bo:
        bo_num = section_to_bo[section]
        bo_employee_counts[bo_num] += 1

print(f"\n   Employee distribution across BOs:")
for bo_num in sorted(bo_employee_counts.keys())[:15]:
    count = bo_employee_counts[bo_num]
    bo_name = next((bo['name'] for bo in bo_list if bo['bo_num'] == bo_num), 'Unknown')
    sections = len(bo_to_sections[bo_num])
    print(f"      BO{bo_num:2d} ({bo_name[:30]}...): {count} employees across {sections} sections")

unmapped_employees = len(df_employees) - sum(bo_employee_counts.values())
print(f"\n   ⚠ Unmapped employees: {unmapped_employees}/{len(df_employees)}")

# Show unmapped sections
unmapped_sections = []
for section in df_employees['Section'].unique():
    if section not in section_to_bo:
        count = section_counts.get(section, 0)
        unmapped_sections.append((section, count))

if unmapped_sections:
    print(f"\n   Unmapped sections (top 10):")
    for section, count in sorted(unmapped_sections, key=lambda x: -x[1])[:10]:
        print(f"      - {section}: {count} employees")

# ========================================
# STEP 5: Save Analysis Results
# ========================================
print("\n[STEP 5] Saving analysis results...")

# Save designation mapping
with open('designation_mapping.json', 'w', encoding='utf-8') as f:
    json.dump(designation_mapping, f, indent=2, ensure_ascii=False)
print(f"   ✓ Saved designation mapping to: designation_mapping.json")

# Save BO mapping data
bo_mapping_data = {
    'total_bos': len(bo_list),
    'total_employees': len(df_employees),
    'mapped_employees': sum(bo_employee_counts.values()),
    'unmapped_employees': unmapped_employees,
    'bos': []
}

for bo in bo_list:
    bo_num = bo['bo_num']
    bo_mapping_data['bos'].append({
        'bo_num': bo_num,
        'login_id': f'bo{bo_num}',
        'name': bo['name'],
        'group': bo['group'],
        'sections_assigned_raw': bo['sections'],
        'sections_mapped': sorted(list(bo_to_sections[bo_num])),
        'employee_count': bo_employee_counts[bo_num]
    })

with open('master_data_analysis.json', 'w', encoding='utf-8') as f:
    json.dump(bo_mapping_data, f, indent=2, ensure_ascii=False)
print(f"   ✓ Saved BO mapping analysis to: master_data_analysis.json")

# Save employee to section mapping
employee_mapping = {}
for _, row in df_employees.iterrows():
    name = str(row['Name']).strip().upper()
    section = row['Section']
    group = row['Group']
    designation = row['Designation']
    
    employee_mapping[name] = {
        'section': section,
        'group': group,
        'designation': designation,
        'bo_num': section_to_bo.get(section, None)
    }

with open('employee_section_mapping_new.json', 'w', encoding='utf-8') as f:
    json.dump(employee_mapping, f, indent=2, ensure_ascii=False)
print(f"   ✓ Saved employee mapping to: employee_section_mapping_new.json")

print("\n" + "="*100)
print("ANALYSIS COMPLETE!")
print(f"Summary: {len(bo_list)} BOs, {len(df_employees)} employees, {sum(bo_employee_counts.values())} mapped")
print("="*100)
