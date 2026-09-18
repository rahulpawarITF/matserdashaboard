import { Request, Response } from 'express';
import { ServiceService } from '../services/service.service';

export class ServiceController {
  static async getServices(_req: Request, res: Response) {
    const services = await ServiceService.getServices();
    res.status(200).json({ success: true, data: services });
  }

  static async createService(req: Request, res: Response) {
    const service = await ServiceService.createService(req.body);
    res.status(201).json({ success: true, data: service });
  }

  static async getService(req: Request, res: Response) {
    const service = await ServiceService.getServiceById(req.params.id);
    res.status(200).json({ success: true, data: service });
  }

  static async updateService(req: Request, res: Response) {
    const service = await ServiceService.updateService(req.params.id, req.body);
    res.status(200).json({ success: true, data: service });
  }

  static async deleteService(req: Request, res: Response) {
    await ServiceService.deleteService(req.params.id);
    res.status(200).json({ success: true, message: 'Service deleted' });
  }

  static async triggerManualCheck(req: Request, res: Response) {
    const result = await ServiceService.triggerManualCheck(req.params.id);
    res.status(200).json({ success: true, message: 'Check completed', data: result });
  }

  static async getServiceResults(req: Request, res: Response) {
    const results = await ServiceService.getServiceResults(req.params.id);
    res.status(200).json({ success: true, data: results });
  }
}
