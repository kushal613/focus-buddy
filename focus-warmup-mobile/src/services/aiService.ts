import { ConversationMessage, MCQData, MCQResult } from '../types';

const API_BASE_URL = 'http://localhost:3131';
const MCQ_BASE_URL = 'http://localhost:3132';

export class AIService {
  static async chat(conversationHistory: ConversationMessage[]): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.reply || '';
    } catch (error) {
      console.error('Error in AI chat:', error);
      throw new Error('Failed to get AI response. Please check your connection.');
    }
  }

  static async generateMCQ(topic: string, conversationHistory: ConversationMessage[]): Promise<MCQData> {
    try {
      const response = await fetch(`${MCQ_BASE_URL}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the MCQ from the response
      const mcqText = data.prompt || '';
      const mcq = this.parseMCQ(mcqText);
      
      return mcq;
    } catch (error) {
      console.error('Error generating MCQ:', error);
      throw new Error('Failed to generate quiz question. Please try again.');
    }
  }

  static async evaluateMCQ(
    question: string,
    answer: string,
    conversationHistory: ConversationMessage[]
  ): Promise<MCQResult> {
    try {
      const response = await fetch(`${MCQ_BASE_URL}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          answer,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        correct: data.correct || false,
        feedback: data.feedback || '',
        correctAnswer: data.correctAnswer,
      };
    } catch (error) {
      console.error('Error evaluating MCQ:', error);
      throw new Error('Failed to evaluate answer. Please try again.');
    }
  }

  private static parseMCQ(mcqText: string): MCQData {
    // Extract question and options from the MCQ text
    const lines = mcqText.split('\n').filter(line => line.trim());
    
    // Find the question (everything before the first option)
    const questionEndIndex = lines.findIndex(line => 
      /^[A-D][\)\.]\s/.test(line.trim())
    );
    
    const question = questionEndIndex > 0 
      ? lines.slice(0, questionEndIndex).join(' ').trim()
      : lines[0] || '';

    // Extract options
    const options: MCQData['options'] = [];
    const optionRegex = /^([A-D])[\)\.]\s*(.+)$/;
    
    for (const line of lines) {
      const match = line.trim().match(optionRegex);
      if (match) {
        options.push({
          letter: match[1],
          text: match[2].trim(),
        });
      }
    }

    return {
      question,
      options: options.length >= 4 ? options : [],
    };
  }
}
