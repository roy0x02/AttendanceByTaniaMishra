#!/usr/bin/env python3
"""
Generate new config.js and employee-mapping.js from master data.xlsx
"""

import pandas as pd
import json
import re
from datetime import datetime
from collections import defaultdict

print("="*100)
print("GENERATING NEW MAPPING FILES FROM MASTER DATA")
print("="*100)

# ========================================
# STEP 1: Read and Parse Master Data
# ========================================
print("\n[STEP 1] Reading master data.xlsx...")

# Read BO list
df_bos = pd.read_excel('master data.xlsx', sheet_name='List of BOs', skiprows=1)
df_bos = df_bos.dropna(how='all')

# Parse BO information
bo_list = []
current_group = None

for _, row in df_bos.iterrows():
    serial = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
    name = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ''
    sections = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ''
    
    # Check if this is a group header
    if 'Group' in serial or 'Group' in name:
        current_group = name if 'Group' in name else serial
        continue
    
    # Check if this is a BO entry
    if serial.isdigit():
        bo_num = int(serial)
        section_list = []
        if sections and sections != 'nan':
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

print(f"   ✓ Loaded {len(bo_list)} Branch Officers")

# Read employee data
df_employees = pd.read_excel('master data.xlsx', sheet_name='Combines')
df_employees = df_employees.dropna(subset=['Name'])
print(f"   ✓ Loaded {len(df_employees)} employees")

# ========================================
# STEP 2: Map Sections to BOs
# ========================================
print("\n[STEP 2] Mapping sections to BOs...")

def normalize_section(s):
    """Normalize section name for matching"""
    if not s or pd.isna(s):
        return ''
    s = str(s).upper()
    s = re.sub(r'[^A-Z0-9\s]', '', s)
    s = ' '.join(s.split())
    return s

# Create section to BO mapping
section_to_bo = {}
bo_to_sections = defaultdict(set)

for bo in bo_list:
    bo_num = bo['bo_num']
    for section_raw in bo['sections']:
        norm_bo_section = normalize_section(section_raw)
        
        for emp_section in df_employees['Section'].unique():
            norm_emp_section = normalize_section(emp_section)
            
            if norm_bo_section and norm_emp_section:
                if norm_emp_section in norm_bo_section or norm_bo_section in norm_emp_section:
                    section_to_bo[emp_section] = bo_num
                    bo_to_sections[bo_num].add(emp_section)

# Calculate employee count per BO
bo_employee_counts = defaultdict(int)
for _, row in df_employees.iterrows():
    section = row['Section']
    if section in section_to_bo:
        bo_num = section_to_bo[section]
        bo_employee_counts[bo_num] += 1

print(f"   ✓ Mapped {len(section_to_bo)} sections to BOs")
print(f"   ✓ Mapped {sum(bo_employee_counts.values())}/{len(df_employees)} employees")

# ========================================
# STEP 3: Generate config.js
# ========================================
print("\n[STEP 3] Generating config.js...")

mapped_count = sum(bo_employee_counts.values())
total_count = len(df_employees)

config_js = f"""/**
 * USER CONFIGURATION FOR ATTENDANCE MANAGEMENT SYSTEM
 * Auto-generated from master data.xlsx
 * Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
 * 
 * Total BOs: {len(bo_list)}
 * Total Employees: {total_count}
 * Mapped Employees: {mapped_count}
 */

const USER_CONFIG = {{
  // Nodal Officer - can upload data and view all sections
  'nodal': {{
    name: 'Nodal Officer',
    password: 'nodal@2024',
    role: 'nodal',
    sections: []  // Empty array means access to ALL sections
  }},

"""

for bo in sorted(bo_list, key=lambda x: x['bo_num']):
    bo_num = bo['bo_num']
    username = f"bo{bo_num}"
    sections_list = sorted(list(bo_to_sections[bo_num]))
    people_count = bo_employee_counts[bo_num]
    
    config_js += f"  // BO{bo_num}: {people_count} people\n"
    config_js += f"  '{username}': {{\n"
    config_js += f"    name: {json.dumps(bo['name'])},\n"
    config_js += f"    password: 'bo@2024',\n"
    config_js += f"    role: 'bo',\n"
    config_js += f"    sections: {json.dumps(sections_list)}\n"
    config_js += f"  }},\n\n"

