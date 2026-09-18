export type Status = 'up' | 'down' | 'degraded' | 'unknown';
export type Environment = 'production' | 'staging' | 'development';
export type Role = 'owner' | 'admin' | 'viewer';
export type ServiceType = 'whatsapp' | 'payment' | 'sms' | 'email' | 'custom';

export interface ProjectUrl {
  label: string;
  url: string;
  isHealthCheckTarget: boolean;
  expectedStatusCode: number;
  expectedBodyContains?: string;
  customHeaders?: Record<string, string>;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  urls: ProjectUrl[];
  environment: Environment;
  checkIntervalMinutes: number;
  linkedServiceIds: string[];
  linkedServices?: Service[];  // populated
  ownerNotes?: string;
  documentationUrl?: string;
  healthCheckUrl?: string;
  ga4PropertyId?: string;
  latestResponseTimeMs?: number;
  registeredUsers?: number;
  registeredUserSource?: string;
  userCount?: number;
  adminCount?: number;
  userSource?: string;
  adminSource?: string;
  todayVisitors?: number;
  todayViews?: number;
  weekVisitors?: number;
  weekViews?: number;
  activeUsersToday?: number;
  activeUsersWeek?: number;
  analyticsSource?: 'ga4' | 'builtin' | 'database';
  isActive: boolean;
  currentStatus: Status;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  _id: string;
  name: string;
  provider: string;
  type: ServiceType;
  checkMethod: 'http' | 'custom_api' | 'webhook';
  statusEndpoint?: string;
  expectedStatusCode?: number;
  expectedBodyContains?: string;
  customHeaders?: Record<string, string>;
  credentials?: Record<string, any>; // decrypted, only shown to owner
  linkedProjectIds: string[];
  linkedProjects?: any[];
  checkIntervalMinutes: number;
  currentStatus: Status;
  lastCheckedAt?: string;
  lastStatusCode?: number;
  lastErrorMessage?: string;
  lastResponseTimeMs?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HealthCheckResult {
  _id: string;
  targetId: string;
  targetType: 'project' | 'service';
  urlLabel?: string;
  status: Status;
  statusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  checkedAt: string;
}

export interface Incident {
  _id: string;
  targetId: string;
  targetType: 'project' | 'service';
  urlLabel?: string;
  startedAt: string;
  resolvedAt?: string;
  severity: 'warning' | 'critical';
  summary: string;
  isResolved: boolean;
  timeline: { at: string; status: string; message: string }[];
}

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface DashboardSummary {
  totalProjects: number;
  healthyProjects?: number;
  issuesProjects?: number;
  servicesStatus?: { total: number; healthy: number; issues: number };
  totalUsers?: number;
  totalAdmins?: number;
  totalRegisteredUsers?: number;
  todayTotalVisitors?: number;
  todayTotalViews?: number;
  weekTotalVisitors?: number;
  weekTotalViews?: number;
  upProjects: number;
  downProjects: number;
  degradedProjects: number;
  unknownProjects: number;
  totalServices: number;
  upServices: number;
  downServices: number;
  recentIncidents: Incident[];
  projects?: { total: number; up: number; down: number; degraded: number };
  services?: { total: number; up: number; down: number };
}

export interface UptimeStats {
  h24: number;
  d7: number;
  d30: number;
  perUrl: Record<string, { h24: number; d7: number; d30: number }>;
}

export interface SystemSettings {
  // Monitoring & Pulse
  defaultCheckIntervalMinutes: number;
  heartbeatIntervalSeconds?: number;
  heartbeatLiveIntervalSeconds?: number;
  httpCheckTimeoutMs?: number;
  httpDegradedThresholdMs?: number;
  manualCheckTimeoutMs?: number;

  // Data Lifecycle & Retention
  dataRetentionDays: number;
  auditLogRetentionDays?: number;

  // Production DB & Synchronization
  productionSyncIntervalSeconds?: number;
  prodDbTimeoutMs?: number;
  registeredUsersCacheTtlSeconds?: number;

  // Realtime Analytics & Polling
  activeVisitorWindowMinutes?: number;
  dashboardStatsCacheSeconds?: number;
  dashboardPollingIntervalSeconds?: number;

  enableSwagger?: boolean;
}

export interface ProjectAnalytics {
  projectId: string;
  range: '24h' | '7d' | '30d';
  realtimeActive: number;
  totalViews: number;
  uniqueVisitors: number;
  pagesPerVisit: number;
  timeline: {
    time: string;
    views: number;
    uniqueVisitors: number;
  }[];
  topPaths: {
    path: string;
    views: number;
  }[];
  topReferrers: {
    referrer: string;
    views: number;
  }[];
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  browsers: {
    name: string;
    count: number;
  }[];
  os: {
    name: string;
    count: number;
  }[];
  // Period-based user metrics (DAU, WAU, MAU)
  dailyUsers?: number;
  dailyViews?: number;
  weeklyUsers?: number;
  weeklyViews?: number;
  monthlyUsers?: number;
  monthlyViews?: number;
  dayByDay?: {
    date: string;
    dayName: string;
    views: number;
    uniqueVisitors: number;
    mobileViews: number;
    desktopViews: number;
    mobilePercent: number;
  }[];
}

export interface GlobalAnalytics {
  totalRealtimeActive: number;
  totalViews24h: number;
  totalVisitors24h: number;
  topProjects: {
    projectId: string;
    name: string;
    currentStatus: Status;
    environment: Environment;
    views24h: number;
    activeNow: number;
  }[];
}

export interface RecentCheckItem extends HealthCheckResult {
  targetName?: string;
  environment?: string;
}

export interface RecentChecksResponse {
  results: RecentCheckItem[];
  total: number;
  page: number;
  limit: number;
  timeframe: 'today' | 'yesterday' | '7d' | '15d' | '30d';
  dateRange: { start: string; end: string };
}

export interface ProjectOutageError {
  projectName: string;
  projectId?: string;
  urlLabel: string;
  statusCode: number;
  errorMessage: string;
  causeType?: 'timeout' | '502_bad_gateway' | '500_error' | 'dns_error' | 'other';
  friendlyExplanation?: string;
}

export interface OutageCluster {
  id: string;
  timestamp: number;
  startTime: string;
  resolvedTime: string | null;
  durationSeconds: number;
  projects: string[];
  totalProjects: number;
  isServerWide: boolean;
  severity: 'server_down' | 'multi_service' | 'isolated';
  sampleSummary: string;
  projectErrors?: ProjectOutageError[];
  hour: number;
  dateKey: string;
}

export interface OutageCorrelationResponse {
  summary: {
    totalOutageEvents: number;
    serverWideOutages: number;
    singleAppGlitches: number;
    serverWidePercentage: number;
    peakHour: string;
    peakHourCount: number;
    recurringPatternDetected: boolean;
    recurringPatternDescription: string;
    hostServer: string;
    avgDurationSeconds: number;
    latestOutageTime: string | null;
    latestOutageDuration: number;
    latestAffectedProjects: string[];
    dominantReason: string;
    rootCauseBreakdown: {
      timeoutPercentage: number;
      badGatewayPercentage: number;
      otherPercentage: number;
      timeoutErrors: number;
      badGatewayErrors: number;
      otherErrors: number;
      totalErrors: number;
    };
    topAffectedProjects: { name: string; count: number }[];
  };
  clusters: OutageCluster[];
  hourlyDistribution: Record<string, number>;
  timeframe: string;
  dateRange: { start: string; end: string };
}

