// app/api/chat/[chatId]/message/[messageId]/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import ChatModel from '@/models/Chat';
import UserModel from '@/models/User';
import { Types } from 'mongoose';

interface RouteParams {
  params: Promise<{
    chatId: string;
    messageId: string;
  }>;
}

// PATCH: Update a specific message's content (used for edited user messages)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { chatId, messageId } = await params;

    if (!Types.ObjectId.isValid(chatId)) {
      return new Response('Invalid chat ID', { status: 400 });
    }

    // Parse body safely
    let body: any = null;
    try {
      body = await request.json();
    } catch (e) {
      return new Response('Invalid or empty body', { status: 400 });
    }

    const content = body?.content;
    if (!content || typeof content !== 'string') {
      return new Response('Content is required', { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) return new Response('User not found', { status: 404 });

    const chat = await ChatModel.findById(chatId);
    if (!chat || !chat.isActive) return new Response('Chat not found', { status: 404 });
    if (chat.userId.toString() !== (user._id as Types.ObjectId).toString()) {
      return new Response('Unauthorized', { status: 403 });
    }

    // Find the message and ensure it's a user message
    const msgIndex = chat.messages.findIndex((m: any) => m.id === messageId);
    if (msgIndex === -1) {
      return new Response('Message not found', { status: 404 });
    }

    if (chat.messages[msgIndex].role !== 'user') {
      return new Response('Only user messages can be edited', { status: 400 });
    }

    // Update content and timestamp
    chat.messages[msgIndex].content = content.trim();
    chat.messages[msgIndex].timestamp = new Date();

    await chat.save();

    return Response.json({ success: true, message: chat.messages[msgIndex] });
  } catch (error) {
    console.error('Error updating message:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
