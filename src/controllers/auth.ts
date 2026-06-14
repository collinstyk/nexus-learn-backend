// SIGNUP

// LOGIN

// FORGOT PASSWORD

// RESET PASSWORD

import type { Request, Response } from "express";
import prisma from "../prisma.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import catchAsync from "../utils/catchAsync.js";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Helper: Standardized App Token Generator Pass
const signToken = (id: string, name: string) => {
  return jwt.sign({ id, name }, JWT_SECRET, { expiresIn: "1d" });
};

/**
 * Unified Account Registration (Supports Email, Name, and Phone)
 */
export const unifiedSignup = catchAsync(async (req: Request, res: Response) => {
  console.log('REQUEST BODY', req.body);
  const { name, email, phone, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ status: "fail", message: "Name and password are required credentials." });
  }

  if (!email && !phone) {
    return res.status(400).json({ status: "fail", message: "You must provide either an Email address or a Phone number." });
  }

  // Idempotency Interception: Verify Email availability if submitted
  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ status: "fail", message: "An account with this email already exists." });
    }
  }

  // Idempotency Interception: Verify Phone availability if submitted
  if (phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ status: "fail", message: "An account with this phone number already exists." });
    }
  }

  // Cryptographic Password Fortification
  const passwordHash = await bcrypt.hash(password, 12);

  // Commit fresh student entry node to PostgreSQL
  const newUser = await prisma.user.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      passwordHash
    }
  });

  // Simulation Hack: Print free Mock verification indicators directly to console
  if (phone) {
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`\n📱 [MOCK SMS GATEWAY] Generated registration verification token for ${phone}: [ ${mockOtp} ]\n`);
  }

  const token = signToken(newUser.id, newUser.name);

  res.status(201).json({
    status: "success",
    token,
    data: {
      user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone }
    }
  });
});

/**
 * Unified Login (Parses Email OR Phone Number values at runtime)
 */
export const unifiedLogin = catchAsync(async (req: Request, res: Response) => {
  const { identifier, password } = req.body; 

  if (!identifier || !password) {
    return res.status(400).json({ status: "fail", message: "Please provide your account credentials." });
  }

  // Automated String Attribute Deduction Hook
  const isEmail = identifier.includes("@");

  // Dynamic conditional query mapping
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        isEmail ? { email: identifier } : { phone: identifier }
      ]
    }
  });

  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ status: "fail", message: "The credentials provided do not match our records." });
  }

  const token = signToken(user.id, user.name);

  res.status(200).json({
    status: "success",
    token,
    data: {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone }
    }
  });
});

/**
 * Multi-Provider Federated OAuth Receiver (Google, Apple, Microsoft, Facebook)
 */
export const handleOAuthCallback = catchAsync(async (req: Request, res: Response) => {
  const { provider, providerId, email, name } = req.body;
  // payload structure expected: { provider: 'google' | 'apple' | 'microsoft' | 'facebook', providerId: 'sub-12345', email: 'x@edu.com', name: 'Alex' }

  if (!provider || !providerId || !email) {
    return res.status(400).json({ status: "fail", message: "Missing vital provider mapping identifiers." });
  }

  const validProviders = ["google", "apple", "microsoft", "facebook"];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ status: "fail", message: "Invalid OAuth identifier source channel context." });
  }

  // 🎯 Target Mapping Switch Matrix Strategy
  const providerColumnMap: Record<string, any> = {
    google: { googleId: providerId },
    apple: { appleId: providerId },
    microsoft: { microsoftId: providerId },
    facebook: { facebookId: providerId }
  };

  const specificQueryConstraint = providerColumnMap[provider];

  // Look for existing account linking mapping signatures
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        specificQueryConstraint,
        { email }
      ]
    }
  });

  if (!user) {
    // Brand new passwordless student onboarding account entry initialization
    user = await prisma.user.create({
      data: {
        name: name || `${provider.toUpperCase()} Student`,
        email,
        passwordHash: null,
        ...specificQueryConstraint
      }
    });
    console.log(`🌱 [OAuth Identity Generated] Registered federated profile under target: ${user.email}`);
  } else if (!user[provider + "Id" as keyof typeof user]) {
    // Account existed under matching email context, dynamically bind the new third party identity flag to it
    user = await prisma.user.update({
      where: { id: user.id },
      data: specificQueryConstraint
    });
    console.log(`🔗 [OAuth Federated Link] Linked missing ${provider} provider index to user profile ID: ${user.id}`);
  }

  const token = signToken(user.id, user.name);

  res.status(200).json({
    status: "success",
    token,
    data: {
      user: { id: user.id, name: user.name, email: user.email }
    }
  });
});

