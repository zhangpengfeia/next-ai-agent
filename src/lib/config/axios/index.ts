import type { AxiosRequestConfig } from "axios";
import service from "./service";
import { config } from "./config";

const request = (option: AxiosRequestConfig & { headersType?: string }) => {
  const { url, method, params, data, headersType, timeout, baseURL, responseType, signal, headers } = option;

  return service({
    url: url,
    method,
    params,
    data,
    timeout: timeout ?? config.request_timeout,
    baseURL: baseURL ?? config.defaultbaseURL,
    responseType: responseType,
    signal,
    headers: {
      ...headers,
    }
  });
};

export default {
  get: <T = any>(option: Omit<AxiosRequestConfig, "method">) => {
    return request({ method: "get", ...option }) as unknown as Promise<T>;
  },
  post: <T = any>(option: Omit<AxiosRequestConfig, "method">) => {
    return request({ method: "post", ...option }) as unknown as Promise<T>;
  },
  delete: <T = any>(option: Omit<AxiosRequestConfig, "method">) => {
    return request({ method: "delete", ...option }) as unknown as Promise<T>;
  },
  put: <T = any>(option: Omit<AxiosRequestConfig, "method">) => {
    return request({ method: "put", ...option }) as unknown as Promise<T>;
  },
};