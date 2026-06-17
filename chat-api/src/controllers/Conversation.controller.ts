import { Request, Response } from 'express';
import prisma from '../configs/prisma';
import { getSocketServer } from '../socket/socket';
import { createAndDeliverNotification } from '../services/notification.service';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';

const MEMBER_SELECT = {
  user_id: true,
  joined_at: true,
  user: {
    select: {
      id: true,
      full_name: true,
      profile_picture_url: true,
      status: true,
    },
  },
};

// Helper to check if a user has a global admin role
async function isGlobalAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { select: { name: true } } },
  });
  return user?.roles.some((role) => role.name === 'ADMIN' || role.name === 'SUPER_ADMIN') ?? false;
}

// ──────────────────────────────────────────────────────────────────
// Create conversation (1-1 or group)
// ──────────────────────────────────────────────────────────────────
export async function createConversation(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { name, memberIds, isGroup, conv_type } = req.body as {
    name?: string;
    memberIds: string[];
    isGroup?: boolean;
    conv_type?: string;
  };

  const allMemberIds = [...new Set([user.id, ...memberIds])];
  if (allMemberIds.length < 2) {
    throw new AppError('At least 2 members required', 400);
  }

  // For direct (1-1) conversations, check if one already exists
  if (!isGroup && allMemberIds.length === 2) {
    const otherId = allMemberIds.find((id) => id !== user.id)!;
    const existing = await prisma.conversation.findFirst({
      where: {
        is_group: false,
        AND: [
          { members: { some: { user_id: user.id } } },
          { members: { some: { user_id: otherId } } },
        ],
        members: { every: { user_id: { in: allMemberIds } } },
      },
      include: { members: { select: MEMBER_SELECT } },
    });
    if (existing) {
      res.json({ success: true, data: existing });
      return;
    }
  }



  const conversation = await prisma.conversation.create({
    data: {
      name: isGroup ? name : null,
      is_group: isGroup ?? false,
      conv_type: conv_type || 'direct',
      created_by: user.id,
      members: {
        create: allMemberIds.map((id) => ({
          user_id: id,
        })),
      },
    },
    include: { members: { select: MEMBER_SELECT } },
  });

  const io = getSocketServer();
  for (const memberId of allMemberIds) {
    io.in(`user:${memberId}`).socketsJoin(`conv:${conversation.id}`);
    if (memberId !== user.id) {
      await createAndDeliverNotification({
        userId: memberId,
        type: 'GROUP_INVITE',
        title: isGroup ? `Added to "${name}"` : `${user.full_name} started a conversation`,
        body: 'Tap to open',
        data: { conversationId: conversation.id },
      });
    }
  }

  res.status(201).json({ success: true, data: conversation });
}
  // conversation.controller.ts
export async function createDirectConversation(req: Request, res: Response) {
  const { user } = req as AuthenticatedRequest;
  const { userId } = req.body;
 
  // Return existing DM if one already exists
  const existing = await prisma.conversation.findFirst({
    where: {
      is_group: false,
      AND: [
        { members: { some: { user_id: user.id } } },
        { members: { some: { user_id: userId } } },
      ],
    },
    include: {
      members: {
        select: {
          user_id: true,
          joined_at: true,
          user: { select: { id: true, full_name: true, profile_picture_url: true, status: true } },
        },
      },
    },
  });
  if (existing) return res.json({ success: true, data: existing });
 
  const conversation = await prisma.conversation.create({
    data: {
      is_group: false,
      created_by: user.id,
      members: {
        create: [{ user_id: user.id }, { user_id: userId }],
      },
    },
    // Always include members so the frontend never gets conv.members = undefined
    include: {
      members: {
        select: {
          user_id: true,
          joined_at: true,
          user: { select: { id: true, full_name: true, profile_picture_url: true, status: true } },
        },
      },
    },
  });
 
  return res.status(201).json({ success: true, data: conversation });
}

