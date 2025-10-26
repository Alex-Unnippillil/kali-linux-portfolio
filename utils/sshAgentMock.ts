export interface AgentMetadata {
  id: string;
  comment: string;
  fingerprint: string;
  publicKey: string;
  addedAt: number;
}

interface InternalAgentRecord extends AgentMetadata {
  privateKey: string;
}

class SshAgentMock {
  private keys = new Map<string, InternalAgentRecord>();

  async addKey(
    id: string,
    privateKey: string,
    metadata: Pick<AgentMetadata, 'comment' | 'fingerprint' | 'publicKey'>,
  ): Promise<void> {
    this.keys.set(id, {
      id,
      privateKey,
      comment: metadata.comment,
      fingerprint: metadata.fingerprint,
      publicKey: metadata.publicKey,
      addedAt: Date.now(),
    });
  }

  removeKey(id: string): void {
    this.keys.delete(id);
  }

  listKeys(): AgentMetadata[] {
    return Array.from(this.keys.values()).map((record) => ({
      id: record.id,
      comment: record.comment,
      fingerprint: record.fingerprint,
      publicKey: record.publicKey,
      addedAt: record.addedAt,
    }));
  }

  getPrivateKey(id: string): string | undefined {
    return this.keys.get(id)?.privateKey;
  }

  reset(): void {
    this.keys.clear();
  }
}

export const sshAgentMock = new SshAgentMock();
