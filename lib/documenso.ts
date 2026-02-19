const DOCUMENSO_API_BASE_URL =
  process.env.DOCUMENSO_API_BASE_URL || 'https://app.documenso.com/api/v1';
const DOCUMENSO_API_KEY = process.env.DOCUMENSO_API_KEY || '';

type DocumensoServiceConfig = {
  apiKey?: string;
  baseUrl?: string;
};

export class DocumensoService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor({ apiKey = DOCUMENSO_API_KEY, baseUrl = DOCUMENSO_API_BASE_URL }: DocumensoServiceConfig = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private buildAuthHeaders(): HeadersInit {
    if (!this.apiKey) {
      return {};
    }

    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: HeadersInit = {
      ...this.buildAuthHeaders(),
      ...(init.headers || {}),
    };

    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
  }
}

export const createDocumensoService = (config: DocumensoServiceConfig = {}): DocumensoService =>
  new DocumensoService(config);

export default DocumensoService;
