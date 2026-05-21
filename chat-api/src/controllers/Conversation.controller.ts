import { Request, Response } from 'express';
import prisma from '../configs/prisma';
import { getSocketServer } from '../socket/socket';
import { createAndDeliverNotification } from '../services/notification.service';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';

const MEMBER_SELECT = {
  user_id: true,
  role: true,
  joined_at: true,
  user: { select: { id: true, full_name: true, profile_picture_url: true, status: true } },
};

// ── Create conversation ───────────────────────────────────────────────────────
export async function createConversation(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { name, memberIds, isGroup } = req.body as {
    name?: string;
    memberIds: string[];
    isGroup?: boolean;
  };

  const allMemberIds = [...new Set([user.id, ...memberIds])];
  if (allMemberIds.length < 2) throw new AppError('At least 2 members required', 400);

  // For direct (1-1) conversations, check if one already exists
  if (!isGroup && allMemberIds.length === 2) {
    const other = allMemberIds.find((id) => id !== user.id)!;
    const existing = await prisma.conversation.findFirst({
      where: {
        is_group: false,
        members: { every: { user_id: { in: allMemberIds } } },
        AND: [
          { members: { some: { user_id: user.id } } },
          { members: { some: { user_id: other } } },
        ],
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
      created_by: user.id,
      members: {
        create: allMemberIds.map((id) => ({
          user_id: id,
          role: id === user.id ? 'ADMIN' : 'MEMBER',
        })),
      },
    },
    include: { members: { select: MEMBER_SELECT } },
  });

  // Notify new members via Socket.IO
  const io = getSocketServer();
  for (const id of allMemberIds) {
    io.in(`user:${id}`).socketsJoin(`conv:${conversation.id}`);
    if (id !== user.id) {
      await createAndDeliverNotification({
        userId: id,
        type: 'GROUP_INVITE',
        title: isGroup ? `Added to "${name}"` : `${user.full_name} started a conversation`,
        body: 'Tap to open',
        data: { conversationId: conversation.id },
      });
    }
  }

  res.status(201).json({ success: true, data: conversation });
}

// ── List conversations ────────────────────────────────────────────────────────
export async function getConversations(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;

  const conversations = await prisma.conversation.findMany({
    where: { members: { some: { user_id: user.id } } },
    orderBy: { updated_at: 'desc' },
    include: {
      members: { select: MEMBER_SELECT },
      messages: {
        orderBy: { created_at: 'desc' },
        take: 1,
        select: { id: true, content: true, media_type: true, created_at: true, sender_id: true },
      },
    },
  });

  res.json({ success: true, data: conversations });
}

// ── Get single conversation ───────────────────────────────────────────────────
export async function getConversation(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { id } = req.params;

  const conv = await prisma.conversation.findFirst({
    where: { id, members: { some: { user_id: user.id } } },
    include: { members: { select: MEMBER_SELECT } },
  });
  if (!conv) throw new AppError('Conversation not found', 404);

  res.json({ success: true, data: conv });
}

// ── Add member ────────────────────────────────────────────────────────────────
export async function addMember(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { id: conversationId } = req.params;
  const { userId: newUserId } = req.body as { userId: string };

  const requester = await prisma.conversationMember.findUnique({
    where: { conversation_id_user_id: { conversation_id: conversationId, user_id: user.id } },
  });
  if (!requester || requester.role !== 'ADMIN') throw new AppError('Only admins can add members', 403);

  await prisma.conversationMember.create({
    data: { conversation_id: conversationId, user_id: newUserId, role: 'MEMBER' },
  });

  const io = getSocketServer();
  io.in(`user:${newUserId}`).socketsJoin(`conv:${conversationId}`);
  io.to(`conv:${conversationId}`).emit('member:joined', { conversationId, userId: newUserId });

  await createAndDeliverNotification({
    userId: newUserId,
    type: 'MEMBER_JOINED',
    title: 'You were added to a conversation',
    body: 'Tap to open',
    data: { conversationId },
  });

  res.json({ success: true, data: { message: 'Member added' } });
}

// ── Remove member / Leave ─────────────────────────────────────────────────────
export async function removeMember(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { id: conversationId, memberId } = req.params;
  const isSelf = memberId === user.id;

  if (!isSelf) {
    const requester = await prisma.conversationMember.findUnique({
      where: { conversation_id_user_id: { conversation_id: conversationId, user_id: user.id } },
    });
    if (!requester || requester.role !== 'ADMIN') throw new AppError('Only admins can remove members', 403);
  }

  await prisma.conversationMember.delete({
    where: { conversation_id_user_id: { conversation_id: conversationId, user_id: memberId } },
  });

  const io = getSocketServer();
  io.to(`conv:${conversationId}`).emit('member:left', { conversationId, userId: memberId });
  io.in(`user:${memberId}`).socketsLeave(`conv:${conversationId}`);

  res.status(204).send();
}