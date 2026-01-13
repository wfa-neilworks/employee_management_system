# Supabase User Invitation Setup

This guide explains how to configure Supabase to work with the signup page for invited users.

## Overview

When you invite a user through Supabase, they receive an email with a link. This link needs to redirect them to your signup page where they can set their password. After setting their password, you'll need to assign them a role (HR, PROCUREMENT, or ACCOUNTS).

## Step 1: Configure Supabase Redirect URLs

### In Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set the following redirect URLs:

#### For Local Development:
- **Site URL**: `http://localhost:5173`
- **Redirect URLs**: Add these URLs:
  - `http://localhost:5173/signup`
  - `http://localhost:5173/`
  - `http://localhost:5173/**`

#### For Production:
- **Site URL**: `https://yourdomain.com`
- **Redirect URLs**: Add these URLs:
  - `https://yourdomain.com/signup`
  - `https://yourdomain.com/`
  - `https://yourdomain.com/**`

4. Click **Save**

## Step 2: Configure Email Templates

### Update the Invite User Email Template:

1. Go to **Authentication** → **Email Templates**
2. Select **Invite User** template
3. Update the confirmation link to redirect to `/signup`:

```html
<h2>You have been invited</h2>

<p>You have been invited to create an account on {{ .SiteURL }}. Follow this link to accept the invite:</p>

<p><a href="{{ .SiteURL }}/signup?token={{ .Token }}&type=invite">Accept the invite</a></p>
```

Alternatively, use this simpler version:

```html
<h2>Welcome to Woodward Foods Employee Management System</h2>

<p>You have been invited to join the system. Click the link below to set your password and get started:</p>

<p><a href="{{ .ConfirmationURL }}">Set Your Password</a></p>

<p>If you did not expect this invitation, you can safely ignore this email.</p>
```

4. Click **Save**

## Step 3: Invite a User

### Via Supabase Dashboard:

1. Go to **Authentication** → **Users**
2. Click **Invite User** button
3. Enter the user's email address
4. Click **Send Invite**
5. User will receive an email with a link to set their password

### Via SQL (if you prefer):

```sql
-- This sends an invitation email through Supabase Auth
-- Note: This is handled by Supabase backend, not directly via SQL
-- Use the Dashboard method above instead
```

## Step 4: Assign Role After User Signs Up

After the user clicks the invite link and sets their password on the signup page, you need to assign them a role.

### Method 1: Assign Role via SQL (Recommended)

Run this SQL query in the Supabase SQL Editor:

```sql
-- Replace 'user@example.com' with the actual user's email
-- Replace 'HR' with the desired role: 'HR', 'PROCUREMENT', or 'ACCOUNTS'

INSERT INTO accounts (id, email, account_type, created_at)
SELECT
  id,
  email,
  'HR',  -- Change this to 'PROCUREMENT' or 'ACCOUNTS' as needed
  NOW()
FROM auth.users
WHERE email = 'user@example.com'
ON CONFLICT (id) DO UPDATE
SET account_type = 'HR',
    email = EXCLUDED.email;
```

### Method 2: Verify Role Assignment

Check if the role was assigned correctly:

```sql
SELECT
  au.id,
  au.email,
  a.account_type,
  au.created_at
FROM auth.users au
LEFT JOIN accounts a ON au.id = a.id
WHERE au.email = 'user@example.com';
```

## Step 5: Complete Workflow Example

### Example: Inviting an HR User

1. **Invite User**
   - Go to Supabase Dashboard → Authentication → Users
   - Click "Invite User"
   - Enter email: `hr.manager@wfa.com`
   - Click "Send Invite"

2. **User Accepts Invite**
   - User receives email
   - Clicks "Set Your Password" link
   - Gets redirected to: `http://localhost:5173/signup`
   - Sets their password
   - Gets redirected to dashboard

3. **Assign Role**
   - Go to Supabase SQL Editor
   - Run this query:
   ```sql
   INSERT INTO accounts (id, email, account_type, created_at)
   SELECT id, email, 'HR', NOW()
   FROM auth.users
   WHERE email = 'hr.manager@wfa.com'
   ON CONFLICT (id) DO UPDATE
   SET account_type = 'HR', email = EXCLUDED.email;
   ```

4. **Verify**
   - User can now log in with HR permissions
   - They have full access to all features

## Troubleshooting

### Issue: User clicks invite link but gets "Invalid token" error

**Solution:** The token might have expired. Invite tokens expire after a certain time (default 24 hours). Re-invite the user.

### Issue: User sets password but can't log in

**Solution:** Check if the user exists in `auth.users` table:

```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = 'user@example.com';
```

### Issue: User logs in but has no role assigned

**Solution:** Assign the role manually using the SQL from Step 4.

### Issue: Redirect URL not working

**Solution:**
1. Verify the redirect URLs are correctly set in Supabase Dashboard
2. Make sure your Site URL matches your application URL
3. Check that the email template uses the correct redirect URL

### Issue: User gets redirected to wrong page after signup

**Solution:** Update the email template to use `/signup` in the URL instead of the default confirmation URL.

## Role Permissions Summary

### HR
- Full access to all features
- Can manage employees, departments, roster, attendance
- Can resign employees
- Can view and manage all data

### PROCUREMENT
- Can manage knife dockets (product catalog)
- Can sell products to employees
- Can view transaction history
- Can edit roster
- Limited employee management access

### ACCOUNTS
- Read-only access to most features
- Can view all data but cannot edit
- Can print invoices from transaction history
- Can process transactions (mark as processed)
- CANNOT edit roster
- CANNOT perform CRUD operations

## Additional Security Considerations

### Email Confirmation
By default, Supabase requires email confirmation. Make sure this is enabled:
1. Go to **Authentication** → **Settings**
2. Under **Email Auth**, ensure "Enable email confirmations" is checked
3. This ensures users must click the link in their email before accessing the system

### Password Requirements
Configure password requirements:
1. Go to **Authentication** → **Settings**
2. Under **Password**, set minimum password length (recommended: 8-12 characters)
3. The signup page validates minimum 6 characters, but you can increase this

## Next Steps

After setting up user invitations:
1. Test the complete flow with a test email address
2. Verify the user can set their password
3. Verify the user can log in
4. Verify the assigned role has correct permissions
5. Update the email template with your branding if needed

## Support

For more information on Supabase Authentication, visit:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
