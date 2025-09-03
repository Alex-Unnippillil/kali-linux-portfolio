export interface Chat {
  id: string;
}

export function getChatId(chat?: Chat) {
  if (!chat) {
    throw new Error('chat is required');
  }
  return chat.id;
}
