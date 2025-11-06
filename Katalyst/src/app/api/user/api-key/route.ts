// app/api/user/api-key/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import { encryptApiKey, decryptApiKey } from '@/lib/encryption';

// GET: Check if user has API key configured
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      hasApiKey: !!user.googleApiKey,
      // Return masked version for display
      maskedKey: user.googleApiKey 
        ? `${decryptApiKey(user.googleApiKey).substring(0, 8)}...${decryptApiKey(user.googleApiKey).slice(-4)}`
        : null
    });

  } catch (error) {
    console.error('Error checking API key:', error);
    return NextResponse.json({ 
      error: 'Failed to check API key', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Save/Update user's Google API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKey } = await request.json();

    // Validate API key format (basic validation)
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 20) {
      return NextResponse.json({ 
        error: 'Invalid API key format. Google API keys are typically 39 characters long.' 
      }, { status: 400 });
    }

    // Basic format check for Google API key
    if (!apiKey.startsWith('AIza')) {
      return NextResponse.json({ 
        error: 'Invalid Google API key format. Keys should start with "AIza".' 
      }, { status: 400 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Encrypt and save API key
    user.googleApiKey = encryptApiKey(apiKey);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'API key saved successfully',
      maskedKey: `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`
    });

  } catch (error) {
    console.error('Error saving API key:', error);
    return NextResponse.json({ 
      error: 'Failed to save API key', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: Remove user's Google API key
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await UserModel.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.googleApiKey = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'API key removed successfully'
    });

  } catch (error) {
    console.error('Error removing API key:', error);
    return NextResponse.json({ 
      error: 'Failed to remove API key', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
