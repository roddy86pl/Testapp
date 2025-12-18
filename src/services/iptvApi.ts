/**
 * IPTV API Service
 * Handles communication with IPTV backend server
 */

export interface UserInfo {
  username: string;
  password: string;
  message: string;
  auth: number;
  status: string;
  exp_date: string;
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
}

export interface LiveCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface LiveChannel {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface VodCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface VodMovie {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface SeriesCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface SeriesInfo {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  release_date: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

export interface Episode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info: {
    movie_image: string;
    plot: string;
    duration: string;
    rating: string;
  };
  custom_sid: string;
  added: string;
  season: number;
}

/**
 * IPTV API Client
 */
export class IPTVApi {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(serverUrl: string, username: string, password: string) {
    this.baseUrl = serverUrl.replace(/\/$/, ""); // Remove trailing slash
    this.username = username;
    this.password = password;
  }

  /**
   * Build API URL with authentication parameters
   */
  private buildUrl(
    action: string,
    additionalParams: Record<string, string> = {}
  ): string {
    const params = new URLSearchParams({
      username: this.username,
      password: this.password,
      ...additionalParams,
    });
    return `${
      this.baseUrl
    }/player_api.php?${params.toString()}&action=${action}`;
  }

  /**
   * Authenticate user and get account info
   */
  async authenticate(): Promise<UserInfo> {
    const url = this.buildUrl("");
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.user_info || data.user_info.auth !== 1) {
      throw new Error("Invalid credentials");
    }

    return data.user_info;
  }

  /**
   * Get live TV categories
   */
  async getLiveCategories(): Promise<LiveCategory[]> {
    const url = this.buildUrl("get_live_categories");
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch live categories: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get live TV streams
   */
  async getLiveStreams(categoryId?: string): Promise<LiveChannel[]> {
    const params = categoryId ? { category_id: categoryId } : {};
    const url = this.buildUrl("get_live_streams", params);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch live streams: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get VOD categories
   */
  async getVodCategories(): Promise<VodCategory[]> {
    const url = this.buildUrl("get_vod_categories");
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch VOD categories: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get VOD streams (movies)
   */
  async getVodStreams(categoryId?: string): Promise<VodMovie[]> {
    const params = categoryId ? { category_id: categoryId } : {};
    const url = this.buildUrl("get_vod_streams", params);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch VOD streams: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get series categories
   */
  async getSeriesCategories(): Promise<SeriesCategory[]> {
    const url = this.buildUrl("get_series_categories");
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch series categories: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get series list
   */
  async getSeries(categoryId?: string): Promise<SeriesInfo[]> {
    const params = categoryId ? { category_id: categoryId } : {};
    const url = this.buildUrl("get_series", params);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch series: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get series info with episodes
   */
  async getSeriesInfo(
    seriesId: number
  ): Promise<{ info: SeriesInfo; episodes: Record<string, Episode[]> }> {
    const url = this.buildUrl("get_series_info", {
      series_id: seriesId.toString(),
    });
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch series info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get live stream URL
   */
  getLiveStreamUrl(streamId: number, extension: string = "ts"): string {
    return `${this.baseUrl}/live/${this.username}/${this.password}/${streamId}.${extension}`;
  }

  /**
   * Get VOD stream URL
   */
  getVodStreamUrl(streamId: number, extension: string = "mp4"): string {
    return `${this.baseUrl}/movie/${this.username}/${this.password}/${streamId}.${extension}`;
  }

  /**
   * Get series episode stream URL
   */
  getSeriesStreamUrl(episodeId: string, extension: string = "mp4"): string {
    return `${this.baseUrl}/series/${this.username}/${this.password}/${episodeId}.${extension}`;
  }
}

/**
 * Device code authentication API
 */
export class DeviceCodeApi {
  private apiUrl: string;

  constructor(apiUrl: string = "https://api.polfun.de/api/device.php") {
    this.apiUrl = apiUrl;
  }

  /**
   * Check device code and get credentials
   */
  async checkDeviceCode(deviceCode: string): Promise<{
    success: boolean;
    serverUrl?: string;
    username?: string;
    password?: string;
    message?: string;
  }> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceCode }),
    });

    if (!response.ok) {
      throw new Error(`Device code check failed: ${response.statusText}`);
    }

    return response.json();
  }
}
