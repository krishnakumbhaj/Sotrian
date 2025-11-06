// app/api/chat/[chatId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import ChatModel from '@/models/Chat';
import UserModel from '@/models/User';
import { Types } from 'mongoose';
import { decryptApiKey } from '@/lib/encryption';

interface RouteParams {
  params: Promise<{
    chatId: string;
  }>;
}

// GET: Fetch specific chat with all messages
export async function GET(_: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;

    if (!Types.ObjectId.isValid(chatId)) {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chat = await ChatModel.findOne({
      _id: chatId,
      userId: user._id,
      isActive: true
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      chat: {
        id: chat._id.toString(),
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messages: chat.messages
      }
    });

  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch chat', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Add message to existing chat and get fraud detection result
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;

    if (!Types.ObjectId.isValid(chatId)) {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }

    const { message } = await request.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.googleApiKey) {
      return NextResponse.json({ 
        error: 'Google API key not configured. Please add your API key in settings.' 
      }, { status: 400 });
    }

    const chat = await ChatModel.findById(chatId);
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (!chat.userId.equals(user._id as Types.ObjectId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Add user message
    const userMessageId = new Types.ObjectId().toString();
    chat.messages.push({
      id: userMessageId,
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Call FastAPI for fraud detection with streaming
    const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
    
    try {
      // First, call the regular endpoint to get the result (we'll stream it on frontend)
      const fraudDetectionResponse = await fetch(`${FASTAPI_URL}/api/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          google_api_key: decryptApiKey(user.googleApiKey),
          user_info: {
            username: user.username,
            email: user.email,
            user_id: (user._id as Types.ObjectId).toString()
          },
          session_id: chatId,
          stream: false // Get full result for now
        })
      });

      if (!fraudDetectionResponse.ok) {
        throw new Error(`FastAPI error: ${fraudDetectionResponse.statusText}`);
      }

      const fraudResult = await fraudDetectionResponse.json();

      // Determine if this is a conversational response
      const conversationalTypes = ['conversation', 'greeting', 'capability', 'off_topic', 'garbage', 'ambiguous'];
      const isConversational = conversationalTypes.includes(fraudResult.result.fraud_type);

      // Format assistant response
      let assistantContent = '';
      let queryType: 'fraud_detection' | 'greeting' | 'capability' | 'invalid' | 'off_topic' | 'garbage' | 'conversation';
      
      if (isConversational) {
        // For conversational queries, use the recommendation as response
        assistantContent = fraudResult.result.recommendation;
        
        // Map fraud_type to queryType
        if (fraudResult.result.fraud_type === 'greeting') {
          queryType = 'greeting';
        } else if (fraudResult.result.fraud_type === 'capability') {
          queryType = 'capability';
        } else if (fraudResult.result.fraud_type === 'off_topic') {
          queryType = 'off_topic';
        } else if (fraudResult.result.fraud_type === 'garbage') {
          queryType = 'garbage';
        } else {
          queryType = 'conversation';
        }
      } else {
        // For fraud detection queries, use the formatted message from the backend
        queryType = 'fraud_detection';
        
        // Use the formatted message if available, otherwise create one
        if (fraudResult.result.formatted_message) {
          assistantContent = fraudResult.result.formatted_message;
        } else {
          // Fallback formatting (in case backend doesn't have formatted_message)
          const isFraud = fraudResult.result.is_fraud;
          const confidence = (fraudResult.result.confidence * 100).toFixed(1);
          const riskLevel = fraudResult.result.risk_level;
          
          assistantContent = `# Fraud Detection Result\n\n`;
          assistantContent += `## ${isFraud ? '🚨 FRAUD DETECTED' : '✅ APPEARS SAFE'}\n\n`;
          assistantContent += `**Type:** ${fraudResult.result.fraud_type.replace('_', ' ').toUpperCase()}\n`;
          assistantContent += `**Confidence:** ${confidence}%\n`;
          assistantContent += `**Risk Level:** ${riskLevel}\n`;
          assistantContent += `**Method:** ${fraudResult.result.detection_method}\n\n`;
          assistantContent += `---\n\n### 🧠 Analysis\n\n${fraudResult.result.reasoning}\n\n`;
          assistantContent += `---\n\n${fraudResult.result.recommendation}`;
          
          // Show red flags if present
          if (fraudResult.result.details?.red_flags && fraudResult.result.details.red_flags.length > 0) {
            assistantContent += `\n\n### 🚩 Red Flags Identified\n\n`;
            fraudResult.result.details.red_flags.forEach((flag: string) => {
              assistantContent += `- ${flag}\n`;
            });
          }
        }
      }

      // Sanitize assistant content to remove the detection method line (do not show method in UI)
      assistantContent = assistantContent
        .split('\n')
        .filter((line) => {
          const lower = line.toLowerCase();
          // remove lines like "**Method:** ML_MODEL" or "Method: ML_MODEL" or "Detection Method: ..."
          return !(
            lower.includes('**method:**') ||
            lower.startsWith('method:') ||
            lower.includes('detection method')
          );
        })
        .join('\n');

      // Add assistant response with fraud detection data
      const assistantMessageId = new Types.ObjectId().toString();
      chat.messages.push({
        id: assistantMessageId,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        fraudDetectionResult: fraudResult.result,
        processingTimeMs: fraudResult.processing_time_ms,
        queryType: queryType,
        fraudType: ['credit_card', 'email_spam', 'url_fraud', 'upi_fraud'].includes(fraudResult.result.fraud_type) 
                   ? fraudResult.result.fraud_type as 'credit_card' | 'email_spam' | 'url_fraud' | 'upi_fraud'
                   : undefined
      });

      // Update chat title if it's the first real message
      if (chat.messages.length === 2 && (chat.title === 'New Fraud Detection Chat' || chat.title === 'New Database Query' || chat.title === 'New Chat')) {
        chat.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      }

      await chat.save();

      // Get the assistant message we just added
      const assistantMessage = chat.messages[chat.messages.length - 1];

      return NextResponse.json({
        success: true,
        messageId: assistantMessageId,
        assistantMessage: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          timestamp: assistantMessage.timestamp.toISOString(),
          fraudDetectionResult: assistantMessage.fraudDetectionResult,
          processingTimeMs: assistantMessage.processingTimeMs,
          queryType: assistantMessage.queryType,
          fraudType: assistantMessage.fraudType
        },
        fraudResult: fraudResult.result,
        processingTimeMs: fraudResult.processing_time_ms,
        chat: {
          id: chat._id.toString(),
          title: chat.title,
          updatedAt: chat.updatedAt,
          messageCount: chat.messages.length
        }
      });

    } catch (fastapiError) {
      console.error('FastAPI call failed:', fastapiError);
      
      // Add error message to chat
      const errorMessageId = new Types.ObjectId().toString();
      chat.messages.push({
        id: errorMessageId,
        role: 'assistant',
        content: '❌ Sorry, I encountered an error while processing your request. Please make sure the FastAPI server is running and your API key is valid.',
        timestamp: new Date()
      });
      
      await chat.save();
      
      return NextResponse.json({
        error: 'Fraud detection service unavailable',
        details: fastapiError instanceof Error ? fastapiError.message : 'Unknown error',
        chat: {
          id: chat._id.toString(),
          title: chat.title,
          updatedAt: chat.updatedAt,
          messageCount: chat.messages.length
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Error adding message to chat:', error);
    return NextResponse.json({ 
      error: 'Failed to add message', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT: Update chat title
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const { title } = await request.json();

    if (!Types.ObjectId.isValid(chatId)) {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chat = await ChatModel.findOneAndUpdate(
      { _id: chatId, userId: user._id, isActive: true },
      { title: title.trim() },
      { new: true }
    );

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      chat: {
        id: chat._id.toString(),
        title: chat.title,
        updatedAt: chat.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating chat title:', error);
    return NextResponse.json({ 
      error: 'Failed to update chat title', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: Delete specific chat
export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;

    if (!Types.ObjectId.isValid(chatId)) {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chat = await ChatModel.findOneAndUpdate(
      { _id: chatId, userId: user._id },
      { isActive: false },
      { new: true }
    );

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ 
      error: 'Failed to delete chat', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 