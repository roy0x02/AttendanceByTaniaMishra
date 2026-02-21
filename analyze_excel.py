#!/usr/bin/env python3
"""
Enhanced Excel analyzer to extract actual data content
"""
import zipfile
import xml.etree.ElementTree as ET

def extract_sheet_data(filename, sheet_name, max_rows=20):
    """Extract data from a specific sheet"""
    try:
        with zipfile.ZipFile(filename, 'r') as zip_ref:
            # Get sheet ID
            with zip_ref.open('xl/workbook.xml') as xml_file:
                tree = ET.parse(xml_file)
                root = tree.getroot()
                ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                
                sheet_id = None
                for sheet in root.findall('.//main:sheet', ns):
                    if sheet.get('name') == sheet_name:
                        rid = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                        sheet_id = rid.replace('rId', '')
                        break
                
                if not sheet_id:
                    return f"Sheet '{sheet_name}' not found"
            
            # Read sheet data
            sheet_file = f'xl/worksheets/sheet{sheet_id}.xml'
            try:
                with zip_ref.open(sheet_file) as xml_file:
                    tree = ET.parse(xml_file)
                    root = tree.getroot()
                    
                    ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    
                    # Read shared strings
                    shared_strings = []
                    try:
                        with zip_ref.open('xl/sharedStrings.xml') as ss_file:
                            ss_tree = ET.parse(ss_file)
                            ss_root = ss_tree.getroot()
                            for si in ss_root.findall('.//main:si', ns):
                                t = si.find('.//main:t', ns)
                                if t is not None:
                                    shared_strings.append(t.text if t.text else '')
                    except:
                        pass
                    
                    # Extract cell data
                    rows_data = []
                    for row in root.findall('.//main:row', ns)[:max_rows]:
                        row_data = []
                        for cell in row.findall('.//main:c', ns):
                            cell_type = cell.get('t')
                            v = cell.find('.//main:v', ns)
                            
                            if v is not None and v.text:
                                if cell_type == 's':  # Shared string
                                    idx = int(v.text)
                                    if idx < len(shared_strings):
                                        row_data.append(shared_strings[idx])
                                    else:
                                        row_data.append(v.text)
                                else:
                                    row_data.append(v.text)
                            else:
                                row_data.append('')
                        
                        if any(row_data):  # Only add non-empty rows
                            rows_data.append(row_data)
                    
                    return rows_data
            except KeyError:
                return f"Error reading sheet data for '{sheet_name}'"
                
    except Exception as e:
        return f"Error: {str(e)}"

def print_table(data, title):
    """Print data in a formatted table"""
    print(f"\n{'='*80}")
    print(f"{title}")
    print(f"{'='*80}")
    
    if isinstance(data, str):
        print(data)
        return
    
    for i, row in enumerate(data[:15], 1):  # Show first 15 rows
        print(f"Row {i}: {row}")
    
    if len(data) > 15:
        print(f"... and {len(data) - 15} more rows")

if __name__ == "__main__":
    # Analyze Details of SAO
    print("\n" + "="*80)
    print("FILE: Details of SAO.xlsx")
    print("="*80)
    
    data = extract_sheet_data("Details of SAO.xlsx", "List of BOs")
    print_table(data, "Sheet: List of BOs")
    
    data = extract_sheet_data("Details of SAO.xlsx", "List of Sections")
    print_table(data, "Sheet: List of Sections")
    
    # Analyze Admin Accounts and Fund
    print("\n" + "="*80)
    print("FILE: Admin Accounts and Fund Group wise Data.xlsx")
    print("="*80)
    
    for sheet in ["Admin", "Fund", "Accounts"]:
        data = extract_sheet_data("Admin Accounts and Fund Group wise Data.xlsx", sheet)
        print_table(data, f"Sheet: {sheet}")
    
    # Analyze Attendance Data
    print("\n" + "="*80)
    print("FILE: 09-12-2025 attendance data.xlsx")
    print("="*80)
    
    for sheet in ["Present", "Absent"]:
        data = extract_sheet_data("09-12-2025 attendance data.xlsx", sheet)
        print_table(data, f"Sheet: {sheet}")
