import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { checkRateLimit, createAuditLog } from '@/lib/rbac';
import { UserRole } from '@/types';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  language: z.string().optional().default('en')
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimit = await checkRateLimit(clientIP, 'REGISTER', 5, 60); // 5 attempts per hour
    
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
    const { email, password, name, language } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      await createAuditLog(null, 'REGISTER_FAILED', `user:${email}`, { reason: 'User already exists' }, request);
      return NextResponse.json(
        { success: false, message: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: UserRole.USER, // Default role
        language
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Generate token
    const token = generateToken(user.id);

    // Create audit log
    await createAuditLog({ id: user.id, email: user.email, role: user.role as UserRole, isActive: user.isActive }, 'USER_REGISTERED', `user:${user.id}`, null, request);

    return NextResponse.json({
      success: true,
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    await createAuditLog(null, 'REGISTER_ERROR', undefined, { error: error instanceof Error ? error.message : 'Unknown error' }, request);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Registration failed' },
      { status: 500 }
    );
  }
}
