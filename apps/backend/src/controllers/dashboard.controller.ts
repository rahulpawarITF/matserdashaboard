import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  static async getSummary(_req: Request, res: Response) {
    const summary = await DashboardService.getSummary();
    res.status(200).json({ success: true, data: summary });
  }

  static async getRecentIncidents(_req: Request, res: Response) {
    const incidents = await DashboardService.getRecentIncidents();
    res.status(200).json({ success: true, data: incidents });
  }

  static async getRecentChecks(req: Request, res: Response) {
    const { timeframe, projectId, status, page, limit } = req.query;
    const data = await DashboardService.getRecentChecks({
      timeframe: timeframe as any,
      projectId: projectId as string,
      status: status as any,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.status(200).json({ success: true, data });
  }

  static async getOutageCorrelation(req: Request, res: Response) {
    const { timeframe, windowMinutes } = req.query;
    const data = await DashboardService.getOutageCorrelation({
      timeframe: timeframe as any,
      windowMinutes: windowMinutes ? Number(windowMinutes) : 5,
    });
    res.status(200).json({ success: true, data });
  }
}
