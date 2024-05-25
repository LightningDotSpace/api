import axios, { AxiosRequestConfig } from 'axios';

export class HttpService {
  async post<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    return (await axios.post(url, data, config)).data;
  }
}
