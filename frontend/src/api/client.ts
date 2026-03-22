const TOKEN_KEY = 'labelflow_token';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private getHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...extra,
    };

    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    if (contentType?.includes('application/octet-stream')) {
      const blob = await response.blob();
      const jobId = response.headers.get('X-Job-Id') || response.headers.get('X-Job-Ids');
      return { blob, jobId } as unknown as T;
    }

    return response.json();
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(this.baseUrl + path, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: any, extraHeaders: Record<string, string> = {}): Promise<T> {
    const isBinary = body instanceof Blob || body instanceof ArrayBuffer;
    const headers = this.getHeaders(
      isBinary ? extraHeaders : { 'Content-Type': 'application/json', ...extraHeaders }
    );

    const response = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers,
      body: isBinary ? body : JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, body?: any, extraHeaders: Record<string, string> = {}): Promise<T> {
    const response = await fetch(this.baseUrl + path, {
      method: 'PUT',
      headers: this.getHeaders({ 'Content-Type': 'application/json', ...extraHeaders }),
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(this.baseUrl + path, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  setToken(token: string) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }
}

export const apiClient = new ApiClient();
