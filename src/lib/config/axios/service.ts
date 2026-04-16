import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { config } from "./config";

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: config.defaultbaseURL,
  timeout: config.request_timeout, // 请求超时时间
});

// 请求拦截器：只抛错，不处理任何逻辑
service.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// 响应拦截器：只抛错，不处理任何逻辑
service.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

export default service;