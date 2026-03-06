// app/api/chat/[chatId]/save-partial/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import ChatModel from '@/models/Chat';
import UserModel from '@/models/User';
import { Types } from 'mongoose';

interface RouteParams {
  params: Promise<{
    chatId: string;
  }>;
}

// POST: Save partial response when user stops streaming
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

    // Parse body safely (handle empty body gracefully)
    let body: any = null;
    try {
      body = await request.json();
    } catch (e) {
      console.warn('save-partial: empty or invalid JSON body');
      return new Response('Invalid or empty body', { status: 400 });
    }

    const content = body?.content;
    const mode = body?.mode;

    if (!content || typeof content !== 'string') {
      return new Response('Content is required', { status: 400 });
    }

    await dbConnect();

    const chat = await ChatModel.findById(chatId);
    if (!chat || !chat.isActive) {
      return new Response('Chat not found', { status: 404 });
    }

    // Verify ownership: ensure the session user owns the chat
    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) return new Response('User not found', { status: 404 });
    if (chat.userId.toString() !== (user._id as Types.ObjectId).toString()) {
      return new Response('Unauthorized', { status: 403 });
    }

    // Add partial assistant message to chat
    const assistantMessageId = new Types.ObjectId().toString();
    chat.messages.push({
      id: assistantMessageId,
      role: 'assistant',
      content: content,
      timestamp: new Date(),
      mode: mode as 'detection' | 'advisor',
      // Mark as partial/incomplete (so UI can show it as a saved partial)
      queryType: 'conversation'
    });

    await chat.save();

    return Response.json({ 
      success: true,
      messageId: assistantMessageId 
    });

  } catch (error) {
    console.error('Error saving partial response:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