config_js += """};

// ========================================
// System Configuration
// Settings and storage keys for the application
// ========================================

const CONFIG = {
    // Application Settings
    settings: {
        dateFormat: 'DD-MM-YYYY',
        defaultDate: new Date().toISOString().split('T')[0],
        itemsPerPage: 50,
        chartColors: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            success: '#10b981',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        }
    },

    // Storage Keys
    storageKeys: {
        currentUser: 'ams_current_user',
        attendanceData: 'ams_attendance_data',
        employeeData: 'ams_employee_data',
        uploadHistory: 'ams_upload_history',
        boMapping: 'ams_bo_mapping'
    },

    // Group to Section Mapping (legacy reference, actual sections in USER_CONFIG)
    groupMapping: {
        'Admin': [],
        'Fund': [],
        'Accounts': [],
        'Pension': []
    }
};
"""

with open('config.js', 'w', encoding='utf-8') as f:
    f.write(config_js)

print(f"   ✓ Generated config.js with {len(bo_list)} BOs")

# ========================================
# STEP 4: Generate employee-mapping.js
# ========================================
print("\n[STEP 4] Generating employee-mapping.js...")

employee_mapping_js = f"""// ========================================
// Employee to Section Mapping
// Auto-generated from master data.xlsx
// Total employees: {len(df_employees)}
// Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// ========================================

const EMPLOYEE_SECTION_MAPPING = {{
"""

# Sort employees by name for consistency
for _, row in df_employees.sort_values('Name').iterrows():
    name = str(row['Name']).strip().upper()
    section = row['Section']
    
    # Escape single quotes in section names
    section_escaped = section.replace("'", "\\'")
    employee_mapping_js += f"  {json.dumps(name)}: {json.dumps(section)},\n"

employee_mapping_js += """};

// Helper function to clean employee names
function cleanEmployeeName(name) {
  if (!name) return '';
  // Remove ID in parentheses like (WBKLE2241930)
  return name.replace(/\\s*\\([^)]*\\)/g, '')
    .trim()
    .toUpperCase();
}

// Helper function to get section for an employee
function getEmployeeSection(employeeName) {
  const cleanName = cleanEmployeeName(employeeName);
  return EMPLOYEE_SECTION_MAPPING[cleanName] || null;
}
"""

with open('employee-mapping.js', 'w', encoding='utf-8') as f:
    f.write(employee_mapping_js)

print(f"   ✓ Generated employee-mapping.js with {len(df_employees)} employees")

# ========================================
# STEP 5: Generate Mapping Statistics
# ========================================
print("\n[STEP 5] Generating mapping statistics...")

stats = {
    'generation_timestamp': datetime.now().isoformat(),
    'total_bos': len(bo_list),
    'total_employees': total_count,
    'mapped_employees': mapped_count,
    'unmapped_employees': total_count - mapped_count,
    'mapping_percentage': round((mapped_count / total_count) * 100, 2),
    'bo_statistics': []
}

for bo in sorted(bo_list, key=lambda x: x['bo_num']):
    bo_num = bo['bo_num']
    stats['bo_statistics'].append({
        'bo_num': bo_num,
        'login_id': f'bo{bo_num}',
        'name': bo['name'],
        'group': bo['group'],
        'employee_count': bo_employee_counts[bo_num],
        'section_count': len(bo_to_sections[bo_num]),
        'sections': sorted(list(bo_to_sections[bo_num]))
    })

with open('mapping_stats.json', 'w', encoding='utf-8') as f:
    json.dump(stats, f, indent=2, ensure_ascii=False)

print(f"   ✓ Generated mapping_stats.json")

# ========================================
# STEP 6: Display Unmapped Sections
# ========================================
unmapped_sections = []
section_employee_counts = df_employees.groupby('Section').size().to_dict()

for section in df_employees['Section'].unique():
    if section not in section_to_bo:
        count = section_employee_counts.get(section, 0)
        unmapped_sections.append((section, count))

if unmapped_sections:
    print(f"\n[NOTICE] {len(unmapped_sections)} sections remain unmapped:")
    for section, count in sorted(unmapped_sections, key=lambda x: -x[1])[:15]:
        print(f"   - {section}: {count} employees")

print("\n" + "="*100)
print("MAPPING FILES GENERATED SUCCESSFULLY!")
print(f"""
Summary:
  - config.js: {len(bo_list)} BOs configured
  - employee-mapping.js: {len(df_employees)} employees mapped
  - Mapping rate: {mapped_count}/{total_count} ({stats['mapping_percentage']}%)
  - Files created:
    * config.js
    * employee-mapping.js
    * mapping_stats.json
""")
print("="*100)
