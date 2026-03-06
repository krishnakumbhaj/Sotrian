// app/api/chat/[chatId]/delete-assistant-after/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import ChatModel, { Message } from '@/models/Chat';
import UserModel from '@/models/User';
import { Types } from 'mongoose';

interface RouteParams {
  params: Promise<{
    chatId: string;
  }>;
}

// POST: Delete the assistant message immediately after the given user message
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { chatId } = await params;
    if (!Types.ObjectId.isValid(chatId)) {
      return new Response('Invalid chat ID', { status: 400 });
    }

    // Parse body safely
    let body: Record<string, unknown> | null = null;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid or empty body', { status: 400 });
    }

    const userMessageId = body?.userMessageId;
    if (!userMessageId || typeof userMessageId !== 'string') {
      return new Response('userMessageId is required', { status: 400 });
    }

    await dbConnect();

    const chat = await ChatModel.findById(chatId);
    if (!chat || !chat.isActive) {
      return new Response('Chat not found', { status: 404 });
    }

    // Verify ownership
    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) return new Response('User not found', { status: 404 });
    if (chat.userId.toString() !== (user._id as Types.ObjectId).toString()) {
      return new Response('Unauthorized', { status: 403 });
    }

    // Find message index
    const idx = chat.messages.findIndex((m: Message) => m.id === userMessageId && m.role === 'user');
    if (idx === -1) {
      return new Response('User message not found', { status: 404 });
    }

    // Find next assistant message after idx
    let deletedMessageId: string | null = null;
    for (let i = idx + 1; i < chat.messages.length; i++) {
      const m = chat.messages[i];
      if (m.role === 'assistant') {
        deletedMessageId = m.id;
        chat.messages.splice(i, 1);
        break;
      }
    }

    if (!deletedMessageId) {
      return new Response(JSON.stringify({ success: true, deleted: false }), { status: 200 });
    }

    await chat.save();
    return new Response(JSON.stringify({ success: true, deleted: true, messageId: deletedMessageId }), { status: 200 });

  } catch (error) {
    console.error('Error deleting assistant after user message:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
