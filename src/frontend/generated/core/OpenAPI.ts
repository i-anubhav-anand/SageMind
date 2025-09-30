// Define the OpenAPIConfig type directly here to avoid circular dependencies
export type OpenAPIConfig = {
  BASE: string
  CREDENTIALS: "include" | "omit" | "same-origin"
  ENCODE_PATH?: ((path: string) => string) | undefined
  HEADERS?: Record<string, string> | (() => Promise<Record<string, string>>) | undefined
  PASSWORD?: string | (() => Promise<string>) | undefined
  TOKEN?: string | (() => Promise<string>) | undefined
  USERNAME?: string | (() => Promise<string>) | undefined
  VERSION: string
  WITH_CREDENTIALS: boolean
  interceptors: {
    request: {
      _fns: Array<(value: RequestInit) => RequestInit | Promise<RequestInit>>
      use: (fn: (value: RequestInit) => RequestInit | Promise<RequestInit>) => void
      eject: (fn: (value: RequestInit) => RequestInit | Promise<RequestInit>) => void
    }
    response: {
      _fns: Array<(value: Response) => Response | Promise<Response>>
      use: (fn: (value: Response) => Response | Promise<Response>) => void
      eject: (fn: (value: Response) => Response | Promise<Response>) => void
    }
  }
}

export const OpenAPI: OpenAPIConfig = {
  BASE: "",
  CREDENTIALS: "include",
  ENCODE_PATH: undefined,
  HEADERS: undefined,
  PASSWORD: undefined,
  TOKEN: undefined,
  USERNAME: undefined,
  VERSION: "0.1.0",
  WITH_CREDENTIALS: false,
  interceptors: {
    request: {
      _fns: [],
      use: function (fn) {
        this._fns.push(fn)
      },
      eject: function (fn) {
        const index = this._fns.indexOf(fn)
        if (index !== -1) {
          this._fns = [...this._fns.slice(0, index), ...this._fns.slice(index + 1)]
        }
      },
    },
    response: {
      _fns: [],
      use: function (fn) {
        this._fns.push(fn)
      },
      eject: function (fn) {
        const index = this._fns.indexOf(fn)
        if (index !== -1) {
          this._fns = [...this._fns.slice(0, index), ...this._fns.slice(index + 1)]
        }
      },
    },
  },
}

