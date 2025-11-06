'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Shield, Loader2, Check, XCircle, 
  Plus, Trash, X, ChevronDown, Clock, 
  PanelLeftOpen, PanelLeftClose, User, LogOut, ChevronUp, Key, ArrowUp, Square, Brain,
  Edit2, RotateCcw, Sparkles, AlertCircle, Copy, ImagePlus, Share
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';
import Logo from '@/app/images/chat-logo.png';
import Logo_name from '@/app/images/Chat-logo-name.png';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
// Fraud Detection Result Interface
interface FraudDetectionResult {
  fraud_type: 'credit_card' | 'email_spam' | 'url_fraud' | 'upi_fraud' | 'greeting' | 'capability_query' | 'invalid_query';
  is_fraud: boolean;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'N/A';
  // detection_method: 'ML_MODEL' | 'LLM_REASONING' | 'HYBRID' | 'QUERY_VALIDATOR' | 'GREETING_HANDLER' | 'CAPABILITY_HANDLER';
  reasoning: string;
  recommendation: string;
  details?: {
    input_data?: Record<string, unknown>;
    ml_prediction?: Record<string, unknown>;
    llm_analysis?: Record<string, unknown>;
    processing_steps?: string[];
    query_type?: string;
  };
}

interface Message {
  id: string;
  role: 'user'  | 'assistant';
  content: string;
  timestamp: string;
  image?: string;
  mode?: 'detection' | 'advisor';
  isStreaming?: boolean;
  fraudDetectionResult?: FraudDetectionResult;
  processingTimeMs?: number;
  queryType?: 'fraud_detection' | 'greeting' | 'capability' | 'invalid';
  fraudType?: 'credit_card' | 'email_spam' | 'url_fraud' | 'upi_fraud' | 'qr_fraud';
  advisorResult?: {
    query_category?: string;
    greeting?: string;
    analysis?: string;
    recommendations?: string[];
    conclusion?: string;
  };
}

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

interface ApiKeyStatus {
  hasApiKey: boolean;
  maskedKey?: string | null;
}

