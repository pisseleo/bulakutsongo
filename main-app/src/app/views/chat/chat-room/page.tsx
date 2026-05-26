'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Send, Paperclip, X, File, Image as ImageIcon,
  Check, CheckCheck, Trash2, ArrowLeft, MoreVertical
} from 'lucide-react';
import { useAuth } from '@/context/Auth.context';
import { getMessages, sendMessage, markAsRead, deleteMessage } from '@/services/chat.service';
import type { Message, Conversation } from '@/types';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import clsx from 'clsx';

interface ChatRoomProps {
  conversation: Conversation;
  onBack?: () => void;
}

export default function ChatRoom({ conversation, onBack }: ChatRoomProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const otherMember = conversation.members.find(m => m.userId !== user?.id);
  const displayName = conversation.type === 'direct'
    ? (otherMember?.user.full_name || 'Unknown')
    : (conversation.name || 'Group');

  const displayAvatar = conversation.type === 'direct'
    ? otherMember?.user.profile_picture_url
    : '';

  // Load initial messages
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const msgs = await getMessages(conversation.id, { limit: 50 });
        setMessages(msgs);
        // Mark all as read
        if (msgs.length) await markAsRead(msgs[msgs.length - 1].id).catch(() => {});
      } catch {}
      setLoading(false);
    };
    load();
  }, [conversation.id]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-grow textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleSend = async () => {
    if ((!text.trim() && !file) || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    setFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      const msg = await sendMessage({ conversationId: conversation.id, content, file: file || undefined });
      setMessages(prev => [...prev, msg]);
    } catch {}
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDelete = async (id: string) => {
    await deleteMessage(id).catch(() => {});
    setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m));
    setActionMsg(null);
  };

  // Group messages by date
  const groups = groupByDate(messages);

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-900 bg-zinc-950 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="relative">
          {displayAvatar
            ? <Image src={displayAvatar} alt={displayName} width={36} height={36} className="rounded-xl object-cover" />
            : <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
              {displayName[0]?.toUpperCase()}
            </div>
          }
          {conversation.type === 'direct' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-950" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{displayName}</h2>
          <p className="text-xs text-zinc-500">
            {conversation.type === 'group'
              ? `${conversation.members.length} members`
              : 'Direct message'}
          </p>
        </div>
        <button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        onClick={() => setActionMsg(null)}>
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}

        {groups.map(({ label, msgs }) => (
          <div key={label}>
            {/* Date separator */}
            <div className="flex items-center gap-3 py-4">
              <div className="flex-1 h-px bg-zinc-900" />
              <span className="text-[11px] text-zinc-600 font-medium px-2">{label}</span>
              <div className="flex-1 h-px bg-zinc-900" />
            </div>

            {msgs.map((msg, i) => {
              const isOwn = msg.senderId === user?.id;
              const prev = msgs[i - 1];
              const isContinuation = prev?.senderId === msg.senderId
                && (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 60000;

              return (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  isOwn={isOwn}
                  isContinuation={isContinuation}
                  showMenu={actionMsg === msg.id}
                  onMenu={() => setActionMsg(prev => prev === msg.id ? null : msg.id)}
                  onDelete={() => handleDelete(msg.id)}
                />
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* File preview */}
      {file && (
        <div className="mx-4 mb-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            {file.type.startsWith('image/') ? <ImageIcon size={14} className="text-amber-400" /> : <File size={14} className="text-amber-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{file.name}</p>
            <p className="text-[10px] text-zinc-500">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button onClick={() => setFile(null)} className="text-zinc-500 hover:text-white p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="flex items-end gap-2 bg-zinc-950 border border-zinc-900 rounded-2xl px-3 py-2.5 focus-within:border-zinc-700 transition-colors">
          <button onClick={() => fileRef.current?.click()}
            className="flex-shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-900 transition-colors self-end mb-0.5">
            <Paperclip size={17} />
          </button>
          <input ref={fileRef} type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${displayName}…`}
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none py-0.5"
            style={{ maxHeight: '120px' }}
          />

          <button
            onClick={handleSend}
            disabled={(!text.trim() && !file) || sending}
            className={clsx(
              'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all self-end',
              text.trim() || file
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 hover:-translate-y-0.5'
                : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
            )}>
            {sending
              ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message Row ──────────────────────────────────────────────────────────────

interface MessageRowProps {
  msg: Message;
  isOwn: boolean;
  isContinuation: boolean;
  showMenu: boolean;
  onMenu: () => void;
  onDelete: () => void;
}

function MessageRow({ msg, isOwn, isContinuation, showMenu, onMenu, onDelete }: MessageRowProps) {
  const isDeleted = !!msg.deletedAt;

  return (
    <div className={clsx('group flex gap-2.5', isOwn ? 'flex-row-reverse' : 'flex-row', !isContinuation && 'mt-3')}>
      {/* Avatar */}
      <div className={clsx('flex-shrink-0 w-8 self-end', isContinuation && 'invisible')}>
        {msg.sender?.profile_picture_url
          ? <Image src={msg.sender?.profile_picture_url} alt="" width={32} height={32} className="rounded-xl object-cover" />
          : <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
            {msg.sender?.full_name[0]?.toUpperCase()}
          </div>
        }
      </div>

      <div className={clsx('flex flex-col max-w-[70%]', isOwn && 'items-end')}>
        {!isContinuation && (
          <div className={clsx('flex items-baseline gap-2 mb-1', isOwn && 'flex-row-reverse')}>
            <span className="text-xs font-semibold text-zinc-300">{msg.sender?.full_name}</span>
            <span className="text-[10px] text-zinc-600">{format(new Date(msg.createdAt), 'h:mm a')}</span>
          </div>
        )}

        <div className="relative flex items-end gap-1.5">
          {/* Bubble */}
          <div
            onClick={(e) => { e.stopPropagation(); if (!isDeleted) onMenu(); }}
            className={clsx(
              'px-3.5 py-2.5 rounded-2xl text-sm cursor-pointer transition-all',
              isDeleted ? 'italic text-zinc-600 bg-zinc-900 border border-zinc-800'
                : isOwn
                  ? 'bg-amber-500 text-black rounded-br-sm hover:bg-amber-400'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-sm hover:border-zinc-700',
              isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'
            )}
          >
            {isDeleted ? 'Message deleted' : (
              <>
                {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                {msg.media_url && <AttachmentPreview attachment={msg.media_url} />}
              </>
            )}
          </div>

          {/* Read receipt */}
          {isOwn && !isDeleted && (
            <div className="flex-shrink-0 mb-1">
              {msg.isRead
                ? <CheckCheck size={14} className="text-amber-400" />
                : <Check size={14} className="text-zinc-600" />
              }
            </div>
          )}
        </div>

        {/* Context menu */}
        {showMenu && !isDeleted && isOwn && (
          <div className={clsx('mt-1 flex gap-1 animate-in slide-in-from-top-1', isOwn && 'justify-end')}>
            <button onClick={onDelete}
              className="flex items-center gap-1.5 text-xs text-red-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
              <Trash2 size={11} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Attachment Preview ───────────────────────────────────────────────────────

function AttachmentPreview({ attachment }: { attachment: NonNullable<Message['media_url']> }) {
  if (attachment?.startsWith('image/')) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden max-w-xs">
        <Image src={attachment} alt="attachment" width={300} height={200}
          className="object-cover rounded-xl" style={{ maxHeight: 200 }} />
      </div>
    );
  }
  return (
    <a href={attachment} target="_blank" rel="noreferrer"
      className="mt-2 flex items-center gap-2.5 px-3 py-2 bg-black/20 rounded-xl hover:bg-black/30 transition-colors">
      <File size={16} />
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{attachment}</p>
      </div>
    </a>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByDate(messages: Message[]): { label: string; msgs: Message[] }[] {
  const map = new Map<string, Message[]>();
  for (const msg of messages) {
    const d = new Date(msg.createdAt);
    const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(msg);
  }
  return Array.from(map.entries()).map(([label, msgs]) => ({ label, msgs }));
}