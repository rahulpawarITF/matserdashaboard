export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: 'desktop' | 'mobile' | 'tablet';
}

export function parseUserAgent(uaString?: string, screenWidth?: number): ParsedUserAgent {
  if (!uaString) {
    return { browser: 'Other', os: 'Other', device: 'desktop' };
  }

  // 1. Detect Device
  let device: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (
    /ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk/i.test(
      uaString
    )
  ) {
    device = 'tablet';
  } else if (
    /mobi|iphone|ipod|phone|android.*mobile|blackberry|opera mini|iemobile|wpdesktop/i.test(
      uaString
    )
  ) {
    device = 'mobile';
  } else if (screenWidth && screenWidth < 768) {
    device = 'mobile';
  } else if (screenWidth && screenWidth < 1024) {
    device = 'tablet';
  }

  // 2. Detect Browser
  let browser = 'Other';
  if (/edg([ea]|ios)?\//i.test(uaString)) {
    browser = 'Edge';
  } else if (/opr\/|opera/i.test(uaString)) {
    browser = 'Opera';
  } else if (/samsungbrowser/i.test(uaString)) {
    browser = 'Samsung Internet';
  } else if (/chrome|crios/i.test(uaString) && !/edg/i.test(uaString)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/i.test(uaString)) {
    browser = 'Firefox';
  } else if (/safari/i.test(uaString) && !/chrome|crios|android/i.test(uaString)) {
    browser = 'Safari';
  } else if (/msie|trident/i.test(uaString)) {
    browser = 'Internet Explorer';
  }

  // 3. Detect OS
  let os = 'Other';
  if (/windows/i.test(uaString)) {
    os = 'Windows';
  } else if (/android/i.test(uaString)) {
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(uaString)) {
    os = 'iOS';
  } else if (/macintosh|mac os x/i.test(uaString)) {
    os = 'macOS';
  } else if (/linux/i.test(uaString)) {
    os = 'Linux';
  } else if (/cros/i.test(uaString)) {
    os = 'ChromeOS';
  }

  return { browser, os, device };
}

export function cleanReferrer(refUrl?: string): string {
  if (!refUrl || refUrl === '' || refUrl === 'direct') {
    return 'direct';
  }

  try {
    const url = new URL(refUrl);
    let host = url.hostname.replace(/^www\./, '');
    if (host.includes('google.')) return 'google.com';
    if (host.includes('bing.')) return 'bing.com';
    if (host.includes('yahoo.')) return 'yahoo.com';
    if (host.includes('facebook.') || host.includes('fb.me')) return 'facebook.com';
    if (host.includes('instagram.')) return 'instagram.com';
    if (host.includes('whatsapp.') || host.includes('api.whatsapp.com')) return 'whatsapp';
    if (host.includes('twitter.') || host.includes('t.co') || host.includes('x.com')) return 'x.com';
    if (host.includes('linkedin.')) return 'linkedin.com';
    if (host.includes('youtube.') || host.includes('youtu.be')) return 'youtube.com';
    return host;
  } catch {
    return refUrl.slice(0, 50);
  }
}
