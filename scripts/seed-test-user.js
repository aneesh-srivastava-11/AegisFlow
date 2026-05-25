import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seed() {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
    
    if (!getApps().length) {
      if (fs.existsSync(serviceAccountPath)) {
        initializeApp({
          credential: cert(serviceAccountPath),
        });
      } else {
        // Assume default credentials
        initializeApp();
      }
    }

    const auth = getAuth();
    const email = 'test1@test.com';
    const password = 'test1234';

    try {
      // Check if user exists
      const user = await auth.getUserByEmail(email);
      console.log(`User ${email} already exists with UID: ${user.uid}`);
      // Update password just in case
      await auth.updateUser(user.uid, { password });
      console.log(`Updated password for ${email}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create user
        const user = await auth.createUser({
          email,
          password,
          displayName: 'Test User',
        });
        console.log(`Successfully created new user ${email} with UID: ${user.uid}`);
      } else {
        throw error;
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed user:', error);
    process.exit(1);
  }
}

seed();
