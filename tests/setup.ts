// Глобальные настройки для тестов
process.env.NODE_ENV = 'test';

// Увеличиваем timeout для тестов
if (typeof jest !== 'undefined') {
  jest.setTimeout(10000);
}
