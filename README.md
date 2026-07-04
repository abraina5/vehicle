# ISKCON Towaco - Vehicle License Plate System

## Overview

A mobile-friendly web application designed to help temple visitors manage parking and contact vehicle owners when needed. Logged-out visitors can search license plates, regular users can see phone numbers, and admins can change user/admin passwords.

## Key Features

### Mobile-First Design

- Optimized for smartphones and tablets
- Easy to use while in the parking lot
- Responsive interface that works on any device

### Direct Contact Info

- Phone numbers are displayed with each vehicle record after user or admin login
- Visitors can contact vehicle owners directly from the listed phone number
- Admin login is required for owner-name search, user/admin password changes, and OCR settings

### Easy Vehicle Registration

- Simple form to add vehicle information
- OCR support for reading a license plate from an uploaded photo
- Manual plate entry option
- Optional image upload for visual identification

### Quick Search

- Search by license plate number, available to all users
- Search by owner name, available after admin login
- Real-time search results
- Vehicle count display

## How It Works

### For Regular Users

1. Register your vehicle with plate number, name, and phone number.
2. Search for a vehicle by license plate.
3. Login as a regular user to view the phone number when direct contact is needed.
4. Contact the owner directly if their vehicle needs to be moved.

### For Regular Users

1. Click "User Login" and enter user credentials.
2. Search by license plate.
3. View phone numbers on vehicle profiles.

### For Admins

1. Click "Admin Login" and enter admin credentials.
2. Search by owner name when needed.
3. Change regular user or admin passwords and configure OCR settings.

Default credentials:

```text
User:  user / user123
Admin: admin / admin123
```

## Technical Features

- Firebase Realtime Database for cloud storage and real-time updates
- Firebase Auth for anonymous app access and local emulator support
- Tesseract.js or Plate Recognizer API for OCR
- Responsive client-side HTML, CSS, and JavaScript
- No SMS messaging backend required

## Data Visibility

- Logged-out users can see license plates only.
- Regular users can see license plates and phone numbers.
- Admins can see license plates, phone numbers, owner-name search, and settings.
- Users control what information they provide.
- No data is shared with third parties by this app.

## Getting Started

Run the local app from the project root:

```powershell
.\start-vehicle-local.ps1
```

Then open:

```text
http://localhost:5002
```

## Support

For technical issues or questions about the system, please contact the temple administration.
