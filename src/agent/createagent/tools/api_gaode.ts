import request from "@/lib/config/axios";
import { tool } from '@langchain/core/tools';
import { logger } from '@/agent/utils/loggerHandler';
/**
 * 城市名称映射（中文 -> 英文）
 */
const CITY_EN_MAP: Record<string, string> = {
  '北京': 'Beijing',
  '北京市': 'Beijing',
  '上海': 'Shanghai',
  '上海市': 'Shanghai',
  '广州': 'Guangzhou',
  '广州市': 'Guangzhou',
  '深圳': 'Shenzhen',
  '深圳市': 'Shenzhen',
  '杭州': 'Hangzhou',
  '杭州市': 'Hangzhou',
  '南京': 'Nanjing',
  '南京市': 'Nanjing',
  '成都': 'Chengdu',
  '成都市': 'Chengdu',
  '重庆': 'Chongqing',
  '重庆市': 'Chongqing',
  '武汉': 'Wuhan',
  '武汉市': 'Wuhan',
  '西安': "Xi'an",
  '西安市': "Xi'an",
};

export interface CityInfo {
  ip?: string;
  province?: string;
  city?: string;
  adcode?: string;
  rectangle?: string;
  location_id?: string;
  city_region?: string;
  city_en?: string;
}
export interface WeatherInfo {
  province: string;
  city: string;
  adcode: string;
  weather: string;
  temperature: string;
  winddirection: string;
  windpower: string;
  humidity: string;
  reporttime: string;
  temperature_float: string;
  humidity_float: string;
}
export interface WeatherResponse {
  status: string;
  count: string;
  info: string;
  infocode: string;
  lives: WeatherInfo[];
}

/**
 * 获取用户所在城市信息
 */
export async function apiCity(): Promise<CityInfo> {
  const key = '1c16ea4364a480107d9f8f5f66fc5a15';
  const data: CityInfo = {};
  try {
    // 获取 IP 地址
    const ipResponse = await request.get({url: 'https://api.ip.sb/ip'});
    const ip = ipResponse.data.trim();
    data.ip = ip;
    // 调用高德地图 IP 定位 API
    const gaodeUrl = `https://restapi.amap.com/v3/ip?ip=${ip}&key=${key}&output=json`;
    const gaodeResponse = await request.get({url: gaodeUrl});
    const gaodeData = gaodeResponse.data;
    data.province = gaodeData.province;
    data.city = gaodeData.city;
    data.adcode = gaodeData.adcode;
    data.rectangle = gaodeData.rectangle;
    // 设置英文名称
    data.city_en = CITY_EN_MAP[data.city || ''] || data.city || '';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.warn(`定位失败：${errorMessage}`);

    // 设置默认值
    data.city = '北京';
    data.city_en = 'Beijing';
  }
  return data;
}

/**
 * 获取指定城市的天气信息
 * @param cityCode - 城市编码（adcode），默认为北京东城区 110101
 */
export async function apiWeather(cityCode: string = '110101'): Promise<WeatherInfo | null> {
  const key = '1c16ea4364a480107d9f8f5f66fc5a15';
  try {
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=${cityCode}&key=${key}`;
    const response = await request.get({ url });
    const data: WeatherResponse = response.data;
    if (data.status === '1' && data.lives && data.lives.length > 0) {
      return data.lives[0];
    } else {
      logger.warn(`获取天气失败：${data.info || '未知错误'}`);
      return null;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.warn(`获取天气失败：${errorMessage}`);
    return null;
  }
}

// 测试入口
  (async () => {
    const cityInfo = await apiCity();
    console.log('中文城市：', cityInfo.city);
    console.log('英文城市：', cityInfo.city_en);
    console.log('完整信息：', JSON.stringify(cityInfo, null, 2));
  })();
