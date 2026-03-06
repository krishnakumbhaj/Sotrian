import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/dbConnect';
import ChatModel from '@/models/Chat';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function DELETE(
  request: Request,
  context: unknown
) {
  const { params } = context as { params: { chatId: string } };
  const { chatId } = params;

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Find the chat and verify ownership
    const chat = await ChatModel.findById(chatId);

    if (!chat) {
      return Response.json(
        { success: false, error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this chat
    const chatDoc = chat as unknown as { userEmail: string };
    if (chatDoc.userEmail !== session.user.email) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Find the last message
    if (chat.messages.length === 0) {
      return Response.json(
        { success: true, message: 'No messages to delete' },
        { status: 200 }
      );
    }

    const lastMessage = chat.messages[chat.messages.length - 1];

    // Only delete if the last message is from assistant
    if (lastMessage.role === 'assistant') {
      chat.messages.pop();
      chat.updatedAt = new Date();
      await chat.save();

      return Response.json(
        { success: true, message: 'Last assistant message deleted' },
        { status: 200 }
      );
    }

    return Response.json(
      { success: true, message: 'Last message is not from assistant' },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error deleting last assistant message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
