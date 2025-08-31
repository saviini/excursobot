import { OpenAIClient } from '../src/services/openai-client.js';

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

describe('OpenAIClient', () => {
  let client: OpenAIClient;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    client = new OpenAIClient(mockApiKey);
  });

  describe('getFactForLocation', () => {
    it('should return fact when OpenAI responds successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Это место известно своими древними руинами.'
            }
          }
        ]
      };

      // Mock OpenAI response
      const mockOpenAI = require('openai').default;
      const mockCreate = mockOpenAI.mock.results[0].value.chat.completions.create;
      mockCreate.mockResolvedValue(mockResponse);

      const result = await client.getFactForLocation(55.7558, 37.6176);

      expect(result.fact).toBe('Это место известно своими древними руинами.');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('эксперт по географии')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('55.7558, 37.6176')
          })
        ]),
        max_tokens: 150,
        temperature: 0.7
      });
    });

    it('should throw error when OpenAI returns empty response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null
            }
          }
        ]
      };

      const mockOpenAI = require('openai').default;
      const mockCreate = mockOpenAI.mock.results[0].value.chat.completions.create;
      mockCreate.mockResolvedValue(mockResponse);

      await expect(client.getFactForLocation(55.7558, 37.6176))
        .rejects
        .toThrow('Пустой ответ от OpenAI');
    });

    it('should handle rate limit errors', async () => {
      const mockError = new Error('Rate limit exceeded');
      mockError.status = 429;

      const mockOpenAI = require('openai').default;
      const mockCreate = mockOpenAI.mock.results[0].value.chat.completions.create;
      mockCreate.mockRejectedValue(mockError);

      await expect(client.getFactForLocation(55.7558, 37.6176))
        .rejects
        .toThrow('Превышен лимит запросов. Попробуйте через минуту.');
    });

    it('should handle server errors', async () => {
      const mockError = new Error('Internal server error');
      mockError.status = 500;

      const mockOpenAI = require('openai').default;
      const mockCreate = mockOpenAI.mock.results[0].value.chat.completions.create;
      mockCreate.mockRejectedValue(mockError);

      await expect(client.getFactForLocation(55.7558, 37.6176))
        .rejects
        .toThrow('Сервис OpenAI временно недоступен. Попробуйте позже.');
    });
  });
});
