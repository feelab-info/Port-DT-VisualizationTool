# Email Verification Setup Guide

This guide explains how the new email verification system works and how to set it up.

## Overview

The authentication system now requires email verification to ensure only real email addresses can access the Port Digital Twin system. Here's how it works:

1. **Registration**: User provides email and name
2. **Verification Code**: System sends 6-digit code to email
3. **Email Verification**: User enters code to verify email
4. **Login**: Only verified users can login

## MongoDB Collections (Created Automatically)

The system will automatically create these collections in your existing MongoDB database:

### `users` Collection
Stores user information:
```json
{
  "_id": "ObjectId",
  "email": "user@apram.pt",
  "name": "User Name",
  "isVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastLogin": "2024-01-01T12:00:00.000Z",
  "verificationAttempts": 0
}
```

### `verificationCodes` Collection
Stores verification codes (auto-expires):
```json
{
  "_id": "ObjectId",
  "email": "user@apram.pt",
  "code": "123456",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "expiresAt": "2024-01-01T00:15:00.000Z",
  "attempts": 0,
  "maxAttempts": 5,
  "isUsed": false
}
```

## Email Configuration

### Development Mode (No Email Setup Required)
If you don't configure email settings, the system will:
- ✅ Log verification codes to the console
- ✅ Allow verification to proceed
- ✅ Show "[DEV MODE]" messages

### Gmail Setup (Recommended)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password as `SMTP_PASS`

## API Endpoints

### Registration Flow

#### 1. POST `/api/auth/register`
Start registration process
```json
{
  "email": "user@apram.pt",
  "name": "User Name"
}
```

Response:
```json
{
  "success": true,
  "message": "Verification code sent to your email. Please check your inbox.",
  "nextStep": "verification",
  "email": "user@apram.pt"
}
```

#### 2. POST `/api/auth/verify-email`
Verify email with code
```json
{
  "email": "user@apram.pt",
  "code": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "Email verified successfully! You can now login.",
  "nextStep": "login"
}
```

#### 3. POST `/api/auth/resend-code`
Resend verification code
```json
{
  "email": "user@apram.pt"
}
```

#### 4. POST `/api/auth/login`
Login (requires verified email)
```json
{
  "email": "user@apram.pt",
  "name": "User Name"
}
```

If email not verified:
```json
{
  "error": "Email not verified. Please register and verify your email first.",
  "nextStep": "registration",
  "requiresVerification": true
}
```

## Security Features

- ✅ **Real Email Verification**: 6-digit codes sent to actual email addresses
- ✅ **Code Expiration**: Codes expire after 15 minutes
- ✅ **Rate Limiting**: 1-minute cooldown between code requests
- ✅ **Attempt Limits**: Max 5 attempts per code
- ✅ **Domain Restriction**: Only @apram.pt emails (+ exception for diogo.paulino10@gmail.com)
- ✅ **Automatic Cleanup**: Expired codes are automatically removed
- ✅ **No Database Setup Required**: Collections created automatically

## Database Setup - NO ACTION REQUIRED! 

**You don't need to do anything special for MongoDB!** 

- ✅ Collections are created automatically when first used
- ✅ Indexes are created automatically for performance
- ✅ TTL (Time To Live) indexes handle automatic cleanup
- ✅ Uses your existing MongoDB connection

The system will create indexes for:
- Unique email constraint on users
- Fast email lookups on verification codes
- Automatic expiration of old verification codes

## Testing the System

1. **Start the backend**:
   ```bash
   npm run dev
   ```

2. **Check console output**:
   - Email configuration status
   - Available endpoints
   - MongoDB connection status

3. **Test registration** (example with curl):
   ```bash
   # Register
   curl -X POST http://localhost:5001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"user@apram.pt","name":"Test User"}'

   # Verify (check console for code in dev mode)
   curl -X POST http://localhost:5001/api/auth/verify-email \
     -H "Content-Type: application/json" \
     -d '{"email":"user@apram.pt","code":"123456"}'

   # Login
   curl -X POST http://localhost:5001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@apram.pt","name":"Test User"}'
   ```

## Migration from Old System

The old login system still works, but now:
- ✅ Existing users need to register and verify their email
- ✅ New users must go through verification process
- ✅ Unverified users get clear instructions to register

## Troubleshooting

### "Email not configured" - Development
- This is normal! Codes will be logged to console
- Look for `[DEV MODE] Verification code: 123456` in console

### "Failed to send email" - Production
- Check SMTP credentials in `.env` file
- Verify Gmail app password is correct
- Check firewall/network settings

### "User not found" during resend
- User must register first before resending codes
- Check email address spelling

### Database connection issues
- Verify `MONGODB_URI` in environment variables
- Check MongoDB server is running
- Collections will be created automatically on first use

## Benefits

1. **Enhanced Security**: Only verified emails can access the system
2. **Real Email Validation**: Ensures emails actually exist and are accessible
3. **Zero Database Setup**: Everything is automatic
4. **Development Friendly**: Works without email configuration
5. **Production Ready**: Full email integration for production
6. **Backwards Compatible**: Old login still works
7. **Rate Limited**: Prevents spam and abuse

The system is designed to be secure by default while being easy to develop and deploy! 