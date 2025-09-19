import { createLogger, Logger } from '../../lib/logger';

interface Chat {
  id: string;
}

// ts-prune-ignore-next
export function getChatId(chat?: Chat, logger: Logger = createLogger()) {
  if (!chat) {
    logger.error('chat is required');
    throw new Error('chat is required');
  }
  logger.info('chat id retrieved', { chatId: chat.id });
  return chat.id;

}
