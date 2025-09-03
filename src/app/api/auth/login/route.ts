import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { checkRateLimit, createAuditLog } from '@/lib/rbac';
import { UserRole } from '@/types';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimit = await checkRateLimit(clientIP, 'LOGIN', 10, 15); // 10 attempts per 15 minutes
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Rate limit exceeded. Please try again later.',
          resetTime: rateLimit.resetTime
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      await createAuditLog(null, 'LOGIN_FAILED', `user:${email}`, { reason: 'User not found' }, request);
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await createAuditLog(null, 'LOGIN_FAILED', `user:${user.id}`, { reason: 'Account locked' }, request);
      return NextResponse.json(
        { success: false, message: 'Account is temporarily locked. Please try again later.' },
        { status: 423 }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      await createAuditLog(null, 'LOGIN_FAILED', `user:${user.id}`, { reason: 'Account inactive' }, request);
      return NextResponse.json(
        { success: false, message: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };
      
      // Lock account after 5 failed attempts for 15 minutes
      if (failedAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });

      await createAuditLog(null, 'LOGIN_FAILED', `user:${user.id}`, { reason: 'Invalid password', attempts: failedAttempts }, request);
      
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Reset failed login attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    });

    // Generate token
    const token = generateToken(user.id);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    // Create audit log
    await createAuditLog(
      { id: user.id, email: user.email, role: user.role as UserRole, isActive: user.isActive }, 
      'LOGIN_SUCCESS', 
      `user:${user.id}`, 
      null, 
      request
    );

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    
    await createAuditLog(null, 'LOGIN_ERROR', undefined, { error: error instanceof Error ? error.message : 'Unknown error' }, request);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Login failed' },
      { status: 500 }
    );
  }
}
