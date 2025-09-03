import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, createAuditLog, canAccessResource } from '@/lib/rbac';
import { UserRole } from '@/types';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['USER', 'HR_ADMIN', 'SUPER_ADMIN']).optional(),
  isActive: z.boolean().optional(),
  language: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    // Require HR_ADMIN or higher
    const authResult = await requireAuth(request, UserRole.HR_ADMIN);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) {
      where.role = role;
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          language: true,
          isActive: true,
          lastLoginAt: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { analyses: true }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    // Create audit log
    await createAuditLog(user, 'ADMIN_USERS_VIEWED', undefined, { search, role, isActive, page }, request);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Require HR_ADMIN or higher
    const authResult = await requireAuth(request, UserRole.HR_ADMIN);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData = updateUserSchema.parse(body);

    // Only SUPER_ADMIN can change roles or activate/deactivate HR_ADMIN accounts
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Role change validation
    if (updateData.role) {
      if (user.role !== UserRole.SUPER_ADMIN) {
        return NextResponse.json(
          { success: false, message: 'Only super admins can change user roles' },
          { status: 403 }
        );
      }
      
      // Prevent demoting the last super admin
      if (targetUser.role === UserRole.SUPER_ADMIN && updateData.role !== UserRole.SUPER_ADMIN) {
        const superAdminCount = await prisma.user.count({
          where: { role: UserRole.SUPER_ADMIN, isActive: true }
        });
        
        if (superAdminCount <= 1) {
          return NextResponse.json(
            { success: false, message: 'Cannot demote the last active super admin' },
            { status: 400 }
          );
        }
      }
    }

    // Activity change validation
    if (updateData.isActive === false) {
      if (user.role !== UserRole.SUPER_ADMIN && targetUser.role === UserRole.HR_ADMIN) {
        return NextResponse.json(
          { success: false, message: 'Only super admins can deactivate admin accounts' },
          { status: 403 }
        );
      }
      
      // Prevent deactivating self
      if (userId === user.id) {
        return NextResponse.json(
          { success: false, message: 'Cannot deactivate your own account' },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Create audit log
    await createAuditLog(
      user, 
      'ADMIN_USER_UPDATED', 
      `user:${userId}`, 
      { changes: updateData, targetEmail: targetUser.email }, 
      request
    );

    return NextResponse.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', errors: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require SUPER_ADMIN for user deletion
    const authResult = await requireAuth(request, UserRole.SUPER_ADMIN);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, isActive: true }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting the last super admin
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      const superAdminCount = await prisma.user.count({
        where: { role: UserRole.SUPER_ADMIN, isActive: true }
      });
      
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'Cannot delete the last active super admin' },
          { status: 400 }
        );
      }
    }

    // Delete user (this will cascade delete analyses due to onDelete: Cascade)
    await prisma.user.delete({
      where: { id: userId }
    });

    // Create audit log
    await createAuditLog(
      user, 
      'ADMIN_USER_DELETED', 
      `user:${userId}`, 
      { targetEmail: targetUser.email, targetRole: targetUser.role }, 
      request
    );

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
