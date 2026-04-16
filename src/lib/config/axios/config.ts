/**
 * axios全局配置
 * @Author: zhangpi
 */
const defaultbaseURL = `${process.env.NEXT_PUBLIC_AXIOS_API_BASE_URL || 'http://localhost:3000'}${process.env.NEXT_PUBLIC_AXIOS_API_BASE_PATH || '/api/v1'}`

const config: {
  result_code: number | string;
  request_timeout: number;
  defaultbaseURL: string;
} = {
  /**
   * 接口成功返回状态码
   */
  result_code: "200",
  /**
   * 接口请求超时时间
   */
  request_timeout: 60000 * 10,
  /**
   * 默认接口请求类型
   * 可选值: application/x-www-form-urlencoded multipart/form-data
   */
  // api前缀
  defaultbaseURL,
};

export { config };