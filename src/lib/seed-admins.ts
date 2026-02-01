import dbConnect from './mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

// Admin users to create on first run
const ADMIN_USERS = [
  {
    name: 'Jyothika Admin',
    email: 'svljyothikanookala24@gmail.com',
    password: '123456',
  },
  {
    name: 'Vinay Admin',
    email: 'verma.vinay.x@gmail.com',
    password: '123456',
  },
];

let seeded = false;

export async function seedAdminUsers() {
  // Only run once per server instance
  if (seeded) return;
  seeded = true;

  try {
    await dbConnect();

    for (const admin of ADMIN_USERS) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: admin.email.toLowerCase() });

      if (existingUser) {
        // If user exists but not admin, make them admin
        if (existingUser.role !== 'admin') {
          existingUser.role = 'admin';
          await existingUser.save();
          console.log(`✅ Upgraded ${admin.email} to admin`);
        }
      } else {
        // Create new admin user
        const hashedPassword = await bcrypt.hash(admin.password, 12);
        const referralCode = `ADMIN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

        await User.create({
          name: admin.name,
          email: admin.email.toLowerCase(),
          password: hashedPassword,
          role: 'admin',
          referralCode,
          walletBalance: 0,
          kycStatus: 'verified',
        });

        console.log(`✅ Created admin user: ${admin.email}`);
      }
    }
  } catch (error) {
    console.error('Error seeding admin users:', error);
  }
}