// 🧠 High-Speed Temporary Recovery Cache Buffer (Stored in server RAM)
// Maps: HashedToken -> { userId: string, expiresAt: Date }
const passwordResetCache = new Map<string, { userId: string; expiresAt: Date }>();

/**
 * 🛰️ Operation 4: Recovery Token Ticket Generator (Forgot Password)
 */
export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { identifier } = req.body; // Can be their Email address OR Phone number string

  if (!identifier) {
    return res.status(400).json({ status: "fail", message: "Please provide your account Email or Phone number." });
  }

  const isEmail = identifier.includes("@");

  // 1. Locate the target user profile node
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        isEmail ? { email: identifier } : { phone: identifier }
      ]
    }
  });

  if (!user) {
    return res.status(404).json({ status: "fail", message: "No account found matching that identifier." });
  }

  // 🛡️ SECURITY SHIELD: Prevent password overrides on purely passwordless OAuth profiles
  if (!user.passwordHash) {
    return res.status(400).json({
      status: "fail",
      message: "This account was registered using a third-party provider (OAuth). Please authenticate via your provider panel."
    });
  }

  // 2. Cryptographic Secret Ticket Generation
  const rawResetToken = crypto.randomBytes(32).toString("hex");
  const hashedResetToken = crypto.createHash("sha256").update(rawResetToken).digest("hex");
  
  // Set explicit temporary lifespan bounds (Valid for 10 minutes)
  const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

  // 3. Commit parameters to our high-speed RAM state cache map
  passwordResetCache.set(hashedResetToken, {
    userId: user.id,
    expiresAt: tokenExpiry
  });

  // 4. MOCK DISPATCH TRANSMISSION LAYER (100% Free Presentation Output)
  console.log(`\n🔒 [SECURITY RESET PROTOCOL INITIATED]`);
  if (isEmail) {
    console.log(`📬 [MOCK EMAIL ENGINE] Sent link to mail system pipeline for ${user.email}:`);
    console.log(`👉 POST http://localhost:5000/api/v1/auth/reset-password/${rawResetToken}\n`);
  } else {
    console.log(`📱 [MOCK SMS GATEWAY] Dispatched text message route alert to mobile line ${user.phone}:`);
    console.log(`👉 Use Code token: [ ${rawResetToken} ] inside your mobile UI wrapper input.\n`);
  }

  res.status(200).json({
    status: "success",
    message: "Security verification token successfully generated and dispatched to terminal logs.",
    // Exposed in response body for convenient front-end development mock parsing
    developmentToken: rawResetToken 
  });
});

/**
 * 🔄 Operation 5: Password Mutation Override (Reset Password)
 */
export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params as {token: string}; // The raw cryptographic token pulled from the route parameter url
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ status: "fail", message: "Please provide your new password string replacement." });
  }

  // 1. Re-hash incoming parameter token to cross-verify against internal cache maps
  const verificationHash = crypto.createHash("sha256").update(token).digest("hex");
  const cachedTicket = passwordResetCache.get(verificationHash);

  if (!cachedTicket) {
    return res.status(400).json({ status: "fail", message: "Token verification failed. Token is invalid or has expired." });
  }

  // 2. Validate chronological time bound constraints
  if (new Date() > cachedTicket.expiresAt) {
    passwordResetCache.delete(verificationHash); // Clear dead row
    return res.status(400).json({ status: "fail", message: "This recovery session has expired. Please request a new token." });
  }

  // 3. Hash the replacement credentials safely
  const newPasswordHash = await bcrypt.hash(password, 12);

  // 4. Database execution step: Overwrite passwordHash values on disk
  await prisma.user.update({
    where: { id: cachedTicket.userId },
    data: { passwordHash: newPasswordHash }
  });

  // 5. Invalidation: Drop token from RAM cache immediately so it can never be recycled!
  passwordResetCache.delete(verificationHash);
  console.log(`🧹 [Cache Invalidation] Successfully consumed and purged reset token from volatile memory structures.`);

  res.status(200).json({
    status: "success",
    message: "Your security credentials have been mutated successfully. Access grid synchronized."
  });
});