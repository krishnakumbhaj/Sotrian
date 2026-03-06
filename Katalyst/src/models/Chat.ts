// models/Chat.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

// Fraud detection result interface (matches FastAPI response)
export interface FraudDetectionResult {
  fraud_type: 'credit_card' | 'email_spam' | 'url_fraud' | 'upi_fraud' | 'qr_fraud' | 'greeting' | 'capability_query' | 'invalid_query' | 'conversation' | 'capability' | 'off_topic' | 'garbage' | 'ambiguous';
  is_fraud: boolean;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'N/A';
  detection_method: 'ML_MODEL' | 'LLM_REASONING' | 'HYBRID' | 'QUERY_VALIDATOR' | 'GREETING_HANDLER' | 'CAPABILITY_HANDLER' | 'CONVERSATIONAL_AI' | 'FALLBACK' | 'ERROR';
  reasoning: string;
  recommendation: string;
  formatted_message?: string;
  details?: {
    input_data?: Record<string, unknown>;
    ml_prediction?: Record<string, unknown>;
    llm_analysis?: Record<string, unknown>;
    processing_steps?: string[];
    query_type?: string;
    red_flags?: string[];
    is_conversational?: boolean;
    original_query?: string;
    decoded_data?: string;
    contains_url?: boolean;
    error?: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  
  // Image attachment (base64 encoded)
  image?: string;
  
  // Mode: detection or advisor
  mode?: 'detection' | 'advisor';
  
  // Fraud detection specific fields
  fraudDetectionResult?: FraudDetectionResult;
  processingTimeMs?: number;
  
  // Query metadata
  queryType?: 'fraud_detection' | 'greeting' | 'capability' | 'invalid' | 'conversation' | 'off_topic' | 'garbage';
  fraudType?: 'credit_card' | 'email_spam' | 'url_fraud' | 'upi_fraud' | 'qr_fraud';
  
  // Advisor specific fields
  advisorResult?: {
    query_category?: string;
    greeting?: string;
    analysis?: string;
    recommendations?: string[];
    conclusion?: string;
  };
}

export interface Chat extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const MessageSchema = new Schema<Message>({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  
  // Image attachment
  image: { type: String },
  
  // Mode
  mode: { type: String, enum: ['detection', 'advisor'] },
  
  // Fraud detection specific fields
  fraudDetectionResult: {
    fraud_type: { 
      type: String, 
      enum: [
        'credit_card', 
        'email_spam', 
        'url_fraud', 
        'upi_fraud',
        'qr_fraud',
        'greeting', 
        'capability_query', 
        'invalid_query',
        'conversation',
        'capability',
        'off_topic',
        'garbage',
        'ambiguous'
      ]
    },
    is_fraud: { type: Boolean },
    confidence: { type: Number, min: 0, max: 1 },
    risk_level: { 
      type: String, 
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'N/A']
    },
    detection_method: { 
      type: String, 
      enum: [
        'ML_MODEL', 
        'LLM_REASONING', 
        'HYBRID', 
        'QUERY_VALIDATOR', 
        'GREETING_HANDLER', 
        'CAPABILITY_HANDLER',
        'CONVERSATIONAL_AI',
        'FALLBACK',
        'ERROR'
      ]
    },
    reasoning: { type: String },
    recommendation: { type: String },
    details: { type: Schema.Types.Mixed }
  },
  processingTimeMs: { type: Number },
  queryType: { 
    type: String, 
    enum: [
      'fraud_detection', 
      'greeting', 
      'capability', 
      'invalid',
      'conversation',
      'off_topic',
      'garbage'
    ]
  },
  fraudType: { 
    type: String, 
    enum: ['credit_card', 'email_spam', 'url_fraud', 'upi_fraud', 'qr_fraud']
  },
  
  // Advisor specific fields
  advisorResult: {
    query_category: { type: String },
    greeting: { type: String },
    analysis: { type: String },
    recommendations: [{ type: String }],
    conclusion: { type: String }
  }
});

const ChatSchema = new Schema<Chat>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// Update timestamp on save
ChatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate title from first message if not provided
ChatSchema.pre('save', function(next) {
  if (!this.title && this.messages.length > 0) {
    const firstMessage = this.messages.find(msg => msg.role === 'user');
    if (firstMessage) {
      this.title = firstMessage.content.substring(0, 50) + (firstMessage.content.length > 50 ? '...' : '');
    }
  }
  next();
});

// CRITICAL: Delete existing model to force schema update
if (mongoose.models.Chat) {
  delete mongoose.models.Chat;
}

const ChatModel = mongoose.model<Chat>('Chat', ChatSchema);

export default ChatModel;