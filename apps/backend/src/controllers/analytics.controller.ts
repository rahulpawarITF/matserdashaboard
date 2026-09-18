import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { productionSyncService } from '../services/productionSync.service';
import { Project } from '../models/Project.model';
import { logger } from '../config/logger';

// 1x1 transparent GIF buffer
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export class AnalyticsController {
  /**
   * Serve the ultra-lightweight client-side tracking script
   */
  serveScript(_req: Request, res: Response) {
    const scriptCode = `(function(){'use strict';var s=document.currentScript||(function(){var list=document.getElementsByTagName('script');for(var i=0;i<list.length;i++){if(list[i].src&&list[i].src.indexOf('analytics')!==-1)return list[i];}return null;})();var p=s?s.getAttribute('data-project-id'):null;var ch=s?s.getAttribute('data-host'):null;var sh=(s&&s.src)?(new URL(s.src).origin):'';var host=ch||sh||window.location.origin;var ep=host+'/api/analytics/collect';var lp='';function hit(){var cp=window.location.pathname+window.location.search;if(cp===lp)return;lp=cp;var d={projectId:p||undefined,domain:window.location.hostname,path:cp,referrer:document.referrer||'direct',screenWidth:window.screen?window.screen.width:0,screenHeight:window.screen?window.screen.height:0};var payload=JSON.stringify(d);if(navigator.sendBeacon){navigator.sendBeacon(ep,new Blob([payload],{type:'application/json'}));}else{var x=new XMLHttpRequest();x.open('POST',ep,true);x.setRequestHeader('Content-Type','application/json');x.send(payload);}try{console.log('[MasterDashboard Analytics] Hit recorded for '+window.location.hostname+cp);}catch(e){}}if(document.readyState==='complete'||document.readyState==='interactive'){hit();}else{window.addEventListener('DOMContentLoaded',hit);}var orig=history.pushState;if(orig){history.pushState=function(){orig.apply(this,arguments);setTimeout(hit,80);};}window.addEventListener('popstate',function(){setTimeout(hit,80);});})();`;

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(scriptCode);
  }

  /**
   * 1x1 Transparent Tracking Pixel (fallback for no-JS, email, or simple <img> embeds)
   */
  async servePixel(req: Request, res: Response) {
    try {
      let projectId = (req.query.projectId as string) || undefined;
      let domain = (req.query.domain as string) || undefined;
      let path = (req.query.path as string) || '/';
      let referrer = (req.query.referrer as string) || req.headers.referer;

      if (!domain && req.headers.referer) {
        try {
          domain = new URL(req.headers.referer).hostname;
        } catch {
          // ignore
        }
      }

      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';
      const userAgent = req.headers['user-agent'] || '';

      await analyticsService.recordPageView({
        projectId,
        domain,
        path: String(path),
        referrer: referrer ? String(referrer) : 'direct',
        userAgent,
        ip,
      });
    } catch (err: any) {
      logger.warn('Pixel tracking warning:', err.message);
    }

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(TRANSPARENT_GIF_BUFFER);
  }

  /**
   * Ingest a tracking beacon
   */
  async collect(req: Request, res: Response) {
    try {
      let projectId = req.body?.projectId || req.query?.projectId;
      let domain = req.body?.domain || req.query?.domain;
      let path = req.body?.path || req.query?.path || '/';
      let referrer = req.body?.referrer || req.query?.referrer || req.headers.referer;
      let screenWidth = Number(req.body?.screenWidth || req.query?.sw) || undefined;
      let screenHeight = Number(req.body?.screenHeight || req.query?.sh) || undefined;

      // Parse raw string body if needed
      if (!projectId && !domain && typeof req.body === 'string') {
        try {
          const parsed = JSON.parse(req.body);
          projectId = parsed.projectId;
          domain = parsed.domain;
          path = parsed.path || path;
          referrer = parsed.referrer || referrer;
          screenWidth = parsed.screenWidth || screenWidth;
          screenHeight = parsed.screenHeight || screenHeight;
        } catch {
          // ignore
        }
      }

      // Auto-extract domain from Origin or Referer if missing
      if (!domain && req.headers.origin) {
        try {
          domain = new URL(req.headers.origin as string).hostname;
        } catch {
          // ignore
        }
      }
      if (!domain && req.headers.referer) {
        try {
          domain = new URL(req.headers.referer as string).hostname;
        } catch {
          // ignore
        }
      }

      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';
      const userAgent = req.headers['user-agent'] || '';

      await analyticsService.recordPageView({
        projectId: projectId ? String(projectId) : undefined,
        domain: domain ? String(domain) : undefined,
        path: String(path),
        referrer: referrer ? String(referrer) : 'direct',
        userAgent,
        ip,
        screenWidth,
        screenHeight,
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(204).end();
    } catch (err: any) {
      logger.warn('Error collecting analytics beacon:', err.message);
      return res.status(400).json({ error: err.message || 'Collection failed' });
    }
  }

  /**
   * Get analytics for a specific project
   */
  async getProjectAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const range = (req.query.range as '24h' | '7d' | '30d') || '24h';

      const data = await analyticsService.getProjectAnalytics(id, range);
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch project analytics' });
    }
  }

  /**
   * Get real-time active users for a project
   */
  async getProjectRealtime(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const count = await analyticsService.getRealtimeActive(id);
      return res.json({ success: true, data: { realtimeActive: count } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch realtime count' });
    }
  }

  /**
   * Live Visit Gateway & Redirect
   * Scanning QR Code or clicking mobile link logs the real device hit and redirects to live domain
   */
  async visitAndRedirect(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).send('Project not found for live tracking redirect.');
      }

      const targetUrl = project.urls?.[0]?.url || project.documentationUrl || 'https://itfuturz.in';
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || '';
      const screenWidth = req.query.sw ? Number(req.query.sw) : undefined;

      // Asynchronously record real pageview
      analyticsService
        .recordPageView({
          projectId: String(project._id),
          domain: new URL(targetUrl).hostname,
          path: '/',
          referrer: req.headers.referer ? String(req.headers.referer) : 'mobile-qr-redirect',
          userAgent,
          ip,
          screenWidth,
        })
        .catch((err) => {
          logger.warn(`Error logging visit for project ${project.name}:`, err.message);
        });

      // 302 redirect directly to live project URL
      return res.redirect(302, targetUrl);
    } catch (err: any) {
      logger.error('Error in visitAndRedirect:', err);
      return res.status(500).send('Redirection error: ' + err.message);
    }
  }

  /**
   * Get global analytics across all projects
   */
  async getGlobalAnalytics(_req: Request, res: Response) {
    try {
      const data = await analyticsService.getGlobalAnalytics();
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch global analytics' });
    }
  }

  /**
   * Trigger on-demand sync with real production databases (147.79.70.177)
   */
  async syncProduction(req: Request, res: Response) {
    try {
      const daysBack = req.body?.daysBack ? Number(req.body.daysBack) : 30;
      const result = await productionSyncService.syncAll(daysBack);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Sync failed' });
    }
  }
}

export const analyticsController = new AnalyticsController();
