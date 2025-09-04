export interface Chat {
  id: string;
}

export function getChatId(chat?: Chat): string | undefined {
  return chat?.id;
}
