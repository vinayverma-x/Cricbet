import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import bcrypt from "bcryptjs"

/**
 * ONE-TIME SETUP: Create the first admin user on Vercel
 * 
 * This endpoint creates a new admin user or promotes an existing user to admin.
 * It requires a secret key that matches ADMIN_SETUP_SECRET environment variable.
 * 
 * SECURITY: After using this endpoint once, either:
 * 1. Remove the ADMIN_SETUP_SECRET from Vercel environment variables, OR
 * 2. Delete this file entirely
 * 
 * Usage:
 * POST /api/setup-admin
 * Body: { "secret": "your-secret-key", "email": "admin@example.com", "password": "yourpassword", "name": "Admin Name" }
 */
export async function POST(req: NextRequest) {
  try {
    const { secret, email, password, name } = await req.json()

    // Verify the setup secret
    const setupSecret = process.env.ADMIN_SETUP_SECRET
    
    if (!setupSecret) {
      return NextResponse.json(
        { success: false, message: "Admin setup is disabled. Set ADMIN_SETUP_SECRET in environment variables." },
        { status: 403 }
      )
    }

    if (secret !== setupSecret) {
      return NextResponse.json(
        { success: false, message: "Invalid secret key" },
        { status: 401 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      )
    }

    await dbConnect()

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() })

    if (user) {
      // User exists, promote to admin
      if (user.role === "admin") {
        return NextResponse.json({
          success: true,
          message: `User "${email}" is already an admin!`,
          action: "already_admin"
        })
      }

      user.role = "admin"
      await user.save()

      return NextResponse.json({
        success: true,
        message: `Existing user "${email}" has been promoted to admin!`,
        action: "promoted"
      })
    }

    // Create new admin user
    if (!password || !name) {
      return NextResponse.json(
        { success: false, message: "Password and name are required to create a new admin user" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Generate a unique referral code
    const referralCode = `ADMIN${Date.now().toString(36).toUpperCase()}`

    user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "admin",
      referralCode,
      walletBalance: 0,
      kycStatus: "verified", // Admin doesn't need KYC
    })

    return NextResponse.json({
      success: true,
      message: `New admin user "${email}" created successfully!`,
      action: "created",
      note: "IMPORTANT: Remove ADMIN_SETUP_SECRET from environment variables now!"
    })

  } catch (error: any) {
    console.error("Setup admin error:", error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check if setup is available
export async function GET() {
  const setupSecret = process.env.ADMIN_SETUP_SECRET
  
  return NextResponse.json({
    setupAvailable: !!setupSecret,
    message: setupSecret 
      ? "Admin setup is available. Use POST with secret key." 
      : "Admin setup is disabled (no ADMIN_SETUP_SECRET set)."
  })
}
