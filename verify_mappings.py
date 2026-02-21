#!/usr/bin/env python3
"""
Verify the generated mapping files
"""

import json
import re

print("="*100)
print("VERIFYING MAPPING FILES")
print("="*100)

# ========================================
# Load Generated Files
# ========================================
print("\n[STEP 1] Loading generated files...")

# Load config.js
with open('config.js', 'r', encoding='utf-8') as f:
    config_content = f.read()

# Load employee-mapping.js
with open('employee-mapping.js', 'r', encoding='utf-8') as f:
    employee_mapping_content = f.read()

# Load mapping stats
with open('mapping_stats.json', 'r', encoding='utf-8') as f:
    stats = json.load(f)

print(f"   ✓ Loaded config.js")
print(f"   ✓ Loaded employee-mapping.js")
print(f"   ✓ Loaded mapping_stats.json")

# ========================================
# Test 1: BO Configuration Validation
# ========================================
print("\n[TEST 1] Validating BO configurations...")

# Extract BO count from config.js
bo_pattern = r"'bo(\d+)':\s*\{"
bo_matches = re.findall(bo_pattern, config_content)
bo_numbers = sorted([int(num) for num in bo_matches])

print(f"   Found {len(bo_numbers)} BOs in config.js")
print(f"   BO numbers: {bo_numbers[:10]}...")

# Check for all 39 BOs
expected_bos = list(range(1, 40))
if bo_numbers == expected_bos:
    print(f"   ✓ All 39 BOs (bo1-bo39) present in config.js")
else:
    missing = set(expected_bos) - set(bo_numbers)
    print(f"   ✗ Missing BOs: {missing}")

# Check nodal officer exists
if "'nodal':" in config_content:
    print(f"   ✓ Nodal officer configuration present")
else:
    print(f"   ✗ Nodal officer configuration missing")

# ========================================
# Test 2: Employee Mapping Validation
# ========================================
print("\n[TEST 2] Validating employee mappings...")

# Count employees in employee-mapping.js
employee_pattern = r'"([^"]+)":\s*"([^"]+)",'
employee_matches = re.findall(employee_pattern, employee_mapping_content)

print(f"   Found {len(employee_matches)} employee mappings")
print(f"   Sample mappings:")
for name, section in employee_matches[:5]:
    print(f"      {name[:30]:30s} → {section}")

# Verify against stats
if len(employee_matches) == stats['total_employees']:
    print(f"   ✓ Employee count matches stats ({len(employee_matches)})")
else:
    print(f"   ✗ Employee count mismatch: {len(employee_matches)} vs {stats['total_employees']}")

# ========================================
# Test 3: Mapping Statistics Validation
# ========================================
print("\n[TEST 3] Validating mapping statistics...")

print(f"   Total BOs: {stats['total_bos']}")
print(f"   Total Employees: {stats['total_employees']}")
print(f"   Mapped Employees: {stats['mapped_employees']}")
print(f"   Unmapped Employees: {stats['unmapped_employees']}")
print(f"   Mapping Percentage: {stats['mapping_percentage']}%")

if stats['total_bos'] == 39:
    print(f"   ✓ Correct number of BOs")
else:
    print(f"   ✗ Incorrect BO count")

if stats['total_employees'] == 845:
    print(f"   ✓ Correct number of employees")
else:
    print(f"   ✗ Incorrect employee count")

if stats['mapping_percentage'] >= 85:
    print(f"   ✓ Good mapping percentage ({stats['mapping_percentage']}%)")
else:
    print(f"   ⚠ Low mapping percentage ({stats['mapping_percentage']}%)")

# ========================================
# Test 4: BO Section Assignment Check
# ========================================
print("\n[TEST 4] Checking BO section assignments...")

bos_with_employees = [bo for bo in stats['bo_statistics'] if bo['employee_count'] > 0]
bos_without_employees = [bo for bo in stats['bo_statistics'] if bo['employee_count'] == 0]

print(f"   BOs with employees: {len(bos_with_employees)}")
print(f"   BOs without employees: {len(bos_without_employees)}")

print(f"\n   Top 5 BOs by employee count:")
sorted_bos = sorted(stats['bo_statistics'], key=lambda x: x['employee_count'], reverse=True)
for bo in sorted_bos[:5]:
    print(f"      BO{bo['bo_num']:2d} ({bo['name'][:30]:30s}): {bo['employee_count']:3d} employees, {bo['section_count']:2d} sections")

if bos_without_employees:
    print(f"\n   BOs with no employees ({len(bos_without_employees)}):")
    for bo in bos_without_employees:
        print(f"      BO{bo['bo_num']:2d}: {bo['name']}")

# ========================================
# Test 5: Syntax Check
# ========================================
print("\n[TEST 5] Checking JavaScript syntax...")

# Basic syntax checks
syntax_errors = []

# Check for proper JSON structure in config
if 'const USER_CONFIG = {' in config_content and '};' in config_content:
    print(f"   ✓ config.js has valid USER_CONFIG structure")
else:
    syntax_errors.append("config.js: Invalid USER_CONFIG structure")

# Check for proper mapping structure
if 'const EMPLOYEE_SECTION_MAPPING = {' in employee_mapping_content:
    print(f"   ✓ employee-mapping.js has valid structure")
else:
    syntax_errors.append("employee-mapping.js: Invalid structure")

# Check for helper functions
if 'function cleanEmployeeName' in employee_mapping_content and 'function getEmployeeSection' in employee_mapping_content:
    print(f"   ✓ Helper functions present")
else:
    syntax_errors.append("employee-mapping.js: Missing helper functions")

if syntax_errors:
    print(f"\n   Syntax errors found:")
    for err in syntax_errors:
        print(f"      ✗ {err}")
else:
    print(f"   ✓ No syntax errors detected")

# ========================================
# Summary
# ========================================
print("\n" + "="*100)
print("VERIFICATION SUMMARY")
print("="*100)
print(f"""
Configuration:
  - BOs configured: {len(bo_numbers)}/39
  - Nodal officer: {'✓' if "'nodal':" in config_content else '✗'}
  
Employee Mapping:
  - Total employees: {len(employee_matches)}
  - Mapped to BOs: {stats['mapped_employees']} ({stats['mapping_percentage']}%)
  - Unmapped: {stats['unmapped_employees']}
  
BO Statistics:
  - BOs with assignments: {len(bos_with_employees)}
  - BOs without assignments: {len(bos_without_employees)}
  
Syntax:
  - Syntax errors: {len(syntax_errors)}

✓ Verification Complete!
""")
print("="*100)
