"""
Fraud Prevention Advisor - Refactored with Input Validation
Clean architecture with reduced if-else complexity
"""

import os
import json
from typing import TypedDict, Optional
from enum import Enum
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from pydantic import BaseModel


# ============================================
# ENUMS & CONSTANTS
# ============================================

class QueryType(str, Enum):
    """Query type enumeration"""
    GREETING = "greeting"
    SIMPLE = "simple"
    DETAILED = "detailed"
    INVALID = "invalid"


class Topic(str, Enum):
    """Topic enumeration"""
    CREDIT_CARD = "credit_card"
    EMAIL_SPAM = "email_spam"
    URL_PHISHING = "url_phishing"
    UPI_PAYMENT = "upi_payment"
    CALL_FRAUD = "call_fraud"
    GENERAL = "general"


# Topic context mapping
TOPIC_CONTEXTS = {
    Topic.CREDIT_CARD: "credit card fraud, secure transactions, statement monitoring, online shopping safety",
    Topic.EMAIL_SPAM: "phishing emails, suspicious links, sender verification, email security",
    Topic.URL_PHISHING: "URL inspection, HTTPS, suspicious domains, browser security",
    Topic.UPI_PAYMENT: "UPI scams, merchant verification, payment security, PIN protection",
    Topic.CALL_FRAUD: "vishing, caller ID spoofing, verification tactics, phone scams",
    Topic.GENERAL: "general fraud awareness and prevention strategies"
}


# ============================================
# STATE & MODELS
# ============================================

class AdvisorState(TypedDict):
    """State for the fraud advisor workflow"""
    user_query: str
    is_valid: bool
    query_type: str
    topic: str
    response_text: str
    formatted_response: str


class AdvisorResponse(BaseModel):
    """Structured response from the advisor"""
    query_type: str
    topic: str
    formatted_response: str


# ============================================
# INPUT VALIDATOR
# ============================================

class InputValidator:
    """Validates user input before processing"""
    
    @staticmethod
    def validate(query: str) -> tuple[bool, str]:
        """
        Validate input query
        Returns: (is_valid, reason)
        """
        # Check minimum length
        if len(query.strip()) < 2:
            return False, "too_short"
        
        # Check maximum length
        if len(query) > 500:
            return False, "too_long"
        
        # Check for mostly non-alphabetic characters (gibberish detection)
        alpha_count = sum(c.isalpha() for c in query)
        total_chars = len(query.replace(' ', ''))
        
        if total_chars > 0 and alpha_count / total_chars < 0.5:
            return False, "gibberish"
        
        # Check for repeated characters (like "aaaaaaa" or "jjjjj")
        if len(query) > 5:
            for char in set(query.lower()):
                if char.isalpha() and query.lower().count(char) > len(query) * 0.4:
                    return False, "repeated_chars"
        
        # Check if it's mostly numbers (like "12345678")
        digit_count = sum(c.isdigit() for c in query)
        if total_chars > 0 and digit_count / total_chars > 0.7:
            return False, "mostly_numbers"
        
        return True, "valid"


# ============================================
# RESPONSE TEMPLATES
# ============================================

