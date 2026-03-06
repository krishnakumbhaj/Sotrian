// app/api/chat/[chatId]/stream/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import ChatModel, { FraudDetectionResult, Message } from '@/models/Chat';
import UserModel from '@/models/User';
import { Types } from 'mongoose';
import { decryptApiKey } from '@/lib/encryption';

interface RouteParams {
  params: Promise<{
    chatId: string;
  }>;
}

interface AdvisorResult {
  query_category?: string;
  greeting?: string;
  analysis?: string;
  recommendations?: string[];
  conclusion?: string;
}

// POST: Stream fraud detection response
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

  const body = await request.json();
  const message = body?.message;
  const mode = body?.mode ?? 'detection';
  const image = body?.image;
  const incomingUserMessageId = body?.userMessageId;
    
    // 🔍 ENHANCED DEBUG LOGGING
    console.log('\n' + '='.repeat(80));
    console.log('📨 NEXT.JS API ROUTE - /api/chat/[chatId]/stream');
    console.log(`  📝 Message: "${message?.substring(0, 50) || 'None'}${message?.length > 50 ? '...' : ''}"`);
    console.log(`  🖼️  Image Present: ${!!image}`);
    console.log(`  📏 Image Length: ${image?.length || 0} bytes`);
    console.log(`  🎯 Mode: ${mode}`);
    console.log(`  👤 User: ${session.user?.email}`);
    if (image) {
      console.log(`  🔍 Image starts with: ${image.substring(0, 50)}...`);
    }
    console.log('='.repeat(80) + '\n');

    if ((!message || message.trim().length === 0) && !image) {
      return new Response('Message or image is required', { status: 400 });
    }

    if (mode !== 'detection' && mode !== 'advisor') {
      return new Response('Invalid mode', { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    if (!user.googleApiKey) {
      return new Response('Google API key not configured', { status: 400 });
    }

    // Ensure we have a string user id (user._id may be typed as unknown)
    const userDoc = user as { _id: Types.ObjectId | string };
    const userIdStr = (userDoc._id instanceof Types.ObjectId)
      ? userDoc._id.toString()
      : String(userDoc._id);

    const chat = await ChatModel.findById(chatId);
    if (!chat || chat.userId.toString() !== userIdStr || !chat.isActive) {
      return new Response('Chat not found', { status: 404 });
    }

    // Add user message to chat if it doesn't already exist (frontend may have pre-created it)
    const userMessageId = incomingUserMessageId || new Types.ObjectId().toString();
    const exists = chat.messages.some((m: Message) => m.id === userMessageId);
    if (!exists) {
      chat.messages.push({
        id: userMessageId,
        role: 'user',
        content: message,
        timestamp: new Date(),
        mode: mode as 'detection' | 'advisor',
        image: image
      });
      await chat.save();
    } else {
      // If already exists, no need to save again
      console.log('User message already exists in chat, skipping push:', userMessageId);
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
    console.log(`🔗 Using FASTAPI_URL: ${FASTAPI_URL}`);

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        
        // Helper to safely enqueue data
        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(data);
            } catch (error: unknown) {
              // Ignore expected controller-closed race condition to avoid noisy logs
              const msg = error instanceof Error ? error.message : '';
              if (!msg.includes('Controller is already closed') && !msg.includes('Cannot enqueue')) {
                console.error('Error enqueueing data:', error);
              } else {
                // debug-level log for controller closed
                console.debug('Ignored enqueue error (controller closed):', msg);
              }
              isClosed = true;
            }
          }
        };
        
        // Helper to safely close controller
        const safeClose = () => {
          if (!isClosed) {
            // mark closed immediately to prevent races
            isClosed = true;
            try {
              controller.close();
            } catch (error: unknown) {
              const msg = error instanceof Error ? error.message : '';
              if (!msg.includes('Controller is already closed')) {
                console.error('Error closing controller:', error);
              } else {
                console.debug('Ignored close error (controller already closed)');
              }
            }
          }
        };
        
        try {
          // Choose endpoint based on mode
          const endpoint = mode === 'advisor' 
            ? `${FASTAPI_URL}/api/advisor/stream`
            : `${FASTAPI_URL}/api/detect/stream`;

          // Prepare request body for FastAPI
          const fastApiBody = {
            query: message,
            google_api_key: decryptApiKey(user.googleApiKey!),
            user_info: {
              username: user.username,
              email: user.email,
              user_id: (user._id as Types.ObjectId).toString()
            },
            session_id: chatId,
            stream: true,
            image: image
          };
          
          // 🔍 DEBUG - Log what we're sending to FastAPI
          console.log('📤 SENDING TO FASTAPI:', endpoint);
          console.log(`  🖼️  Image in body: ${!!fastApiBody.image}`);
          console.log(`  📏 Image size: ${fastApiBody.image?.length || 0} bytes`);
          
          // Call FastAPI streaming endpoint
          let response: Response;
          try {
            response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(fastApiBody),
              signal: AbortSignal.timeout(120_000), // 120s timeout for long LLM responses
            });
          } catch (fetchError: unknown) {
            const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
            if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
              throw new Error(
                `Cannot reach FastAPI server at ${endpoint}. ` +
                `Make sure FASTAPI_URL is set to your deployed backend URL (current: ${FASTAPI_URL}). ` +
                `Original error: ${msg}`
              );
            }
            throw fetchError;
          }

          if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            throw new Error(`FastAPI error ${response.status}: ${response.statusText}. Body: ${errorBody.substring(0, 200)}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No response body');
          }

          let accumulatedContent = '';
          let finalResult: FraudDetectionResult | AdvisorResult | null = null;

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                try {
                  const parsed = JSON.parse(data);
                  
                  // sanitize function to strip any 'Method' / 'Detection Method' lines
                  const sanitizeText = (text: string) => {
                    if (!text) return text;
                    // remove markdown bold Method line, plain Method:, and Detection Method lines
                    return text
                      .replace(/\*\*method:\*\*[\s\S]*?(?:\r?\n){1,2}/gi, '')
                      .replace(/^method:.*(?:\r?\n)?/gim, '')
                      .replace(/detection method:.*(?:\r?\n)?/gi, '');
                  };

                  if (parsed.type === 'content') {
                    const sanitized = sanitizeText(parsed.content ?? '');
                    accumulatedContent += sanitized;
                    // Send sanitized chunk to client
                    const out = { ...parsed, content: sanitized };
                    safeEnqueue(
                      encoder.encode(`data: ${JSON.stringify(out)}\n\n`)
                    );
                  } else if (parsed.type === 'complete') {
                    finalResult = parsed.result;
                    // Send completion signal but strip detection_method from the result sent to clients
                    const out = { ...parsed, result: parsed.result ? { ...parsed.result } : parsed.result };
                    if (out.result && Object.prototype.hasOwnProperty.call(out.result, 'detection_method')) {
                      try { delete out.result.detection_method; } catch { }
                    }
                    safeEnqueue(
                      encoder.encode(`data: ${JSON.stringify(out)}\n\n`)
                    );
                  } else if (parsed.type === 'error') {
                    safeEnqueue(
                      encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`)
                    );
                  }
                } catch (e) {
                  // Skip invalid JSON
                  console.error('Failed to parse SSE data:', e);
                }
              }
            }
          }

          // Save assistant message to database
          if (finalResult && accumulatedContent) {
            // Remove any detection method line from the streamed content so UI doesn't display it
            accumulatedContent = accumulatedContent
              .split('\n')
              .filter((line) => {
                const lower = line.toLowerCase();
                return !(
                  lower.includes('**method:**') ||
                  lower.startsWith('method:') ||
                  lower.includes('detection method')
                );
              })
              .join('\n');
            const assistantMessageId = new Types.ObjectId().toString();
            
            if (mode === 'advisor') {
              // Advisor mode message
              const advisorResult = finalResult as AdvisorResult;
              chat.messages.push({
                id: assistantMessageId,
                role: 'assistant',
                content: accumulatedContent,
                timestamp: new Date(),
                mode: 'advisor',
                advisorResult: {
                  query_category: advisorResult.query_category,
                  greeting: advisorResult.greeting,
                  analysis: advisorResult.analysis,
                  recommendations: advisorResult.recommendations,
                  conclusion: advisorResult.conclusion
                }
              });
            } else {
              // Detection mode message
              const fraudResult = finalResult as FraudDetectionResult;
              const conversationalTypes = ['conversation', 'greeting', 'capability', 'off_topic', 'garbage', 'ambiguous'];
              const isConversational = conversationalTypes.includes(fraudResult.fraud_type);
              
              let queryType: 'fraud_detection' | 'greeting' | 'capability' | 'invalid' | 'off_topic' | 'garbage' | 'conversation';
              
              if (isConversational) {
                if (fraudResult.fraud_type === 'greeting') queryType = 'greeting';
                else if (fraudResult.fraud_type === 'capability') queryType = 'capability';
                else if (fraudResult.fraud_type === 'off_topic') queryType = 'off_topic';
                else if (fraudResult.fraud_type === 'garbage') queryType = 'garbage';
                else queryType = 'conversation';
              } else {
                queryType = 'fraud_detection';
              }

              chat.messages.push({
                id: assistantMessageId,
                role: 'assistant',
                content: accumulatedContent,
                timestamp: new Date(),
                mode: 'detection',
                fraudDetectionResult: fraudResult,
                queryType: queryType,
                fraudType: ['credit_card', 'email_spam', 'url_fraud', 'upi_fraud', 'qr_fraud'].includes(fraudResult.fraud_type) 
                           ? fraudResult.fraud_type as 'credit_card' | 'email_spam' | 'url_fraud' | 'upi_fraud' | 'qr_fraud'
                           : undefined
              });
            }

            // Update chat title if it's the first message
            if (chat.messages.length === 2 && (chat.title === 'New Fraud Detection Chat' || chat.title === 'New Chat')) {
              chat.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
            }

            await chat.save();
          }

          safeClose();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          safeEnqueue(
            encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
          );
          safeClose();
        }
      },
      cancel() {
        // Handle client disconnect/abort
        console.log('Stream cancelled by client');
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('Error in streaming endpoint:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
