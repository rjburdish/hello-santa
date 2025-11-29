// OpenAI GPT-4o-mini adapter with Santa persona
// Child-safety-first: short responses, age-appropriate, no PII requests
import OpenAI from 'openai';
import { getSantaPrompt } from 'shared';
import { logger } from '../../util/logger';
import { isUnsafeTopic, containsPII } from '../../safety/minimal';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class SantaLLM {
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  async generateResponse(userMessage: string): Promise<string | null> {
    try {
      // Safety check: block unsafe topics
      if (isUnsafeTopic(userMessage)) {
        logger.warn('Unsafe topic detected, sending redirect');
        return "Ho ho ho! Let's talk about something nice, like your favorite toys or the magic of Christmas!";
      }

      // Safety check: detect PII
      if (containsPII(userMessage)) {
        logger.warn('PII detected, sending redirect');
        return "Ho ho ho! Remember, you don't need to tell me personal details. Let's just have fun chatting!";
      }

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      // Keep history limited (last 6 messages = 3 turns)
      if (this.conversationHistory.length > 6) {
        this.conversationHistory = this.conversationHistory.slice(-6);
      }

      // Call GPT-4o-mini
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: getSantaPrompt(),
          },
          ...this.conversationHistory,
        ],
        max_tokens: 100, // Keep responses short (1-2 sentences)
        temperature: 0.8, // Warm and friendly
      });

      const response = completion.choices[0]?.message?.content?.trim();

      if (!response) {
        logger.error('Empty response from LLM');
        return null;
      }

      // Add Santa's response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
      });

      logger.info(`Santa response: "${response}"`);
      return response;
    } catch (error) {
      logger.error(`LLM generation failed: ${error}`);
      return null;
    }
  }

  reset() {
    this.conversationHistory = [];
  }
}