class ResponseTemplates:
    """Manages response generation templates"""
    
    @staticmethod
    def get_categorization_prompt(query: str) -> str:
        """Get prompt for query categorization"""
        return f"""Analyze this user query and categorize it:

User Query: "{query}"

Determine:
1. QUERY TYPE:
   - "greeting" - Just saying hi/hello
   - "simple" - Quick question (needs 2-3 paragraphs)
   - "detailed" - Complex question (needs thorough explanation)

2. TOPIC:
   - "credit_card", "email_spam", "url_phishing", "upi_payment", "call_fraud", "general"

Respond ONLY with JSON:
{{"query_type": "...", "topic": "..."}}"""
    
    @staticmethod
    def get_generation_prompt(query: str, query_type: QueryType, context: str) -> str:
        """Get prompt for response generation based on query type"""
        
        prompts = {
            QueryType.GREETING: f"""The user said: "{query}"

Respond naturally as a friendly fraud prevention advisor (1-2 sentences only).

Example: "Hello! I'm here to help you stay safe from fraud and scams. What would you like to know?"

Your response:""",
            
            QueryType.SIMPLE: f"""You are a helpful fraud prevention expert. Answer this question naturally:

Question: "{query}"
Topic: {context}

Structure your response EXACTLY like this:

1. OPENING (1 sentence)
   - Brief acknowledgment

2. CONTEXT (1-2 short paragraphs, max 100 words total)
   - Quick explanation of why this matters
   - Keep it brief and punchy

3. KEY ACTIONS (Use this EXACT format for bullet points)
   - Start each tip with "**Tip name:** Description"
   - Keep each bullet to 1-2 lines MAX
   - Use 4-6 tips total
   - Make them scannable and actionable

4. CLOSING (1 sentence)
   - Brief and encouraging

CRITICAL FORMATTING RULES:
- Use "**Bold:**" for tip headers
- Use "-" for bullet points (dash, not asterisk)
- Keep bullets SHORT (max 2 lines each)
- Use proper line breaks between sections
- NO emoji headers
- Write like you're explaining to a smart friend

Write your response:""",
            
            QueryType.DETAILED: f"""You are a fraud prevention expert. Provide detailed advice:

Question: "{query}"
Topic: {context}

Structure your response EXACTLY like this:

1. OPENING (1 sentence)
   - Validate their concern

2. CONTEXT (2-3 paragraphs, max 200 words total)
   - Explain why this matters
   - Give real-world examples
   - Keep paragraphs short (3-4 sentences each)

3. ACTION STEPS (Use this EXACT format)
   - Start each with "**Action name:** Description"
   - 6-8 specific steps
   - Each bullet: 1-2 lines MAX
   - Make them immediately actionable

4. CLOSING (1-2 sentences)
   - Reassuring and empowering

CRITICAL FORMATTING RULES:
- Use "**Bold:**" for action headers
- Use "-" for bullet points (dash, not asterisk)
- Keep bullets SCANNABLE (max 2 lines)
- Separate sections with blank lines
- NO emoji headers
- Be thorough but concise

Write your response:"""
        }
        
        return prompts.get(query_type, prompts[QueryType.SIMPLE])
    
    @staticmethod
    def get_invalid_input_message(reason: str) -> str:
        """Get appropriate message for invalid input"""
        messages = {
            "too_short": "Please provide a more detailed question so I can help you better.",
            "too_long": "Your question is quite long. Could you please make it more concise?",
            "gibberish": "I couldn't understand your question. Could you please rephrase it?",
            "repeated_chars": "I couldn't understand your question. Could you please rephrase it?",
            "mostly_numbers": "I couldn't understand your question. Could you please provide a clear question about fraud prevention?"
        }
        return messages.get(reason, "I couldn't understand your question. Could you please rephrase it?")


# ============================================
# FRAUD ADVISOR GRAPH
# ============================================

