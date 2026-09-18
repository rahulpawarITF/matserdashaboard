import axios, { AxiosError } from 'axios';
import { Settings } from '../models/Settings.model';

interface HttpCheckOptions {
  url: string;
  expectedStatusCode?: number;
  expectedBodyContains?: string;
  customHeaders?: Record<string, string>;
  timeoutMs?: number;
  degradedThresholdMs?: number;
}

interface HttpCheckResult {
  status: 'up' | 'down' | 'degraded';
  statusCode: number;
  responseTimeMs: number;
  errorMessage?: string;
}

export const performHttpCheck = async (options: HttpCheckOptions): Promise<HttpCheckResult> => {
  const { url, expectedStatusCode = 200, expectedBodyContains, customHeaders = {} } = options;

  let activeTimeout = options.timeoutMs;
  let activeDegradedThreshold = options.degradedThresholdMs;

  if (!activeTimeout || !activeDegradedThreshold) {
    try {
      const activeConfig = await Settings.getActiveConfig();
      if (!activeTimeout) activeTimeout = activeConfig.httpCheckTimeoutMs || 6000;
      if (!activeDegradedThreshold) activeDegradedThreshold = activeConfig.httpDegradedThresholdMs || 4000;
    } catch {
      if (!activeTimeout) activeTimeout = 6000;
      if (!activeDegradedThreshold) activeDegradedThreshold = 4000;
    }
  }

  const start = Date.now();

  let headers: Record<string, string> = {
    'User-Agent': 'MasterDashboard-HealthCheck/2.0 (Smart-Pulse)',
  };

  if (customHeaders instanceof Map) {
    headers = { ...headers, ...Object.fromEntries(customHeaders) };
  } else if (customHeaders && typeof customHeaders === 'object') {
    headers = { ...headers, ...customHeaders };
  }

  try {
    let response: any;
    let usedHead = false;

    // Optimization: If no body string matching is required, try lightweight HTTP HEAD first
    // (Transfers 0 body bytes, saving bandwidth and remote server CPU, exactly like Project check)
    if (!expectedBodyContains) {
      try {
        response = await axios.head(url, {
          headers,
          timeout: activeTimeout,
          maxRedirects: 5,
          validateStatus: () => true,
        });
        usedHead = true;
      } catch {
        // Fallback to GET if server disallows HEAD (e.g. 405 Method Not Allowed)
        usedHead = false;
      }
    }

    if (!usedHead) {
      response = await axios.get(url, {
        headers: {
          ...headers,
          ...(!expectedBodyContains ? { Range: 'bytes=0-1024' } : {}),
        },
        timeout: activeTimeout,
        maxRedirects: 3,
        validateStatus: () => true,
      });
    }

    const responseTimeMs = Date.now() - start;
    const statusCode = response.status;
    let status: 'up' | 'degraded' | 'down' = 'down';
    let errorMessage: string | undefined;

    const expectedStatus = expectedStatusCode || 200;

    // Same logic as Project checks:
    // 1. Success condition: statusCode matches expected status OR standard 2xx/3xx redirect
    if (statusCode === expectedStatus || (statusCode >= 200 && statusCode < 400)) {
      status = responseTimeMs > activeDegradedThreshold ? 'degraded' : 'up';

      // Verify body text if expectedBodyContains is specified
      if (expectedBodyContains && response.data) {
        const rawBody =
          typeof response.data === 'string'
            ? response.data
            : typeof response.data === 'object' && response.data !== null
            ? JSON.stringify(response.data)
            : String(response.data ?? '');

        const normalizedRaw = rawBody.replace(/\s+/g, '');
        const normalizedExpected = expectedBodyContains.replace(/\s+/g, '');

        if (!rawBody.includes(expectedBodyContains) && !normalizedRaw.includes(normalizedExpected)) {
          status = 'degraded';
          errorMessage = `Body did not match expected "${expectedBodyContains}"`;
        }
      }

      // WhatsApp bot session validation: if disconnected, mark down
      if (typeof response.data === 'object' && response.data !== null) {
        if (response.data.connected === false || response.data.data?.connected === false) {
          status = 'down';
          errorMessage = 'WhatsApp bot session is disconnected';
        }
      } else if (typeof response.data === 'string') {
        if (response.data.includes('"connected":false') || response.data.includes('"connected": false')) {
          status = 'down';
          errorMessage = 'WhatsApp bot session is disconnected';
        }
      }
    } else if (statusCode >= 400 && statusCode < 500) {
      // Client Error (4xx): Endpoint is responsive, but returned client status
      status = 'degraded';
      errorMessage = `HTTP ${statusCode}${response.statusText ? ` (${response.statusText})` : ''}`;
    } else {
      // Server Error (5xx): Server crash or gateway failure -> Down
      status = 'down';
      errorMessage = `HTTP ${statusCode}${response.statusText ? ` (${response.statusText})` : ' Server Error'}`;
    }

    return {
      status,
      statusCode,
      responseTimeMs,
      errorMessage: errorMessage?.trim() || undefined,
    };
  } catch (error: any) {
    const responseTimeMs = Date.now() - start;
    let errorMessage = 'Connection failed';
    let statusCode = 0;

    if (error instanceof AxiosError || error?.isAxiosError) {
      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        errorMessage = `Connection timed out after ${activeTimeout}ms`;
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused (server down or port unreachable)';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Domain resolution failed (DNS ENOTFOUND)';
      } else if (error.response) {
        statusCode = error.response.status;
        errorMessage = `HTTP ${statusCode}: ${error.response.statusText || error.message}`;
      } else {
        errorMessage = error.message || 'Connection failed';
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return {
      status: 'down',
      statusCode,
      responseTimeMs,
      errorMessage,
    };
  }
};
