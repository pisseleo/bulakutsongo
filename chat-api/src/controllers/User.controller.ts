import { Request, Response } from 'express';
import prisma from '../configs/prisma';
import { getAllOnlineUsers } from '../services/presence.service';
import { AuthenticatedRequest } from '../types';

/**
 * Get all online users
 * GET /users/online
 */
export async function getOnlineUsers(_req: Request, res: Response): Promise<void> {
  try {
    const onlineUsers = await getAllOnlineUsers();
    res.json({
      success: true,
      data: onlineUsers,
      meta: {
        count: onlineUsers.length,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch online users',
    });
  }
}

/**
 * Get current user profile
 * GET /users/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      full_name: true,
      profile_picture_url: true,
      is_verified: true,
      is_2fa_enabled: true,
      status: true,
      last_seen: true,
    },
  });
  res.json({ success: true, data: profile });
}

/**
 * Update user profile (partial)
 * PATCH /users/me
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { full_name, profile_picture_url } = req.body;
  
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { full_name, profile_picture_url },
    select: {
      id: true,
      email: true,
      full_name: true,
      profile_picture_url: true,
      status: true,
    },
  });
  
  res.json({ success: true, data: updated });
}

/**
 * Get user profile by ID
 * GET /users/:id
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      full_name: true,
      profile_picture_url: true,
      status: true,
      last_seen: true,
    },
  });
  
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  
  res.json({ success: true, data: user });
}
