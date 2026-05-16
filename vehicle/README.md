# ISKCON Towaco - Vehicle License Plate System

## Overview

A mobile-friendly web application designed to help temple visitors manage parking and contact vehicle owners when needed. The system allows users to register their vehicle information and search for vehicles by license plate number, while keeping personal information secure and private.

## The Problem

Over the years, ISKCON Towaco temple has experienced significant growth in attendance, leading to increased stress on parking facilities. Several challenges emerged:

### Parking Space Issues

- Visitors often occupy 2 parking spaces to prevent being blocked in
- This practice reduces available parking for other attendees
- People want the flexibility to leave early without being blocked

### Communication Gap

- No easy way to identify whose vehicle is blocking another
- No simple method to contact vehicle owners to request they move their car
- Lack of a reliable system to facilitate communication between visitors

### Previous Solutions Failed

- **Google Doc Attempt**: A shared Google document was created as a vehicle registry
  - **Security Concerns**: Personal information (names and phone numbers) was visible to everyone
  - **Privacy Issues**: Visitors were uncomfortable sharing their contact details publicly
  - **Poor User Experience**: The document was not user-friendly
  - **Low Adoption**: Very few people actually used the system

## The Solution

This Vehicle License Plate System addresses all the previous challenges with a modern, secure, and user-friendly approach:

### Key Features

#### 1. **Mobile-First Design**

- Optimized for smartphones and tablets
- Easy to use while in the parking lot
- Responsive interface that works on any device

#### 2. **Privacy & Security**

- Personal information (names and phone numbers) is **redacted for regular users**
- Only **admin users** can view full contact details
- Secure authentication system for admin access
- Data stored securely in Firebase

#### 3. **Easy Vehicle Registration**

- Simple form to add vehicle information
- **OCR (Optical Character Recognition)** support - take a photo of the license plate and the system automatically reads it
- Manual entry option for quick registration
- Optional image upload for visual identification

#### 4. **Quick Search Functionality**

- Search by license plate number (available to all users)
- Search by owner name (admin only)
- Real-time search results
- View vehicle count at a glance

#### 5. **Admin Controls**

- Secure login system with password protection
- View full contact information for all registered vehicles
- Delete outdated or incorrect records
- Change admin password for security
- Configure OCR API settings for better accuracy

## How It Works

### For Regular Users

1. **Register Your Vehicle**

   - Open the app on your phone
   - Take a photo of your license plate (optional - OCR will read it)
   - Verify/enter your plate number
   - Add your name and phone number
   - Submit

2. **Find a Vehicle Owner**
   - Enter the license plate number in the search box
   - View the vehicle information (name and phone are partially hidden)
   - Contact an admin if you need to reach the owner

### For Admins

1. **Login**

   - Click "Admin Login" button
   - Enter admin credentials
   - Access full system features

2. **View Full Information**

   - See complete names and phone numbers
   - Search by owner name
   - Contact vehicle owners directly

3. **Manage Records**
   - Delete outdated entries
   - Maintain data accuracy
   - Configure system settings

## Technical Features

- **Firebase Realtime Database**: Secure cloud storage with real-time updates
- **OCR Integration**: Automatic license plate recognition using Tesseract.js or Plate Recognizer API
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Progressive Web App**: Can be installed on mobile devices for quick access
- **No Backend Required**: Fully client-side application with Firebase backend
- **Privacy-First**: Built-in data redaction for non-admin users

## Benefits

✅ **Improved Parking Efficiency**: Better space utilization when people can easily contact each other

✅ **Enhanced Privacy**: Personal information is protected and only visible to authorized admins

✅ **User-Friendly**: Simple, intuitive interface that people actually want to use

✅ **Mobile Accessible**: Use it right from the parking lot on your phone

✅ **Real-Time Updates**: Changes are immediately visible to all users

✅ **Secure**: Admin-controlled access to sensitive information

✅ **Low Maintenance**: Cloud-based system requires minimal upkeep

## Getting Started

### For Users

Simply visit the application URL on your mobile device or computer. No installation required!

### For Administrators

1. Access the application
2. Click "Admin Login"
3. Use the provided credentials (change the default password immediately)
4. Configure OCR settings if desired (optional Plate Recognizer API key for better accuracy)

## Privacy & Data Protection

- Personal information is stored securely in Firebase
- Names and phone numbers are redacted for non-admin users
- Only authorized admins can view full contact details
- No data is shared with third parties
- Users control what information they provide

## Support

For technical issues or questions about the system, please contact the temple administration.

---

**Built with care for the ISKCON Towaco community** 🙏
