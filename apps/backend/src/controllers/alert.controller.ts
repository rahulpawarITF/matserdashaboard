import { Request, Response } from 'express';
import { AlertService } from '../services/alert.service';

export class AlertController {
  static async getRules(_req: Request, res: Response) {
    const rules = await AlertService.getRules();
    res.status(200).json({ success: true, data: rules });
  }

  static async createRule(req: Request, res: Response) {
    const rule = await AlertService.createRule(req.body);
    res.status(201).json({ success: true, data: rule });
  }

  static async updateRule(req: Request, res: Response) {
    const rule = await AlertService.updateRule(req.params.id, req.body);
    res.status(200).json({ success: true, data: rule });
  }

  static async deleteRule(req: Request, res: Response) {
    await AlertService.deleteRule(req.params.id);
    res.status(200).json({ success: true, message: 'Rule deleted' });
  }

  static async muteRule(req: Request, res: Response) {
    const rule = await AlertService.muteRule(req.params.id, req.body.muteUntil);
    res.status(200).json({ success: true, data: rule });
  }

  static async getRuleLogs(req: Request, res: Response) {
    const logs = await AlertService.getRuleLogs(req.params.id);
    res.status(200).json({ success: true, data: logs });
  }
}
