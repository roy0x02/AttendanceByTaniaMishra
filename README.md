# Attendance Management System

A web-based employee attendance management system with role-based access control.

## Features

- **Role-Based Access Control**: 45 unique logins (Admin, Nodal, BOs)
- **Attendance Tracking**: Upload and view daily attendance data
- **Color-Coded Status**: Green for present, Red for absent
- **Analytics Dashboard**: Section-wise statistics and performance metrics
- **File Upload**: Drag-and-drop Excel file upload for nodal officers
- **Search & Filter**: Filter attendance by name, designation, status, and section
- **Export Functionality**: Export filtered data to Excel
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Quick Start

1. **Open the application**:
   - Double-click `index.html` or
   - Open in browser: `file:///Users/naaa/Desktop/attendance/index.html`

2. **Login with credentials**:

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Admin | admin | admin@2024 | All data + Analytics |
| Nodal | nodal | nodal@2024 | All data + Upload + Analytics |
| BO (Admin-I) | bo1 | bo@2024 | Admin-I section only |
| BO (Admin-II) | bo2 | bo@2024 | Admin-II section only |
| BO (Fund-I) | bo3 | bo@2024 | Fund-I section only |
| BO (Fund-II) | bo4 | bo@2024 | Fund-II section only |
| BO (AC-I) | bo5 | bo@2024 | AC-I section only |
| BO (AC-II) | bo6 | bo@2024 | AC-II section only |
| BO (AC-III) | bo7 | bo@2024 | AC-III section only |

3. **Upload attendance data**:
   - Login as `nodal`
   - Click "Upload Data" in sidebar
   - Upload `09-12-2025 attendance data.xlsx`
   - System will automatically process the file

## Directory Structure

```
attendance/
├── index.html              # Main HTML file
├── styles.css              # Premium dark theme CSS
├── config.js               # Configuration & credentials
├── data-processor.js       # Excel parsing & data management
├── auth-manager.js         # Authentication & authorization
├── analytics.js            # Charts & statistics
├── file-uploader.js        # File upload handling
├── app.js                  # Main application controller
├── load_data.py            # Data loader script
├── README.md               # This file
├── 09-12-2025 attendance data.xlsx
├── Admin Accounts and Fund Group wise Data.xlsx
└── Details of SAO.xlsx
```

## User Roles

### Admin
- View all attendance data
- Access analytics dashboard
- See section-wise and BO-wise statistics
- Cannot upload files

### Nodal Officer
- View all attendance data
- Upload daily attendance files
- Access analytics dashboard
- View upload history

### Branch Officers (BOs)
- View attendance only for assigned sections
- Filter and search within assigned sections
- Export their section's data
- No analytics or upload access

## How to Use

### Viewing Attendance
1. Login with your credentials
2. Select date from date picker
3. Use search bar to find specific employees
4. Apply filters by status (Present/Absent) or section
5. Click "Export" to download as Excel

### Uploading Data (Nodal Only)
1. Login as nodal user
2. Click "Upload Data" in sidebar
3. Drag and drop Excel file or click to browse
4. File should have "Present" and "Absent" sheets
5. System will auto-detect date from filename (DD-MM-YYYY format)

### Analytics Dashboard (Admin/Nodal)
1. Login as admin or nodal
2. Click "Dashboard" in sidebar
3. View:
   - Section-wise attendance charts
   - Distribution pie chart
   - Attendance trends
   - Top performers list
   - BO-wise statistics

## Customization

### Adding More BOs
Edit `config.js` and add:

```javascript
'bo8': { 
    password: 'bo@2024', 
    role: 'bo', 
    name: 'BO - Section Name', 
    sections: ['Section-Name'] 
}
```

### Changing Credentials
Edit `config.js` and modify the password:

```javascript
'admin': { password: 'your_new_password', ... }
```

### Adding Sections
Edit `config.js` and update `groupMapping`:

```javascript
groupMapping: {
    'Admin': ['Admin-I', 'Admin-II', 'Admin-III'],
    'Fund': ['Fund-I', 'Fund-II'],
    'Accounts': ['AC-I', 'AC-II', 'AC-III']
}
```

## Data Storage

- All data is stored in browser's localStorage
- Attendance data persists across sessions
- Clear browser data to reset

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Libraries**: 
  - SheetJS (xlsx.js) - Excel file parsing
  - Chart.js - Data visualization
  - FileSaver.js - File export
- **Fonts**: Google Fonts (Inter)
- **Storage**: Browser localStorage

## Browser Compatibility

- Chrome/Edge (Recommended)
- Firefox
- Safari
- Modern browsers with ES6+ support

## Troubleshooting

### Data not showing
- Ensure you've uploaded attendance file as nodal user
- Check that the date matches the uploaded file
- Clear browser cache and reload

### Login not working
- Check credentials in console (F12)
- Verify username and password
- Clear localStorage and try again

### File upload fails
- Ensure file has "Present" and "Absent" sheets
- Check file format (.xlsx or .xls)
- Verify column names match expected format

## Support

For issues or questions, contact IT Department.

## License

Internal use only.
