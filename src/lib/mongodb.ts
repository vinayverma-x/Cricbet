import mongoose from 'mongoose';

// Global interface to prevent hot-reload connection errors in development
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  seeded: boolean;
}

declare global {
  var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, seeded: false };
}

// Admin users to be created on first connection
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

async function seedAdminUsers() {
  if (cached.seeded) return;
  cached.seeded = true;

  try {
    // Dynamic imports to avoid circular dependency
    const bcrypt = (await import('bcryptjs')).default;
    const User = (await import('@/models/User')).default;

    for (const admin of ADMIN_USERS) {
      const existingUser = await User.findOne({ email: admin.email.toLowerCase() });

      if (existingUser) {
        if (existingUser.role !== 'admin') {
          existingUser.role = 'admin';
          await existingUser.save();
          console.log(`✅ Upgraded ${admin.email} to admin`);
        }
      } else {
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

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongoose) => {
      // Seed admin users after connection
      await seedAdminUsers();
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;