class FraudAdvisorGraph:
    """LangGraph workflow for fraud prevention advice"""
    
    def __init__(self, google_api_key: str):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=google_api_key,
            temperature=0.7,
            streaming=True
        )
        self.validator = InputValidator()
        self.templates = ResponseTemplates()
        self.graph = self.build_graph()
    
    def validate_input(self, state: AdvisorState) -> AdvisorState:
        """Validate user input"""
        is_valid, reason = self.validator.validate(state['user_query'])
        state['is_valid'] = is_valid
        
        if not is_valid:
            state['query_type'] = QueryType.INVALID
            state['formatted_response'] = self.templates.get_invalid_input_message(reason)
        
        return state
    
    def categorize_query(self, state: AdvisorState) -> AdvisorState:
        """Categorize the user's query"""
        if not state['is_valid']:
            return state
        
        prompt = self.templates.get_categorization_prompt(state['user_query'])
        response = self.llm.invoke(prompt)
        
        try:
            content = response.content.strip()
            content = content.replace('```json', '').replace('```', '').strip()
            result = json.loads(content)
            state['query_type'] = result.get('query_type', QueryType.SIMPLE)
            state['topic'] = result.get('topic', Topic.GENERAL)
        except:
            state['query_type'] = QueryType.SIMPLE
            state['topic'] = Topic.GENERAL
        
        return state
    
    def generate_response(self, state: AdvisorState) -> AdvisorState:
        """Generate the complete response naturally"""
        if not state['is_valid']:
            return state
        
        query_type = QueryType(state['query_type'])
        topic = Topic(state['topic'])
        context = TOPIC_CONTEXTS[topic]
        
        prompt = self.templates.get_generation_prompt(
            state['user_query'], 
            query_type, 
            context
        )
        
        response = self.llm.invoke(prompt)
        state['response_text'] = response.content.strip()
        
        return state
    
    def format_output(self, state: AdvisorState) -> AdvisorState:
        """Format with proper spacing and structure"""
        if not state['is_valid']:
            return state
        
        text = state['response_text']
        lines = text.split('\n')
        formatted_lines = []
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            if not stripped:
                continue
            
            is_bullet = stripped.startswith(('-', '*', '•', '**'))
            prev_line = formatted_lines[-1] if formatted_lines else ""
            prev_was_bullet = prev_line.strip().startswith(('-', '*', '•', '**')) if prev_line else False
            
            # Add blank line before first bullet in a list
            if is_bullet and not prev_was_bullet and formatted_lines:
                formatted_lines.append("")
            
            formatted_lines.append(stripped)
            
            # Add blank line after last bullet
            next_line = lines[i+1].strip() if i+1 < len(lines) else ""
            next_is_bullet = next_line.startswith(('-', '*', '•', '**')) if next_line else False
            
            if is_bullet and not next_is_bullet and next_line:
                formatted_lines.append("")
        
        formatted_text = '\n'.join(formatted_lines)
        formatted_text = formatted_text.replace('\n\n\n', '\n\n')
        
        state['formatted_response'] = formatted_text
        
        return state
    
    def should_continue(self, state: AdvisorState) -> str:
        """Determine if we should continue processing"""
        if not state['is_valid']:
            return "end"
        return "continue"
    
    def build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        workflow = StateGraph(AdvisorState)
        
        # Add nodes
        workflow.add_node("validate", self.validate_input)
        workflow.add_node("categorize", self.categorize_query)
        workflow.add_node("generate", self.generate_response)
        workflow.add_node("format", self.format_output)
        
        # Set entry point
        workflow.set_entry_point("validate")
        
        # Add conditional routing
        workflow.add_conditional_edges(
            "validate",
            self.should_continue,
            {
                "continue": "categorize",
                "end": "format"
            }
        )
        
        # Add sequential edges
        workflow.add_edge("categorize", "generate")
        workflow.add_edge("generate", "format")
        workflow.add_edge("format", END)
        
        return workflow.compile()
    
    def get_advice(self, user_query: str) -> dict:
        """Main method to get fraud prevention advice"""
        initial_state = {
            'user_query': user_query,
            'is_valid': False,
            'query_type': '',
            'topic': '',
            'response_text': '',
            'formatted_response': ''
        }
        
        final_state = self.graph.invoke(initial_state)
        
        return {
            'query_type': final_state['query_type'],
            'topic': final_state['topic'],
            'formatted_response': final_state['formatted_response']
        }
    
    async def get_advice_stream(self, user_query: str):
        """Stream fraud prevention advice"""
        import asyncio
        
        initial_state = {
            'user_query': user_query,
            'is_valid': False,
            'query_type': '',
            'topic': '',
            'response_text': '',
            'formatted_response': ''
        }
        
        final_state = self.graph.invoke(initial_state)
        formatted_message = final_state['formatted_response']
        
        # Stream word by word
        words = formatted_message.split(' ')
        chunk_size = 3
        
        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i+chunk_size])
            if i + chunk_size < len(words):
                chunk += ' '
            
            yield {
                'type': 'content',
                'content': chunk,
                'is_complete': False
            }
            await asyncio.sleep(0.04)
        
        yield {
            'type': 'complete',
            'content': '',
            'is_complete': True,
            'result': {
                'query_type': final_state['query_type'],
                'topic': final_state['topic'],
                'formatted_response': formatted_message
            }
        }


# ============================================
# MAIN EXECUTION
# ============================================

def main():
    """Test the fraud advisor"""
    from dotenv import load_dotenv
    load_dotenv()
    
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    
    if not GOOGLE_API_KEY:
        print("⚠️  GOOGLE_API_KEY not found!")
        return
    
    print("="*60)
    print("🛡️  FRAUD PREVENTION ADVISOR")
    print("="*60)
    
    advisor = FraudAdvisorGraph(google_api_key=GOOGLE_API_KEY)
    
    print("\n✓ Advisor initialized!")
    print("\n💬 Ask me anything about fraud prevention!")
    print("\nType your question or 'quit' to exit")
    print("-"*60)
    
    while True:
        user_input = input("\n🔍 You: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("\n👋 Stay safe out there!")
            break
        
        if not user_input:
            continue
        
        print("\n⏳ Analyzing...")
        
        try:
            result = advisor.get_advice(user_input)
            
            print("\n" + "="*60)
            print(f"\n{result['formatted_response']}")
            print("\n" + "="*60)
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    main()