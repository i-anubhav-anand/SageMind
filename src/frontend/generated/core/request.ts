export type ApiRequestOptions = {
  readonly method: "GET" | "PUT" | "POST" | "DELETE" | "OPTIONS" | "HEAD" | "PATCH"
  readonly url: string
  readonly path?: Record<string, any>
  readonly cookies?: Record<string, any>
  readonly headers?: Record<string, any>
  readonly query?: Record<string, any>
  readonly formData?: Record<string, any>
  readonly body?: any
  readonly mediaType?: string
  readonly responseHeader?: string
  readonly errors?: Record<number, string>
}

export type ApiResult = {
  readonly url: string
  readonly ok: boolean
  readonly status: number
  readonly statusText: string
  readonly body: any
}

export const request = <T>(config: typeof OpenAPI, options: ApiRequestOptions): CancelablePromise<T> => {
  return new CancelablePromise(async (resolve, reject, onCancel) => {
    try {
      // Simplified implementation
      const method = options.method;
      const url = options.url;
      const headers = options.headers;
      const body = options.body;

      const response = await fetch(url, {
        method: method,
        headers: headers as any,
        body: body ? JSON.stringify(body) : undefined,
        credentials: config.CREDENTIALS
      });
      
      const data = await response.json();
      
      const result: ApiResult = {
        url: url,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: data
      };
      
      if (!response.ok) {
        throw new ApiError(options, result, `Error ${response.status}: ${response.statusText}`);
      }
      
      resolve(data as T);
    } catch (e: any) {
      const error = e as Error;
      reject(error);
    }
  });
};