export default function ChatInterface() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  
  // Chat Management State
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);
  
  // User Profile Dropdown State
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  // Header overflow menu state (three-dot menu)
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // API Key State (replaces DB connection)
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({
    hasApiKey: false,
    maskedKey: null
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');

  // File upload state
  const [files, setFiles] = useState<File[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Advisor mode state
  const [isAdvisorMode, setIsAdvisorMode] = useState(false);

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<'Orion-1' | 'Orion-Pax'>('Orion-1');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Edit/Reload state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');

  // Delete confirmation state
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Abort controller for stopping requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // State to track if user has started typing/querying (for immediate UI transition)
  const [hasStartedChat, setHasStartedChat] = useState(false);
  // Derived current chat for header/title display
  const currentChat = chats.find(c => c.id === currentChatId) || null;
  
  // Processing animation states (for future ChainOfThought UI)
  // const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  // const [processingOpacity, setProcessingOpacity] = useState(1);
  
  // Array of processing messages
  // const processingMessages = [
  //   "Analyzing your query...",
  //   "Detecting fraud patterns...", 
  //   "Checking ML models...",
  //   "Running LLM analysis...",
  //   "Processing fraud indicators...",
  //   "Evaluating risk level...",
  //   "Almost ready...",
  //   "Finalizing detection..."
  // ];

  // AI Advisor suggestion list (shown on empty chat, desktop only)
  const advisorSuggestions = [
    'How can I reduce false positives in fraud detection?',
    'Best steps to secure credit card data?',
    'Explain risk levels and mitigation strategies',
    'Show me sample rules for URL fraud detection',
  ];
  
  // Determine if chat is empty (for dynamic input positioning)
  const isChatEmpty = messages.length === 0 && !hasStartedChat;

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      
      // Small delay to ensure DOM is updated, then scroll to bottom with margin
      setTimeout(() => {
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const bottomMargin = 100; // pixels of space from bottom
        
        // Always scroll to bottom with margin when new messages are added
        container.scrollTop = scrollHeight - clientHeight + bottomMargin;
      }, 100);
    }
  }, [messages]);

  // Processing animation effect (commented out - for future ChainOfThought UI)
  // useEffect(() => {
  //   let intervalId: NodeJS.Timeout;
  //   let opacityIntervalId: NodeJS.Timeout;

  //   if (isLoading) {
  //     // Rotate through processing messages every 2 seconds
  //     intervalId = setInterval(() => {
  //       setProcessingMessageIndex(prev => 
  //         (prev + 1) % processingMessages.length
  //       );
  //     }, 2000);

  //     // Animate opacity every 1 second (faster for smooth pulsing effect)
  //     opacityIntervalId = setInterval(() => {
  //       setProcessingOpacity(prev => prev === 1 ? 0.4 : 1);
  //     }, 1000);
  //   } else {
  //     // Reset when not loading
  //     setProcessingMessageIndex(0);
  //     setProcessingOpacity(1);
  //   }

  //   return () => {
  //     if (intervalId) clearInterval(intervalId);
  //     if (opacityIntervalId) clearInterval(opacityIntervalId);
  //   };
  // }, [isLoading, processingMessages.length]);

  // Load all chats for sidebar - returns the chats array
  const loadChats = useCallback(async () => {
    try {
      const response = await fetch('/api/chat');
      if (response.ok) {
        const { success, chats } = await response.json();
        if (success) {
          setChats(chats);
          return chats;
        }
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
    return [] as Chat[];
  }, []);

  // Load chats and check API key on mount. Handle tab vs reload behavior using sessionStorage.
  useEffect(() => {
    if (session?.user?.email) {
      (async () => {
        const fetchedChats = await loadChats();
        await checkApiKeyStatus();

        const stored = typeof window !== 'undefined' ? sessionStorage.getItem('sotrian_current_chat') : null;
        if (stored && fetchedChats.some((c: Chat) => c.id === stored)) {
          // If this tab had an active chat, restore it (reload case)
          setCurrentChatId(stored);
        } else {
          // New tab: if there is an existing empty chat, open it; otherwise create a new chat
          const empty = fetchedChats.find((c: Chat) => !c.messageCount || c.messageCount === 0 || !c.lastMessage);
          if (empty) {
            setCurrentChatId(empty.id);
          } else {
            // create a new empty chat for this tab
            await createNewChat();
          }
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Persist current chat selection to sessionStorage so reload keeps the same chat in the same tab
  useEffect(() => {
    if (typeof window !== 'undefined' && currentChatId) {
      sessionStorage.setItem('sotrian_current_chat', currentChatId);
    }
  }, [currentChatId]);

  // Load chat history when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      loadChatMessages(currentChatId);
    }
  }, [currentChatId]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || isMobile) return;
      
      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isMobile]);

  // Load messages for specific chat
  const loadChatMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`);
      if (response.ok) {
        const { success, chat } = await response.json();
        if (success && chat.messages) {
          setMessages(chat.messages);
          // Reset hasStartedChat when loading existing chat with messages
          if (chat.messages.length > 0) {
            setHasStartedChat(true);
          } else {
            setHasStartedChat(false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  };

  // Create new chat. If an empty chat already exists, return it instead of creating a duplicate.
  const createNewChat = async (firstMessage?: string) => {
    try {
      // ensure we have latest chats
      const fetched = await loadChats();

      const empty = fetched.find((c: Chat) => !c.messageCount || c.messageCount === 0 || !c.lastMessage);
      if (empty) {
        setCurrentChatId(empty.id);
        setMessages([]);
        setHasStartedChat(false);
        if (isMobile) setIsSidebarOpen(false);
        return empty.id;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: firstMessage ? 
            firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '') : 
            'New Fraud Detection Chat',
          firstMessage
        })
      });

      if (response.ok) {
        const { success, chat } = await response.json();
        if (success) {
          await loadChats(); // Refresh sidebar
          setCurrentChatId(chat.id);
          setMessages(chat.messages || []);
          // Reset hasStartedChat for new empty chat
          setHasStartedChat(false);
          // Close sidebar on mobile after creating chat
          if (isMobile) {
            setIsSidebarOpen(false);
          }
          return chat.id;
        }
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
    return null;
  };

  // Check if user has API key configured
  const checkApiKeyStatus = async () => {
    try {
      setApiKeyError('');
      const response = await fetch('/api/user/api-key');
      
      if (response.ok) {
        const data = await response.json();
        setApiKeyStatus({
          hasApiKey: data.hasApiKey,
          maskedKey: data.maskedKey
        });
      } else {
        throw new Error('Failed to check API key');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setApiKeyError(`Cannot check API key: ${errorMessage}`);
      setApiKeyStatus({
        hasApiKey: false,
        maskedKey: null
      });
    }
  };

  // Save API key
  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyError('Please enter an API key');
      return;
    }

    if (!apiKeyInput.startsWith('AIza')) {
      setApiKeyError('Invalid API key format. Google API keys start with "AIza"');
      return;
    }

    setIsLoading(true);
    setApiKeyError('');
    
    try {
      const response = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeyStatus({
          hasApiKey: true,
          maskedKey: data.maskedKey
        });
        setShowApiKeyModal(false);
        setApiKeyInput('');
        addSystemMessage(`✅ API key saved successfully!`);
      } else {
        const error = await response.json();
        setApiKeyError(error.error || 'Failed to save API key');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setApiKeyError(`Cannot save API key: ${errorMessage}`);
    }
    setIsLoading(false);
  };

  // Delete API key
  const deleteApiKey = async () => {
    if (!confirm('Are you sure you want to delete your API key?')) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/user/api-key', {
        method: 'DELETE'
      });

      if (response.ok) {
        setApiKeyStatus({
          hasApiKey: false,
          maskedKey: null
        });
        addSystemMessage('🗑️ API key deleted');
      } else {
        throw new Error('Failed to delete API key');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addSystemMessage(`❌ Delete failed: ${errorMessage}`, true);
    }
    setIsLoading(false);
  };

  // Handle file upload - convert to base64 for QR code detection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      
      // Only accept images
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file for QR code detection",
          variant: "destructive"
        });
        return;
      }
      
      // Limit file size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setFiles([file]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (uploadInputRef?.current) {
      uploadInputRef.current.value = "";
    }
  };
  
  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Stop/Abort current request
  const stopRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  // Execute fraud detection query through NextJS API
  const executeQuery = async (query: string, isRetry: boolean = false) => {
    if ((!query.trim() && files.length === 0) || isLoading || !session?.user?.email) return;

    // Check if API key is configured
    if (!apiKeyStatus.hasApiKey) {
      addSystemMessage('❌ Please configure your Google API key first', true);
      setShowApiKeyModal(true);
      return;
    }

    // Immediately set hasStartedChat to true to trigger layout change
    setHasStartedChat(true);

    // Convert file to base64 if present
    let imageBase64: string | undefined;
    if (files.length > 0) {
      try {
        imageBase64 = await fileToBase64(files[0]);
        
        // 🔍 ENHANCED DEBUG - Check the base64 conversion
        console.log('\n' + '='.repeat(80));
        console.log('🖼️  FRONTEND - FILE TO BASE64 CONVERSION');
        console.log(`  📁 File name: ${files[0].name}`);
        console.log(`  📏 File size: ${files[0].size} bytes`);
        console.log(`  📝 File type: ${files[0].type}`);
        console.log(`  ✅ Base64 length: ${imageBase64.length} characters`);
        console.log(`  🔍 Base64 starts with: ${imageBase64.substring(0, 50)}...`);
        console.log('='.repeat(80) + '\n');
        
      } catch (error) {
        console.error('❌ Error converting file to base64:', error);
        toast({
          title: "Error reading image",
          description: "Failed to process the uploaded image",
          variant: "destructive"
        });
        return;
      }
    }

    // If not a retry, add user message immediately to the UI
    if (!isRetry) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: query.trim() || (files.length > 0 ? "Analyze this QR code for fraud" : ""),
        timestamp: new Date().toISOString(),
        mode: isAdvisorMode ? 'advisor' : 'detection',
        image: imageBase64
      };
      setMessages(prev => [...prev, userMessage]);
      
      // 🔍 DEBUG - Check what we're sending
      console.log('\n' + '='.repeat(80));
      console.log('📤 FRONTEND - SENDING TO API');
      console.log(`  📝 Query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
      console.log(`  🖼️  Has Image: ${!!imageBase64}`);
      console.log(`  📏 Image Size: ${imageBase64?.length || 0} chars`);
      console.log('='.repeat(80) + '\n');
    }

    let chatId = currentChatId;
    
    // Create new chat if none exists
    if (!chatId) {
      chatId = await createNewChat(query);
      if (!chatId) {
        addSystemMessage('❌ Failed to create chat', true);
        return;
      }
    }

    setIsLoading(true);
    setCurrentQuery('');
    
    // Clear files immediately after submission starts
    setFiles([]);
    if (uploadInputRef?.current) {
      uploadInputRef.current.value = "";
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Debug log for QR image
      if (imageBase64) {
        console.log('📸 Sending QR code image to backend', {
          hasImage: true,
          imageLength: imageBase64.length
        });
      }
      
      // Use streaming endpoint
      const response = await fetch(`/api/chat/${chatId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: query.trim() || (files.length > 0 ? "Analyze this QR code for fraud" : ""),
          mode: isAdvisorMode ? 'advisor' : 'detection',
          model: selectedModel,
          image: imageBase64
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      // Create assistant message placeholder
      const assistantMessageId = Date.now().toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
        mode: isAdvisorMode ? 'advisor' : 'detection'
      };

      // Add empty assistant message
      setMessages(prev => [...prev, assistantMessage]);

      let accumulatedContent = '';

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
              
              if (parsed.type === 'content') {
                // Append content chunk
                accumulatedContent += parsed.content;
                
                // Update the message in real-time
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ));
              } else if (parsed.type === 'complete') {
                // Final update with result (fraud detection or advisor)
                const updateData: Partial<Message> = {
                  content: accumulatedContent,
                  timestamp: new Date().toISOString()
                };
                
                if (isAdvisorMode) {
                  updateData.advisorResult = parsed.result;
                } else {
                  updateData.fraudDetectionResult = parsed.result;
                }
                // mark streaming finished
                updateData.isStreaming = false;

                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, ...updateData }
                    : msg
                ));
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // Refresh sidebar to show updated chat info
      loadChats();

    } catch (error: unknown) {
      // Check if error is due to abort
      const err = error as { name?: string };
      if (err.name === 'AbortError') {
        console.log('Request was aborted by user');
        // Remove the incomplete assistant message
        setMessages(prev => prev.slice(0, -1));
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Add error message (user message already added)
        const errorMsg = {
          id: Date.now().toString(),
          role: 'assistant' as const,
          content: `❌ Query failed: ${errorMessage}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
        console.error('Fetch error:', error);
      }
    } finally {
      setIsLoading(false);
      setFiles([]); // Clear files after query
      // Clear file input
      if (uploadInputRef?.current) {
        uploadInputRef.current.value = "";
      }
      abortControllerRef.current = null;
    }
  };

  // Handle submit from PromptInput
  const handleSubmit = () => {
    if (currentQuery.trim() || files.length > 0) {
      executeQuery(currentQuery);
    }
  };

  // Delete last assistant message (for reload/edit scenarios)
  const deleteLastAssistantMessage = async () => {
    // Remove from UI first
    setMessages(prev => {
      const lastIndex = prev.length - 1;
      if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
        return prev.slice(0, -1);
      }
      return prev;
    });

    // Also delete from database if chat exists
    if (currentChatId) {
      try {
        await fetch(`/api/chat/${currentChatId}/delete-last-assistant`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Failed to delete last assistant message:', error);
      }
    }
  };

  // Handle reload (retry last query)
  const handleReload = async (messageId: string) => {
    // Find the message to reload
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    
    // Delete any incomplete assistant response after this message
    if (messageIndex < messages.length - 1 && messages[messageIndex + 1].role === 'assistant') {
      await deleteLastAssistantMessage();
    }

    // Re-execute the query
    await executeQuery(message.content, true);
  };

  // Handle edit message
  const startEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditedContent(content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditedContent('');
  };

  const saveEdit = async (messageId: string) => {
    if (!editedContent.trim()) return;

    // Find the message index
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Update message in UI
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: editedContent.trim() }
        : msg
    ));

    // Delete any assistant response after this message
    if (messageIndex < messages.length - 1 && messages[messageIndex + 1].role === 'assistant') {
      await deleteLastAssistantMessage();
    }

    // Clear edit state
    setEditingMessageId(null);
    setEditedContent('');

    // Re-execute with edited content
    await executeQuery(editedContent.trim(), true);
  };

  // Show delete confirmation modal
  const confirmDeleteChat = (chatId: string) => {
    setChatToDelete(chatId);
    setShowDeleteModal(true);
  };

  // Delete chat (actual deletion after confirmation)
  const deleteChat = async () => {
    if (!chatToDelete) return;
    
    try {
      const response = await fetch(`/api/chat/${chatToDelete}`, { method: 'DELETE' });
      if (response.ok) {
        await loadChats();
        if (currentChatId === chatToDelete) {
          setCurrentChatId('');
          setMessages([]);
          // Reset hasStartedChat when clearing current chat
          setHasStartedChat(false);
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    } finally {
      setShowDeleteModal(false);
      setChatToDelete(null);
    }
  };

  // Handle logout
  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  // Handle sidebar toggle with mobile considerations
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar when selecting chat on mobile
  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    if (typeof window !== 'undefined') sessionStorage.setItem('sotrian_current_chat', chatId);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const addSystemMessage = (message: string, isError = false) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, systemMessage]);
    if (isError) console.error('Error:', message);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center text-teal-600 justify-center h-screen bg-[#1f1e1d]">
        <div className="text-center text-teal-600">
          {/* <ClimbingBoxLoader color=teal-600 /> */}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br">
        <div className="text-center p-8  rounded-2xl shadow-lg">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Enhanced Sidebar with Mobile Overlay */}
      <div 
        className={`${
          isMobile 
            ? `fixed inset-y-0 left-0 z-50 bg-[#1d1f1e] transition-transform duration-300 ease-in-out ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } w-80`
            : `bg-[#1f1e1d] flex flex-col relative transition-all duration-300 ease-in-out ${
                isSidebarOpen ? '' : 'items-center'
              }`
        } flex flex-col`}
        style={!isMobile ? { 
          width: isSidebarOpen ? `${sidebarWidth}px` : '60px',
          minWidth: isSidebarOpen ? '250px' : '60px'
        } : {}}
      >
        {/* Sidebar Header with Toggle Button */}
        <div className={`p-3 lg:p-2 bg-[#1f1e1d] mt-5 text-white transition-all duration-300 ${
          isSidebarOpen ? '' : 'px-1'
        }`}>
          <div className={`flex items-center mb-4 transition-all duration-300 ${
            isSidebarOpen ? 'justify-between' : 'justify-center flex-col gap-2'
          }`}>
            <div className={`flex items-center transition-all duration-300 ${
              isSidebarOpen ? 'gap-3' : 'flex-col gap-2'
            }`}>
              <Image 
                src={Logo} 
                alt="Logo" 
                width={45} 
                height={45} 
                className="rounded-full transition-all duration-300 logo-rotate" 
              />
              {isSidebarOpen && (
                <Image 
                  src={Logo_name} 
                  alt="Logo" 
                  width={85} 
                  height={65} 
                  className=" transition-opacity duration-300" 
                />
              )}
            </div>
            
            {/* Toggle button - always visible but repositioned */}
            <button
              onClick={toggleSidebar}
              className={`p-2 hover:text-teal-600 text-teal-600 rounded-xl transition-all duration-300 group ${
                isSidebarOpen ? '' : 'mt-2'
              }`}
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isMobile ? (
                <X className="w-6 h-6 text-white group-hover:text-teal-600 group-hover:scale-110 transition-all" />
              ) : isSidebarOpen ? (
                <PanelLeftClose className="w-6 h-6 text-white group-hover:text-teal-600 group-hover:scale-110 transition-all" />
              ) : (
                <PanelLeftOpen className="w-6 h-6 text-white group-hover:text-teal-600 group-hover:scale-110 transition-all" />
              )}
            </button>
          </div>

          <button
            onClick={() => createNewChat()}
            className={`flex items-center justify-center gap-2 w-10 h-10 bg-teal-600 hover:bg-teal-600 text-white rounded-full transition-all duration-200 font-medium  ${
              isSidebarOpen ? 'w-10' : 'w-10'
            }`}
            title={isSidebarOpen ? '' : 'New Chat'}
          >
            <Plus className="w-6 h-6 hover:scale-[1.1]" />
          </button>
        </div>
        
        {/* Chat List - Only show when sidebar is open */}
        {isSidebarOpen && (
          <div className="flex-1 bg-[#1f1e1d] overflow-y-auto scrollbar-hidden px-2 transition-all duration-300">
            <div className="space-y-1 bg-[#1f1e1d] py-3">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={`group p-3 mx-2 rounded-3xl cursor-pointer transition-all duration-200 ${
                    currentChatId === chat.id 
                      ? 'bg-[#30302e] border-l-4 border-l-teal-600 shadow-sm' 
                      : 'hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-white truncate mb-1">{chat.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-white">
                        {/* <MessageCircle className="w-3 h-3" /> */}
                        {/* <span>{chat.messageCount} messages</span> */}
                        <Clock className="w-3 h-3 ml-1" />
                        <span>{new Date(chat.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteChat(chat.id);
                      }}
                      className="ml-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 rounded"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {chats.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                
              </div>
            )}
          </div>
        )}

        {/* Collapsed state hint - Only show when collapsed and has chats */}
        {!isSidebarOpen && chats.length > 0 && !isMobile && (
          <div className="flex-1 bg-[#1f1e1d] flex flex-col items-center justify-center py-4">
            
          </div>
        )}

        {/* User Profile Section - Adapted for collapsed state */}
        <div className={`p-1 bg-[#1f1e1d] transition-all duration-300 ${
          isSidebarOpen ? '' : 'px-2'
        }`}>
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className={`w-full flex items-center gap-3 py-3 px-1.5 text-white hover:bg-[#30302e] rounded-lg transition-all duration-200 ${
                isSidebarOpen ? '' : 'justify-center flex-col gap-1'
              }`}
            >
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                {(session.user?.name || session.user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
              </div>
              
              {isSidebarOpen && (
                <>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white truncate">
                      {session.user?.name || session.user?.email?.split('@')[0]}
                    </p>
                  </div>
                  {isProfileDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </>
              )}
            </button>

            {/* Dropdown Menu - Only show when sidebar is open */}
            {isProfileDropdownOpen && isSidebarOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#30302e] rounded-lg shadow-lg overflow-hidden">
                {/* User Info Section */}
                <div className="p-3 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {session.user?.username || 'User'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                <button
                  onClick={() => {
                    setShowApiKeyModal(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  <Key className="w-4 h-4" />
                  API Key Settings
                </button>                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#ff9542] hover:text-red-300 hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle - Only show when sidebar is open and not mobile */}
        {isSidebarOpen && !isMobile && (
          <div
            className="absolute right-0 top-0 bottom-0 w-1 hover:bg-gray-300 cursor-col-resize transition-colors"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-[#262624] flex flex-col">
        {/* Mobile Header - logo opens sidebar (mobile only) */}
        {isMobile && (
          <div className="lg:hidden px-4 bg-[#262624] border-b border-gray-100 flex items-center justify-between">
            <button
              onClick={toggleSidebar}
              className="flex items-center gap-3 p-1 rounded-md"
              aria-label="Open sidebar"
            >
              {/* Slightly smaller images on mobile to avoid overflow while preserving alignment */}
              <Image src={Logo} alt="Logo" width={36} height={36} className="rounded-full" />
              <Image src={Logo_name} alt="Logo name" width={72} height={48} className="sm:block h-10 object-contain text-white" />
            </button>

            <div className="flex items-center gap-3">
              {/* Mobile API Key Status */}
              {/* <button
                onClick={() => setShowApiKeyModal(true)}
                className={`px-3 py-1.5 rounded-full flex items-center gap-2 transition-all font-medium text-xs ${
                  apiKeyStatus.hasApiKey 
                    ? 'text-[#ffc655] border border-green-200' 
                    : 'text-teal-600 border border-red-200'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  apiKeyStatus.hasApiKey ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {apiKeyStatus.hasApiKey ? 'API Key Set' : 'Add Key'}
              </button> */}
            </div>
          </div>
        )}

        {/* Desktop Header - Only show when there are messages and not mobile */}
        {!isChatEmpty && !isMobile && (
          <div className="p-6 bg-[#262624] backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex bg-[#30302e] hover:bg-[#3c3b39] rounded-xl p-3 items-center gap-3">
                  <span className="text-sm text-gray-100">
                  <span className="font-medium text-gray-300">{currentChat?.title || session.user?.name || session.user?.username?.split('@')[0]}</span>
                  </span>
                </div>
              </div>

              <div className="relative flex items-center gap-3">
                <button
                  onClick={() => {
                    /* UI-only share button - no action required */
                  }}
                  className="flex items-center hover:bg-[#3c3b39] p-2 rounded-xl gap-1"
                  aria-label="Share"
                >
                  <Share className="w-4 h-4 text-white" />
                  <span className="text-white text-sm">Share</span>
                </button>

                <button
                  onClick={() => setIsHeaderMenuOpen(prev => !prev)}
                  className="flex items-center  p-2 rounded-xl gap-1"
                  aria-expanded={isHeaderMenuOpen}
                  aria-label="More options"
                >
                  <span className="text-white text-lg">⋮</span>
                </button>

                {isHeaderMenuOpen && (
                  <div className="absolute right-0 mt-20 w-28 bg-[#30302e] rounded-xl shadow-lg z-50">
                    <button
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        if (currentChatId) confirmDeleteChat(currentChatId);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-red-600/20 hover:rounded-xl text-white flex items-center gap-2"
                    >
                      <Trash className="w-4 h-4 text-sm text-red-500" />
                      Delete
                    </button>
                    {/* Future menu items (e.g., Share) can go here */}
                  </div>
                )}
              </div>
              
            </div>
          </div>
        )}

        {/* Chat Messages or Welcome Screen */}
        <div 
          ref={chatContainerRef} 
          className={`flex-1 overflow-y-auto scrollbar-hidden ${
            isChatEmpty ? 'flex items-center justify-center' : ''
          }`}
        >
          {isChatEmpty ? (
            <div className={`text-center text-gray-500 w-full mx-auto px-4 transform -translate-y-6 ${isMobile ? 'flex flex-col items-center justify-center min-h-full py-8' : 'max-w-4xl'}`}>
              {/* Welcome Content */}
              <div className={`inline-flex rounded-full ${isMobile ? 'w-42 h-42 mb-6' : 'w-24 h-24 mb-3 sm:mb-5'}`}>
                {/* Reduce welcome/logo size on mobile to prevent layout issues (desktop unchanged) */}
                <Image src={Logo} alt="Logo" width={isMobile ? 120 : 90} height={isMobile ? 120 : 90} className="rounded-full" />
              </div>
              <h3 className={`font-semibold text-white px-2 ${isMobile ? 'text-3xl mb-4' : 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 sm:mb-4'}`}>
                Back at it, <span className="font-medium text-teal-600">{session.user?.name || session.user?.username?.split('@')[0]}</span>
              </h3>
              <p className={`text-white px-2 ${isMobile ? 'text-sm mb-6' : 'mb-4 sm:mb-6 lg:mb-8 text-xs sm:text-sm md:text-base'}`}>AI-powered fraud detection for real-time threat prevention.</p>
              
              {/* API Key Status for Empty State - Hidden on mobile header */}
              {/* {!isMobile && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setShowApiKeyModal(true)}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full flex items-center gap-2 sm:gap-3 transition-all font-medium text-xs sm:text-sm md:text-base ${
                      apiKeyStatus.hasApiKey 
                        ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' 
                        : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                    }`}
                  >
                    <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full ${
                      apiKeyStatus.hasApiKey ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    {apiKeyStatus.hasApiKey ? 'API Key Configured' : 'Configure API Key'}
                    <Key className="w-4 sm:w-5 h-4 sm:h-5" />
                  </button>
                </div>
              )} */}
              
              {/* Centered Input Bar */}
              {/* On mobile use full width so the prompt doesn't shrink; keep desktop centered 4/6 width */}
              <div className={`${isMobile ? 'relative w-full px-4 mx-auto' : 'relative w-4/5 mx-auto max-w-4xl px-4 sm:px-0'}`}>
                <PromptInput
                  value={currentQuery}
                  onValueChange={setCurrentQuery}
                  isLoading={isLoading}
                  onSubmit={handleSubmit}
                  className="w-full"
                >
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="relative group bg-[#30302e] rounded-xl overflow-hidden border border-[#30302e]"
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Image preview for QR codes */}
                          {file.type.startsWith('image/') ? (
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={file.name}
                                className="w-32 h-32 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleRemoveFile(index)}
                                  className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                                  title="Remove image"
                                >
                                  <X className="size-4 text-white" />
                                </button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-xs text-white truncate">
                                {file.name}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 text-sm text-white">
                              <span className="max-w-[120px] truncate">{file.name}</span>
                              <button
                                onClick={() => handleRemoveFile(index)}
                                className="hover:bg-[#1f1e1d] rounded-full p-1"
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <PromptInputTextarea 
                    placeholder={apiKeyStatus.hasApiKey ? 
                      (isAdvisorMode ? "Ask for fraud prevention advice..." : "Ask anything") : 
                      "Configure your API key first..."
                    }
                    /* smaller base font on mobile, preserve desktop size with sm: */
                    className="bg-[#30302e] min-h-[50px] text-base sm:text-xl text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-[#ff9542] max-h-[220px] overflow-auto custom-scrollbar"
                  />

                  <PromptInputActions className="flex items-center justify-between gap-1 pt-2">
                    <div className="flex items-center gap-1">
                      <PromptInputAction tooltip="Upload">
                        <label
                          htmlFor="file-upload"
                          className=" text-white flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl"
                        >
                          <input
                            ref={uploadInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                            disabled={!apiKeyStatus.hasApiKey}
                          />
                          <ImagePlus className="text-white hover:text-teal-600 size-5" />
                        </label>
                      </PromptInputAction>

                      {/* Advisor Mode Toggle */}
                      <button
                        onClick={() => setIsAdvisorMode(!isAdvisorMode)}
                        className={`flex h-8 w-8 items-center justify-center rounded-2xl transition-colors ${
                          isAdvisorMode 
                            ? '' 
                            : ''
                        }`}
                        disabled={!apiKeyStatus.hasApiKey}
                        title={isAdvisorMode ? "Switch to Detection Mode" : "Switch to Advisor Mode"}
                      >
                        <Brain className={`size-5 ${
                          isAdvisorMode ? 'text-[#41d5c7]' : 'text-white'
                        }`} />
                      </button>
                      

                      {/* Model Selector Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowModelDropdown(!showModelDropdown)}
                          className="hover:bg-[#1f1e1d] flex h-8 px-3 cursor-pointer items-center justify-center rounded-2xl gap-1.5 text-white"
                          disabled={!apiKeyStatus.hasApiKey}
                          title="Select Model"
                        >
                          <Sparkles className="size-4" />
                          <span className="text-xs font-medium">{selectedModel}</span>
                          <ChevronDown className="size-3" />
                        </button>
                        
                        {showModelDropdown && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setShowModelDropdown(false)}
                            />
                            <div className="absolute bottom-full left-0 mb-2 bg-[#30302e] rounded-xl shadow-xl border border-[#30302e] p-2 w-56 z-20">
                              <button
                                onClick={() => {
                                  setSelectedModel('Orion-1');
                                  setShowModelDropdown(false);
                                }}
                                className={`w-full px-3 py-2.5 text-left rounded-xl hover:bg-[#2b2b2b] transition-colors flex items-start gap-3 ${
                                  selectedModel === 'Orion-1' ? 'bg-[#2b2b2b] text-white' : 'text-white'
                                }`}
                              >
                                <div className={`w-2 h-2 rounded-full mt-1 ${selectedModel === 'Orion-1' ? 'bg-white' : 'bg-gray-600'}`} />
                                <div className="flex-1 whitespace-normal">
                                  <div className="font-bold text-white text-sm">Orion-1</div>
                                  <div className="text-xs text-gray-200">Smartest for every day task</div>
                                </div>
                                {selectedModel === 'Orion-1' && <Check className="size-4 text-teal-800 mt-1" />}
                              </button>
                              <button
                                disabled
                                className="w-full px-3 py-2.5 text-left rounded-md hover:bg-[#30302e]/30 transition-colors flex items-start gap-3 text-gray-400 cursor-not-allowed"
                              >
                                <div className="w-2 h-2 rounded-full mt-1 bg-gray-100" />
                                <div className="flex-1 whitespace-normal">
                                  <div className="font-bold text-white text-sm">Orion-Pax</div>
                                  <div className="text-xs text-gray-200">Deep understanding of context</div>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                     
                      
                    </div>

                    <PromptInputAction
                      tooltip={isLoading ? "Stop generation" : "Send message"}
                    >
                      <Button
                        variant="default"
                        size="icon"
                        className="h-9 w-9 rounded-full bg-teal-600 hover:bg-[#ff6b7d]"
                        onClick={isLoading ? stopRequest : handleSubmit}
                        disabled={!apiKeyStatus.hasApiKey || (!isLoading && !currentQuery.trim() && files.length === 0)}
                      >
                        {isLoading ? (
                          <Square className="size-5 fill-current" />
                        ) : (
                          <ArrowUp className="size-8 text-white" />
                        )}
                      </Button>
                    </PromptInputAction>
                  </PromptInputActions>
                </PromptInput>
              </div>
              {/* AI Advisor suggestions (desktop only) */}
              {!isMobile && (
                <div className="relative w-4/6 mx-auto max-w-4xl px-4 sm:px-0 mt-4">
                  {/* <p className="text-sm text-gray-400 mb-2">AI Advisor suggestions</p> */}
                  <div className="grid grid-cols-2 gap-2">
                    {advisorSuggestions.map((sugg) => (
                      <button
                        key={sugg}
                        title={sugg}
                        onClick={() => {
                          setIsAdvisorMode(true);
                          setCurrentQuery(sugg);
                        }}
                        className="w-full text-left px-3 py-2 bg-[#30302e] hover:bg-[#3c3b39] text-white rounded-2xl text-sm truncate"
                      >
                        {sugg}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Loading State for Empty Chat (hidden while per-message streaming active) */}
              {isLoading && !messages.some(m => m.isStreaming) && (
                <div className={`flex items-center justify-center gap-2 sm:gap-3 text-white rounded-2xl max-w-md mx-auto shadow-lg ${isMobile ? 'p-4 mt-6' : 'p-3 sm:p-4 md:p-6 mt-4 sm:mt-6 md:mt-8'}`}>
                  <div className="flex items-center gap-3">
                    <Image
                      src={Logo}
                      alt="processing"
                      width={isMobile ? 32 : 24}
                      height={isMobile ? 32 : 24}
                      className="rounded-full spin-pulse-loader block"
                      priority
                      style={{ display: 'inline-block', objectFit: 'cover' }}
                    />

                    <span 
                      className={`font-medium thinking-pulse ${isMobile ? 'text-sm' : 'text-xs sm:text-sm md:text-base'}`}
                    >
                      Thinking...
                    </span>
                  </div>
                </div>
              )}
            </div>
            ) : (
            <>
              {/* Centered inner container to keep messages width consistent with the prompt input */}
              <div className="max-w-3xl mx-auto px-4 sm:px-20 lg:px-0 space-y-6 pb-32">
                {/* Existing Messages */}
                {messages.map((msg, index) => (
                  <div key={msg.id || index} className="relative">
                    <MessageComponent 
                      message={msg} 
                      isMobile={isMobile}
                      onEdit={startEdit}
                      onReload={handleReload}
                      isEditing={editingMessageId === msg.id}
                      editedContent={editedContent}
                      onEditChange={setEditedContent}
                      onSaveEdit={saveEdit}
                      onCancelEdit={cancelEdit}
                    />
                    {/* Copy action (appear immediately after AI response) */}
                    {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                      <div className="">
                        <div className="max-w-3xl mx-auto px-4 sm:px-20 lg:px-0">
                          <div className="w-full flex items-center justify-start ml-0 sm:ml-6">
                            <CopyInline content={msg.content} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Render assistant footer (AI avatar left + disclaimer right) aligned to the centered container */}
                    {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                      <div className="w-full mt-2">
                        <div className="max-w-3xl mx-auto px-4 sm:px-20 lg:px-0">
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center">
                              {/* Slightly smaller avatar on mobile to avoid pushing the disclaimer; alignment preserved */}
                              <Image src={Logo} alt="ai-avatar-footer" width={isMobile ? 32 : 50} height={isMobile ? 32 : 50} className="mt-0 ml-0 sm:mt-0 sm:ml-3 rounded-full fade-in transition-all duration-600 logo-rotate" />
                            </div>

                            <div className={`${isMobile ? 'bg-[#3f3f39] rounded-xl p-1 text-[10px] mt-3 mb-2' : 'bg-[#30302e] rounded-xl p-1 mr-11 text-xs mt-4 mb-4'} mr-2 text-gray-400`}>
                              <Image src={Logo} alt="Logo name" width={15} height={15} className="inline-block mr-2 mb-1 opacity-50" />
                              Sotrian can make mistakes — double-check the response
                            </div>
                          </div>
                          {/* Spaced divider below the logo + disclaimer - has left/right spacing (mx-6) */}
                          <div className="w-full">
                            <div className="border-t border-gray-100 mx-12 mt-6" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && !messages.some(m => m.isStreaming) && (
                  <div className="flex items-center gap-3 text-white p-4 sm:p-6 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Image
                        src={Logo}
                        alt="processing"
                        width={24}
                        height={24}
                        className="rounded-full spin-pulse-loader block"
                        priority
                        style={{ display: 'inline-block', objectFit: 'cover' }}
                      />

                      <span 
                        className="text-sm sm:text-base font-medium thinking-pulse"
                      >
                        Thinking...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom Input Bar - Only show when there are messages */}
        {!isChatEmpty && (
          <div className="pb-4 pt-1 bg-[#262624] backdrop-blur-sm">
            <div className="relative max-w-3xl mx-auto px-4 sm:px-20 lg:px-0">
              <PromptInput
                value={currentQuery}
                onValueChange={setCurrentQuery}
                isLoading={isLoading}
                onSubmit={handleSubmit}
                className="w-full"
              >
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="relative group bg-[#30302e] rounded-xl overflow-hidden border border-[#30302e]"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Image preview for QR codes */}
                        {file.type.startsWith('image/') ? (
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={file.name}
                              className="w-32 h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleRemoveFile(index)}
                                className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                                title="Remove image"
                              >
                                <X className="size-4 text-white" />
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-xs text-white truncate">
                              {file.name}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 text-sm text-white">
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <button
                              onClick={() => handleRemoveFile(index)}
                              className="hover:bg-[#1f1e1d] rounded-full p-1"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <PromptInputTextarea 
                  placeholder={apiKeyStatus.hasApiKey ? 
                    (isAdvisorMode ? "Ask for fraud prevention advice..." : "Ask anything...") : 
                    "Configure your API key first..."
                  }
                  className="bg-[#30302e] text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-[#ff9542] min-h-[40px] max-h-[220px] overflow-auto custom-scrollbar"
                />

                <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <PromptInputAction tooltip="Upload">
                      <label
                        htmlFor="file-upload-bottom"
                        className="hover:bg-[#1f1e1d] text-white flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl"
                      >
                        <input
                          ref={uploadInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload-bottom"
                          disabled={!apiKeyStatus.hasApiKey}
                        />
                        <ImagePlus className="text-white size-5" />
                      </label>
                    </PromptInputAction>
                    {/* Advisor Mode Toggle */}
                    <PromptInputAction 
                    className='text-white border-none'
                      tooltip={isAdvisorMode ? "Switch to Fraud Detection" : "Switch to Fraud Advisor"}
                    >
                      <button
                        onClick={() => setIsAdvisorMode(!isAdvisorMode)}
                        className={`flex h-8 w-8 items-center justify-center rounded-2xl transition-colors ${
                          isAdvisorMode 
                            ? '' 
                            : ''
                        }`}
                        disabled={!apiKeyStatus.hasApiKey}
                      >
                        <Brain className={`size-5 ${
                          isAdvisorMode ? 'text-[#41d5c7]' : 'text-white'
                        }`} />
                      </button>
                    </PromptInputAction>

                    {/* Model Selector Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        className="hover:bg-[#1f1e1d] flex h-8 px-3 cursor-pointer items-center justify-center rounded-2xl gap-1.5 text-white"
                        disabled={!apiKeyStatus.hasApiKey}
                        title="Select Model"
                      >
                        <Sparkles className="size-4" />
                        <span className="text-xs font-medium">{selectedModel}</span>
                        <ChevronDown className="size-3" />
                      </button>
                      
                      {showModelDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowModelDropdown(false)}
                          />
                          <div className="absolute bottom-full left-0 mb-2 bg-[#30302e] rounded-xl shadow-xl border border-[#30302e] p-2 w-56 z-20">
                            <button
                              onClick={() => {
                                setSelectedModel('Orion-1');
                                setShowModelDropdown(false);
                              }}
                              className={`w-full px-3 py-2.5 text-left rounded-xl hover:bg-[#1f1e1d] transition-colors flex items-center gap-3 ${
                                selectedModel === 'Orion-1' ? 'bg-[#30302e] text-white' : 'text-white'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${selectedModel === 'Orion-1' ? 'bg-white' : 'bg-gray-600'}`} />
                              <div className="flex-1 whitespace-normal">
                                <div className="font-bold text-white text-sm">Orion-1</div>
                                <div className="text-xs text-gray-100">Smartest for every day task</div>
                              </div>
                              {selectedModel === 'Orion-1' && <Check className="size-4 text-teal-600" />}
                            </button>
                            <button
                              disabled
                              className="w-full px-3 py-2.5 text-left hover:bg-[#30302e]/30 transition-colors flex items-center gap-3 text-gray-500 cursor-not-allowed"
                            >
                              <div className="w-2 h-2 rounded-full bg-gray-100" />
                              <div className="flex-1 whitespace-normal">
                                <div className="font-bold text-white text-sm">Orion-Pax</div>
                                <div className="text-xs text-gray-100">Deep understanding of context</div>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    
                  </div>

                  <PromptInputAction
                    tooltip={isLoading ? "Stop generation" : "Send message"}
                  >
                    <Button
                      variant="default"
                      size="icon"
                      className="h-10 w-10 text-white rounded-full bg-teal-600 hover:bg-[#ff6b7d]"
                      onClick={isLoading ? stopRequest : handleSubmit}
                      disabled={!apiKeyStatus.hasApiKey || (!isLoading && !currentQuery.trim() && files.length === 0)}
                    >
                      {isLoading ? (
                        <Square className="size-5 fill-current" />
                      ) : (
                        <ArrowUp className="size-8 text-white" />
                      )}
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>
            </div>
          </div>
        )}
      </div>

      {/* API Key Modal - Mobile Responsive */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-teal-600 px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Google Gemini API Key
                </h3>
                <button
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setApiKeyInput('');
                    setApiKeyError('');
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* API Key Status */}
            <div className="p-4 sm:p-6 bg-[#30302e]">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-3 rounded-full ${apiKeyStatus.hasApiKey ? 'bg-green-100' : 'bg-red-100'}`}>
                  {apiKeyStatus.hasApiKey ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${
                    apiKeyStatus.hasApiKey ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {apiKeyStatus.hasApiKey ? 'API Key Configured' : 'No API Key Configured'}
                  </p>
                  {apiKeyStatus.hasApiKey && apiKeyStatus.maskedKey && (
                    <p className="text-sm text-gray-600 font-mono">{apiKeyStatus.maskedKey}</p>
                  )}
                  {apiKeyError && (
                    <p className="text-sm text-red-600 mt-1">{apiKeyError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* API Key Form */}
            <div className="p-4 sm:p-6 bg-[#30302e] space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  {apiKeyStatus.hasApiKey ? 'Update API Key' : 'Add API Key'}
                </label>
                <input
                  type="password" 
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-3 border text-white bg-[#1f1e1d] border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff9542] focus:border-transparent"
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    setApiKeyError('');
                  }}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Google API keys start with &quot;AIza&quot; and are typically 39 characters long
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 font-medium mb-2">
                  How to get a Google Gemini API Key:
                </p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                  <li>Sign in with your Google account</li>
                  <li>Click &quot;Create API Key&quot;</li>
                  <li>Copy and paste it above</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  <Brain className="w-3 h-3 inline mr-1" />
                  Your API key is encrypted using AES-256-CBC before being stored
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-4 border-t-2 border-white bg-[#30302e] flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setApiKeyInput('');
                  setApiKeyError('');
                }}
                className="flex-1 px-4 py-3 border-2 border-teal-600 text-teal-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              
              {apiKeyStatus.hasApiKey && (
                <button
                  onClick={deleteApiKey}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  Delete
                </button>
              )}
              
              <button
                onClick={saveApiKey}
                disabled={isLoading || !apiKeyInput.trim()}
                className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-[#ff6b7d] disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    {apiKeyStatus.hasApiKey ? 'Update' : 'Save'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Chat Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0  backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#30302e] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border-2 border-[#30302e]">
            {/* Modal Header */}
            <div className=" px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Delete Chat ? 
                </h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setChatToDelete(null);
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-300 text-base leading-relaxed">
                Are you sure you want to delete this chat? This action cannot be undone and all messages will be permanently removed.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#30302e] flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setChatToDelete(null);
                }}
                className="px-5 py-2.5 border-2  text-white rounded-3xl hover:bg-[#1f1e1d] transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={deleteChat}
                className="px-5 py-2.5 border-white border-2  text-red-700 rounded-3xl hover:bg-red-700 hover:text-white transition-all font-medium flex items-center gap-2 shadow-lg"
              >
                <Trash className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Global Styles */}
      <style jsx global>{`
        .scrollbar-hidden {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;     /* Firefox */
        }

        .scrollbar-hidden::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }

        .logo-rotate:hover {
          transform: rotate(360deg);
          transition: transform 0.6s ease-in-out;
        }

        /* Markdown Styling */
        .prose-invert {
          color: #e5e7eb;
        }

        .prose-invert strong {
          color: #ffffff;
          font-weight: 700;
        }

        .prose-invert em {
          color: #ffffff;
          font-style: italic;
        }

        .prose-invert code {
          background-color: #1f1e1d;
          color:teal-600
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }

        .prose-invert pre {
          background-color: #1f1e1d;
          border: 1px solid #30302e;
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
        }

        .prose-invert pre code {
          background-color: transparent;
          color: #e5e7eb;
          padding: 0;
        }

        .prose-invert ul, .prose-invert ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .prose-invert li {
          margin: 0.25rem 0;
          color: #e5e7eb;
        }

        .prose-invert ul li::marker {
          color:teal-600
        }

        .prose-invert ol li::marker {
          color:teal-600
        }

        .prose-invert h1, .prose-invert h2, .prose-invert h3, 
        .prose-invert h4, .prose-invert h5, .prose-invert h6 {
          color: #ffc655;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .prose-invert a {
          color: white;
          text-decoration: underline;
        }

        .prose-invert a:hover {
          color:teal-600
        }

        .prose-invert blockquote {
          border-left: 4px solidteal-600
          padding-left: 1rem;
          margin: 1rem 0;
          color: #9ca3af;
          font-style: italic;
        }

        .prose-invert table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .prose-invert th, .prose-invert td {
          border: 1px solid #30302e;
          padding: 0.5rem;
          text-align: left;
        }

        .prose-invert th {
          background-color: #1f1e1d;
          color:teal-600
          font-weight: 700;
        }

        .prose-invert td {
          background-color: #30302e;
        }

        .prose-invert hr {
          border: none;
          border-top: 2px solid #30302e;
          margin: 1.5rem 0;
        }

        .prose-invert p {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        /* Logo rotation that spins for 0.3s then pauses for 0.2s (0.5s total cycle) */
        @keyframes spinStep {
          /* 0% - 60% corresponds to 0 - 0.3s (spin), 60%-100% is the pause (0.2s) */
          0% { transform: rotate(0deg) scale(1); }
          60% { transform: rotate(360deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }

        /* Opacity pulse used by logo and thinking text */
        @keyframes opacityPulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }

        .spin-pulse-loader {
          transform-origin: center;
          /* spinStep: 0.5s cycle (0.3s spin + 0.2s pause)
             opacityPulse: slower smooth breathing */
          animation: spinStep 0.5s linear infinite, opacityPulse 1.2s ease-in-out infinite;
          transition: opacity 200ms ease-in-out;
        }

        .thinking-pulse {
          animation: opacityPulse 1.2s ease-in-out infinite;
        }

        /* Advisor Content Styling - Structured response with varying sizes */
        .advisor-content {
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
          /* Ensure long text lines wrap instead of expanding the layout */
          white-space: pre-wrap;
        }

        /* Prevent long code blocks, JSON or URLs from forcing horizontal scroll
           - code/pre should scroll internally, not expand the chat window
           - plain text will wrap while preserving line breaks */
        .advisor-content, .prose, .prose-invert {
          word-break: break-word;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .advisor-content pre,
        .prose pre,
        .prose-invert pre {
          max-width: 100%;
          overflow-x: auto; /* scroll inside the code block */
          white-space: pre;  /* preserve formatting for code blocks */
          padding: 0.75rem;
          border-radius: 0.375rem;
          background: rgba(255,255,255,0.03);
        }

        .advisor-content code,
        .prose code,
        .prose-invert code {
          word-break: break-word;
          white-space: pre-wrap; /* allow inline code to wrap */
        }

        /* Images/tables inside messages should be constrained to content width */
        .advisor-content img,
        .prose img,
        .prose-invert img,
        .advisor-content table,
        .prose table,
        .prose-invert table {
          max-width: 100%;
          height: auto;
          display: block;
        }

        .advisor-content h1 {
          font-size: 2.1rem;
          font-weight: 900;
          color: #ffffff; /* headings use white now */
          margin-top: 0.6rem;
          margin-bottom: 0.45rem;
          line-height: 1.3;
        }

        .advisor-content h2 {
          font-size: 1.8rem;
          font-weight: 900;
          color: #ffffff; /* headings use white now */
          margin-top: 0.85rem;
          margin-bottom: 0.35rem;
          line-height: 1.4;
        }

        .advisor-content h3 {
          font-size: 1.6rem;
          font-weight: 600;
          color: #ffffff; /* headings use white now */
          margin-top: 0.6rem;
          margin-bottom: 0.3rem;
        }

        .advisor-content p,
        .advisor-content p,
        .advisor-content ul,
        .advisor-content ol,
        .advisor-content li {
          color: #fff !important;
        }

        .advisor-content p {
          font-size: 1.1rem; /* bumped up slightly for readability */
          /* slightly more relaxed line spacing for clarity */
          line-height: 1.34;
          margin: 0.28rem 0;
        }

        /* Advisor lists: use native list markers (no duplicated counters), compact spacing,
           white bold markers, and slightly larger headline text inside list items. */
        .advisor-content ul,
        .advisor-content ol {
          font-size: 1.02rem; /* small increase */
          /* slightly tighter list spacing */
          line-height: 1.28;
          padding-left: 0.9rem;
          margin: 0.34rem 0;
          list-style-position: outside;
        }

        .advisor-content ol {
          list-style-type: decimal;
        }

        /* Make the list markers (numbers/bullets) white and bold and reduce gap */
        .advisor-content ol li::marker,
        .advisor-content ul li::marker {
          color: #ffffff;
          font-weight: 700;
          font-size: 1rem;
          /* reduce default gap between marker and text */
          /* browsers handle spacing; padding-left on container controls layout */
        }

        .advisor-content li {
          margin: 0.12rem 0;
        }

        /* If the list item starts with a short strong heading, keep it inline with the marker
           and give it a slightly larger, bold appearance with a small gap to the following text. */
        .advisor-content li > strong {
          display: inline;
          font-size: 1.02rem;
          color: #ffffff;
          font-weight: 800;
          margin-right: 0.4rem; /* small space between heading and the rest of the item */
          line-height: 1.3;
        }

        .advisor-content hr {
          border-color: white;
          border-width: 1.5px;
          margin: 1.25rem 0;
          opacity: 0.5;
        }

        .advisor-content strong {
          font-weight: 700;
        }

        .advisor-content em {
          font-style: italic;
        }

        /* Tighter message content spacing for chat bubbles */
        .message-content {
          line-height: 1.22; /* denser lines */
        }

        .message-content p {
          margin: 0.18rem 0 !important;
          line-height: 1.22 !important;
        }

        .message-content ul,
        .message-content ol {
          margin: 0.18rem 0 !important;
          padding-left: 0.9rem;
          line-height: 1.18 !important;
        }

        .message-content li {
          margin: 0.08rem 0 !important;
        }

        .message-content h1, .message-content h2, .message-content h3, .message-content h4 {
          margin-top: 0.35rem !important;
          margin-bottom: 0.25rem !important;
          line-height: 1.18 !important;
        }

        .advisor-content blockquote {
          border-left-color:teal-600
          border-left-width: 4px;
          padding-left: 1rem;
          font-style: italic;
          color: #9ca3af;
          margin: 1rem 0;
        }

        /* Mobile adjustments for advisor content */
        @media (max-width: 640px) {
          .advisor-content {
            margin-left: 0 !important;
            padding-left: 0 !important;
          }
          .advisor-content h1 {
            font-size: 1.3rem;
          }
          .advisor-content h2 {
            font-size: 1.05rem;
          }
          .advisor-content h3 {
            font-size: 1.0rem;
          }
          .advisor-content p {
            font-size: 0.95rem;
          }
          .advisor-content ul, .advisor-content ol {
            font-size: 0.95rem;
          }
        }

        /* Mobile prompt input width and font size fix */
        @media (max-width: 640px) {
          .prompt-input-mobile-fix {
            width: 100vw !important;
            max-width: 100vw !important;
            min-width: 0 !important;
            font-size: 1rem !important;
          }
        }

        /* Custom scrollbar for textarea inputs */
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f1e1d;
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #30302e;
          border-radius: 999px;
          border: 2px solid #1f1e1d;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #30302e #1f1e1d;
        }
      `}</style>
    </div>
  );
}

// Simple Message Component - ChatGPT/Claude Style with avatars
const MessageComponent: React.FC<{ 
  message: Message; 
  isMobile?: boolean; // kept for compatibility but unused in current implementation
  onEdit?: (id: string, content: string) => void;
  onReload?: (id: string) => void;
  isEditing?: boolean;
  editedContent?: string;
  onEditChange?: (content: string) => void;
  onSaveEdit?: (id: string) => void;
  onCancelEdit?: () => void;
}> = ({ 
  message, 
  onEdit,
  onReload,
  isEditing = false,
  editedContent = '',
  onEditChange,
  onSaveEdit,
  onCancelEdit
}) => {
  const isUserMessage = message.role === 'user';
  const content = message.content || '';
  // Treat a message as a "system" notification only when it looks like a short status/notification
  // and there is no structured fraudDetectionResult attached. Many assistant outputs include
  // emojis like ✅/🚨 but are full assistant analyses — prefer rendering those as normal assistant
  // bubbles when `fraudDetectionResult` (or queryType) is present.
  const isSystemMessage = !message.fraudDetectionResult && !message.queryType && (/^[✅❌🗑️]/.test(content.trim()) && content.trim().length < 140);
  const { data: session } = useSession();
  const { toast } = useToast();

  // (Pre-existing large avatars removed; using compact bottom avatars instead)

  // Small user avatar for the bottom controls (tiny circle)
  const SmallUserAvatar = () => {
    const name = session?.user?.name || session?.user?.email || 'U';
    const initial = String(name).charAt(0).toUpperCase();

    if (session?.user?.image) {
      return (
        <Image
          src={session.user.image}
          alt={session.user.name || 'User'}
          width={30}
          height={30}
          className="rounded-full object-cover"
        />
      );
    }

    return (
      <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-[11px] font-medium text-white">
        {initial}
      </div>
    );
  };

  // User Message (right side with avatar on the right)
  if (isUserMessage) {
    return (
      <div className="flex flex-col items-end mb-4 gap-2 w-full">
          <div className="flex items-end gap-3 justify-end w-full">
          <div className="max-w-[85%] sm:max-w-[75%] mr-1">
            {isEditing ? (
              <div className="bg-[#1f1e1d] text-white rounded-2xl px-4 sm:px-5 py-3 sm:py-4 border border-[#0f403b]/30 shadow-lg">
                <div className="mb-3">
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">Edit your message</label>
                  <textarea
                    value={editedContent}
                    onChange={(e) => onEditChange?.(e.target.value)}
                    className="w-full bg-[#30302e] text-white rounded-xl px-4 py-3 min-h-[140px] max-h-[420px] overflow-auto resize-vertical border-2 border-[#0f403b] focus:outline-none focus:ring-2 focus:ring-[#0f403b] focus:border-transparent transition-all custom-scrollbar"
                    autoFocus
                    placeholder="Type your message..."
                  />
                </div>
                <div className="flex gap-2.5 justify-end">
                  <button
                    onClick={onCancelEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-xl hover:bg-[#30302e] transition-all border border-[#30302e]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onSaveEdit?.(message.id)}
                    className="px-4 py-2 text-sm font-medium bg-[#0f403b] hover:bg-[#ff6b7d] text-white rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <ArrowUp className="w-4 h-4" />
                    Save & Submit
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-end mt-16">
                {/* Display image if present - SEPARATE from text bubble */}
                {message.image && (
                  <div className=" w-1/2 h-1/2  rounded-xl mb-3 border-2 border-[#30302e]">
                    <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 font-medium">
                     
                     
                    </div>
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={message.image} 
                        alt="Uploaded QR code" 
                        className="rounded-lg max-h-80 object-contain p-3 shadow-lg"
                      />
                    </div>
                  </div>
                )}
                
                {/* Text message bubble - SEPARATE from image */}
                {message.content && (
                  <div className="bg-[#1f1e1d] text-gray-400 rounded-xl px-4 sm:px-5 py-3 sm:py-4">
                    <div className="text-sm sm:text-base prose-invert message-content max-w-none break-words whitespace-pre-wrap">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Edit and Reload buttons (shown when not editing) */}
        {!isEditing && onEdit && onReload && (
          <div className="flex gap-2 mr-3 sm:mr-3 items-center">
            <button
              onClick={() => onEdit(message.id, message.content)}
              className="p-1.5 text-gray-400 hover:text-white  rounded-lg transition-all group"
              title="Edit message"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReload(message.id)}
              className="p-1.5 text-gray-400 hover:text-white  rounded-lg transition-all group"
              title="Retry with same message"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(message.content || '');
                  toast?.({ title: 'Copied', description: 'Message copied to clipboard' });
                } catch (e) {
                  console.error('Copy failed', e);
                }
              }}
              className="p-1.5 text-gray-400 hover:text-white  rounded-lg transition-all group"
              title="Copy message"
            >
              <Copy className="w-4 h-4" />
            </button>
            {/* small user avatar next to copy */}
            <div className="ml-1 flex items-center">
              <SmallUserAvatar />
            </div>
          </div>
        )}
      </div>
    );
  }

  // System Message (centered)
  if (isSystemMessage) {
    return (
      <div className="flex justify-center mb-2">
        <div className="max-w-md bg-[#30302e]/50 text-white rounded-xl px-4 py-2 text-lg text-center">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // Assistant Message (left side with AI avatar)
  // Special styling for advisor mode
  const isAdvisorMessage = message.mode === 'advisor';
  
  return (
    <div className="relative flex items-start mb-2 gap-3 w-full">
    <div className="max-w-[85%] sm:max-w-[75%]">
        <div className=" text-white rounded-2xl px-4 sm:px-5 py-3 sm:py-4 relative">
          <div className={`prose prose-invert message-content max-w-none break-words whitespace-pre-wrap ${
            isAdvisorMessage ? 'advisor-content' : 'prose-sm text-sm sm:text-base'
          }`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>

            {/* Inline streaming logo shown immediately after the flowing text while streaming */}
            {message.isStreaming && (
              <span className="inline-block align-baseline ml-2">
                <Image
                  src={Logo}
                  alt="streaming"
                  width={20}
                  height={20}
                  className="rounded-full spin-pulse-loader"
                />
              </span>
            )}
          </div>

          {/* Footer moved to parent wrapper so it aligns with the centered container */}
        </div>
      </div>
    </div>
  );
};

// Small inline copy button that shows a transient "Copied" label under the button
const CopyInline: React.FC<{ content?: string }> = ({ content = '' }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      if (content) await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={handleCopy}
        className="p-1 text-gray-400 hover:text-white rounded-lg transition-all sm:p-1.5"
        title="Copy response"
      >
        <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
      </button>
      <button
        onClick={handleCopy}
        className="p-1 text-gray-400 text-[10px] transition-all sm:text-sm sm:p-1"
        title="Retry"
      >
        Retry
      </button>
      <span
        className={`text-[10px] sm:text-xs text-green-400 mt-1 transition-opacity duration-200 ${copied ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden={!copied}
      >
        Copied
      </span>
    </div>
  );
};