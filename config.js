/**
 * USER CONFIGURATION FOR ATTENDANCE MANAGEMENT SYSTEM
 * Auto-generated from master data.xlsx
 * Generated on: 2026-01-02 13:28:50
 * 
 * Total BOs: 39
 * Total Employees: 845
 * Mapped Employees: 754
 */

const USER_CONFIG = {
  // Nodal Officer - can upload data and view all sections
  'nodal': {
    name: 'Nodal Officer',
    password: 'nodal@2024',
    role: 'nodal',
    sections: []  // Empty array means access to ALL sections
  },

  // Admin - can view analytics and attendance but cannot upload data
  'admin': {
    name: 'Admin User',
    password: 'admin@2024',
    role: 'admin',
    sections: []  // Empty array means access to ALL sections
  },

  // BO1: 0 people
  'bo1': {
    name: "Tapas Kumar Dhar, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Capital & Loan Compilation", "PAO (Compilation & Computerisation)", "Pension Compilation", "RECORD COMPUTER CELL", "TA-I  (VR ROOM)"]
  },

  // BO2: 21 people
  'bo2': {
    name: "Sujit Kumar Sen, Sr.AO(IAO)",
    password: 'bo@2024',
    role: 'bo',
    sections: ["IAD-I", "IAD-II", "IAD-III", "IAD-IV", "IAD-V"]
  },

  // BO3: 4 people
  'bo3': {
    name: "Satyadip Chattopadhyay, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Admn-I", "Admn-II", "Admn-III", "BO (Admn-I, CR Cell)", "BO (Admn-II,Admn-III)", "CR Cell"]
  },

  // BO4: 56 people
  'bo4': {
    name: "Supriyo Banerjee, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Admn-I", "Admn-II", "Admn-III", "BO (Admn-II,Admn-III)"]
  },

  // BO5: 62 people
  'bo5': {
    name: "Partha Saha, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["CARETAKING ESTABLISHMENT", "RECORD COMPUTER CELL", "RECORD LIBRARY", "RECORD-I", "RECORD-III"]
  },

  // BO6: 0 people
  'bo6': {
    name: "Partha Das, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["AM", "Training & Exam"]
  },

  // BO7: 13 people
  'bo7': {
    name: "Sanat Sen, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BO (LEGAL CELL)", "LEGAL CELL"]
  },

  // BO8: 38 people
  'bo8': {
    name: "Kousik Kumar Dutta, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BO (DIGITIZATION CELL)", "DIGITIZATION CELL"]
  },

  // BO9: 12 people
  'bo9': {
    name: "Krishna Chandra Kundu, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BO (ITSC & ITSC-II)", "ITSC", "ITSC-II"]
  },

  // BO10: 12 people
  'bo10': {
    name: "Rana Banerjee, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BO (WELFARE)", "WELFARE"]
  },

  // BO11: 6 people
  'bo11': {
    name: "Arun Kumar, Asst. Director(OL)",
    password: 'bo@2024',
    role: 'bo',
    sections: ["RAJBHASA SECTION"]
  },

  // BO12: 0 people
  'bo12': {
    name: "Bijoy Surin, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: []
  },

  // BO13: 44 people
  'bo13': {
    name: "Subhendu Das, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["AM", "TA-I", "TA-I  (VR ROOM)", "TA-II", "TA-III", "TA-IV", "Training & Exam"]
  },

  // BO14: 5 people
  'bo14': {
    name: "Debatosh Pramanik, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["AP", "BOOK-I", "BOOK-II", "BOOK-III", "Capital & Loan Compilation", "SNA"]
  },

  // BO15: 23 people
  'bo15': {
    name: "Subrata Roy, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["AC-I", "AC-II", "AC-III", "BOOK-I", "BOOK-II", "BOOK-III", "Labour Co-operation A/cs", "Pension Facilitation Cell"]
  },

  // BO16: 29 people
  'bo16': {
    name: "Sujan Banerjee, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["AP", "Capital & Loan Compilation", "Medical-I", "Medical-II", "Medical-III", "SS A/cs"]
  },

  // BO17: 5 people
  'bo17': {
    name: "Subhradeep Bhattacherya, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BUDGET"]
  },

  // BO18: 12 people
  'bo18': {
    name: "Sujit Mondal, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["WM"]
  },

  // BO19: 32 people
  'bo19': {
    name: "Biplab Roy, Sr.AO",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BOOK-I", "BOOK-II", "BOOK-III", "Internal NRA Cell"]
  },

  // BO20: 20 people
  'bo20': {
    name: "Asim Kumar Majumder",
    password: 'bo@2024',
    role: 'bo',
    sections: ["General Admn. A/cs", "Misc. A/cs", "Pension Compilation", "R&RD A/cs"]
  },

  // BO21: 18 people
  'bo21': {
    name: "Birendra Prasad",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Industry & LR A/cs", "P.W. Estt A/cs", "PH A/cs", "Police A/cs"]
  },

  // BO22: 24 people
  'bo22': {
    name: "Jitendra Nath Das",
    password: 'bo@2024',
    role: 'bo',
    sections: ["PAO(A) Pension", "PAO(Special Cell)", "Pre-Check-I", "Pre-Check-II"]
  },

  // BO23: 20 people
  'bo23': {
    name: "Rebati Ranjan Podder",
    password: 'bo@2024',
    role: 'bo',
    sections: ["PAO (Compilation & Computerisation)", "PAO(Cash)", "PAO(Fund) ", "PAO(NPS)"]
  },

  // BO24: 26 people
  'bo24': {
    name: "Hiralal Barman",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BOOK(W)", "BS-I", "BS-II", "Forest A/cs", "GAD Cell", "Works A/cs-I", "Works A/cs-II", "Works A/cs-IIII", "Works A/cs-IV"]
  },

  // BO25: 22 people
  'bo25': {
    name: "Avijit Sarkar",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BO (CGF, Fund A/cs., Fund-VII, XI, XII, IV)", "BO (Fund Misc., FFC, FDC, Fund-I, V, VIII)", "BO (Fund-II, III, XV, XVII, IX)", "BO (Fund-VI, XIII, XIV,XVI, X)", "FDC", "FUND MISC", "FUND-I", "FUND-II", "FUND-III", "FUND-IV", "FUND-IX", "FUND-V", "FUND-VI", "FUND-VII", "FUND-VIII"]
  },

  // BO26: 17 people
  'bo26': {
    name: "Lakshmi Kanta Mandi",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BO (CGF, Fund A/cs., Fund-VII, XI, XII, IV)", "CGF", "FUND A/CS", "FUND-I", "FUND-IV", "FUND-V", "FUND-VI", "FUND-VII", "FUND-VIII", "FUND-X", "FUND-XI", "FUND-XII", "FUND-XIII", "FUND-XIV"]
  },

  // BO27: 57 people
  'bo27': {
    name: "Debasish Chakraborty",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BO (CGF, Fund A/cs., Fund-VII, XI, XII, IV)", "BO (Fund-VI, XIII, XIV,XVI, X)", "FUND-V", "FUND-VI", "FUND-VII", "FUND-VIII", "FUND-X", "FUND-XI", "FUND-XII", "FUND-XIII", "FUND-XIV", "FUND-XV", "FUND-XVI", "FUND-XVII"]
  },

  // BO28: 54 people
  'bo28': {
    name: "Nandadulal Sadhukhan",
    password: 'bo@2024',
    role: 'bo',
    sections: ["BO (Fund-II, III, XV, XVII, IX)", "FUND-I", "FUND-II", "FUND-III", "FUND-IX", "FUND-X", "FUND-XV", "FUND-XVI", "FUND-XVII"]
  },

  // BO29: 13 people
  'bo29': {
    name: "Shri Raja Gangopadhyay,     Sr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension Co-ordination"]
  },

  // BO30: 7 people
  'bo30': {
    name: "Shri Anil Kumar Nayar,           Sr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension EDP"]
  },

  // BO31: 0 people
  'bo31': {
    name: "Shri P. Sandip Menon,                         Sr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension-I", "Pension-IX"]
  },

  // BO32: 0 people
  'bo32': {
    name: "Shri Indrajit Sarkar,                     Sr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension-I", "Pension-IV"]
  },

  // BO33: 27 people
  'bo33': {
    name: "Shri Ayan Dutta, Sr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension-X", "Pension-XI", "Pension-XII", "Pension-XIII"]
  },

  // BO34: 0 people
  'bo34': {
    name: "Shri Subrata Datta, \nSr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension-V", "Pension-VI", "Pension-VII", "Pension-VIII"]
  },

  // BO35: 0 people
  'bo35': {
    name: "Shri Debashis Roy, \nSr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension-I", "Pension-II", "Pension-III"]
  },

  // BO36: 17 people
  'bo36': {
    name: "Shri Sambhu Nath Basak, \nSr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension Cell-I", "Pension Cell-II", "Pension Cell-III"]
  },

  // BO37: 24 people
  'bo37': {
    name: "Shri Asish Bhattacharjee,             Sr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension-V", "Pension-VI", "Pension-VII", "Pension-VIII"]
  },

  // BO38: 6 people
  'bo38': {
    name: "Shri Pradip Kumar Mondal,  Sr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension Payment "]
  },

  // BO39: 28 people
  'bo39': {
    name: "Shri Mrinal Kanti Mitra,       Sr. A.O.",
    password: 'bo@2024',
    role: 'bo',
    sections: ["Pension-I", "Pension-II", "Pension-III", "Pension-IV", "Pension-IX"]
  },

};

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
    boMapping: 'ams_bo_mapping',
    customAbsenceReasons: 'ams_custom_absence_reasons' // NEW: For custom excuse reasons
  },

  // Group to Section Mapping (legacy reference, actual sections in USER_CONFIG)
  groupMapping: {
    'Admin': [],
    'Fund': [],
    'Accounts': [],
    'Pension': []
  },

  // Map USER_CONFIG to credentials for analytics compatibility
  credentials: USER_CONFIG
};