// ──────────────────────────────────────────────────────────────────
// List conversations for current user (ordered by creation date)
// ──────────────────────────────────────────────────────────────────
export async function getConversations(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;

  const conversations = await prisma.conversation.findMany({
    where: { members: { some: { user_id: user.id } } },
    orderBy: { created_at: 'desc' }, // ✅ use created_at (no updated_at)
    include: {
      members: { select: MEMBER_SELECT },
      messages: {
        orderBy: { created_at: 'desc' },
        take: 1,
        select: {
          id: true,
          content: true,
          media_type: true,
          created_at: true,
          sender_id: true,
        },
      },
    },
  });

  res.json({ success: true, data: conversations });
}

// ──────────────────────────────────────────────────────────────────
// Get single conversation by ID
// ──────────────────────────────────────────────────────────────────
export async function getConversation(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params;

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      members: { some: { user_id: user.id } },
    },
    include: { members: { select: MEMBER_SELECT } },
  });

  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  res.json({ success: true, data: conversation });
}

// ──────────────────────────────────────────────────────────────────
// Add a new member to a group conversation (global admin or creator)
// ──────────────────────────────────────────────────────────────────
export async function addMember(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { id: conversationId } = req.params;
  const { userId: newUserId } = req.body as { userId: string };

  // Verify conversation exists and is a group
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { is_group: true, created_by: true },
  });
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  if (!conversation.is_group) {
    throw new AppError('Cannot add members to a direct conversation', 400);
  }

  // Check permissions: global admin OR the conversation creator
  const isAdmin = await isGlobalAdmin(user.id);
  if (!isAdmin && conversation.created_by !== user.id) {
    throw new AppError('Only admins or the conversation creator can add members', 403);
  }

  // Check if user is already a member
  const existing = await prisma.conversationMember.findUnique({
    where: {
      conversation_id_user_id: {
        conversation_id: conversationId,
        user_id: newUserId,
      },
    },
  });
  if (existing) {
    throw new AppError('User is already a member', 400);
  }

  // Add member
  await prisma.conversationMember.create({
    data: {
      conversation_id: conversationId,
      user_id: newUserId,
    },
  });

  const io = getSocketServer();
  io.in(`user:${newUserId}`).socketsJoin(`conv:${conversationId}`);
  io.to(`conv:${conversationId}`).emit('member:joined', {
    conversationId,
    userId: newUserId,
  });

  await createAndDeliverNotification({
    userId: newUserId,
    type: 'MEMBER_JOINED',
    title: 'You were added to a conversation',
    body: 'Tap to open',
    data: { conversationId },
  });

  res.json({ success: true, data: { message: 'Member added' } });
}

// ──────────────────────────────────────────────────────────────────
// Remove a member (or leave) – global admin or creator can remove others
// ──────────────────────────────────────────────────────────────────
export async function removeMember(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { id: conversationId, memberId } = req.params;
  const isSelf = memberId === user.id;

  // Verify conversation exists and is a group
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { is_group: true, created_by: true },
  });
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }
  if (!conversation.is_group) {
    throw new AppError('Cannot remove members from a direct conversation', 400);
  }

  if (!isSelf) {
    const isAdmin = await isGlobalAdmin(user.id);
    if (!isAdmin && conversation.created_by !== user.id) {
      throw new AppError('Only admins or the conversation creator can remove other members', 403);
    }
  }

  // Remove the member
  await prisma.conversationMember.delete({
    where: {
      conversation_id_user_id: {
        conversation_id: conversationId,
        user_id: memberId,
      },
    },
  });

  const io = getSocketServer();
  io.to(`conv:${conversationId}`).emit('member:left', { conversationId, userId: memberId });
  io.in(`user:${memberId}`).socketsLeave(`conv:${conversationId}`);

  res.status(204).send();
}

// ──────────────────────────────────────────────────────────────────
// Optional: Get all global admin users (if needed elsewhere)
// ──────────────────────────────────────────────────────────────────
export async function getGlobalAdmins(res: Response): Promise<void> {
  const admins = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          name: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
      },
    },
    select: { id: true, full_name: true, email: true },
  });
  res.json({ success: true, data: admins });
}