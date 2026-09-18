import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';

export class ProjectController {
  static async getProjects(req: Request, res: Response) {
    const result = await ProjectService.getProjects(req.query);
    res.status(200).json({ success: true, data: result });
  }

  static async createProject(req: Request, res: Response) {
    const project = await ProjectService.createProject(req.body);
    res.status(201).json({ success: true, data: project });
  }

  static async getProject(req: Request, res: Response) {
    const { Project } = await import('../models/Project.model');
    const project = await Project.findById(req.params.id)
      .populate('linkedServiceIds', 'name provider type currentStatus statusEndpoint lastCheckedAt lastStatusCode lastErrorMessage lastResponseTimeMs');
    if (!project) return res.status(404).json({ success: false, error: { message: 'Not found' } });

    const plain: any = project.toObject();
    try {
      const { registeredUsersService } = await import('../services/registeredUsers.service');
      const regInfo = await registeredUsersService.getUserCountForProject(project.name);
      plain.userCount = regInfo.userCount;
      plain.adminCount = regInfo.adminCount;
      plain.userSource = regInfo.userSource;
      plain.adminSource = regInfo.adminSource;
      plain.registeredUsers = regInfo.totalCount;
      plain.registeredUserSource = regInfo.collection;
      plain.activeUsersToday = regInfo.activeToday || 0;
      plain.activeUsersWeek = regInfo.activeWeek || 0;
      plain.todayVisitors = regInfo.activeToday || 0;
      plain.weekVisitors = regInfo.activeWeek || 0;
    } catch {
      plain.userCount = 0;
      plain.adminCount = 0;
      plain.userSource = 'production-db';
      plain.adminSource = 'production-db';
      plain.registeredUsers = 0;
      plain.registeredUserSource = 'production-db';
      plain.activeUsersToday = 0;
      plain.activeUsersWeek = 0;
      plain.todayVisitors = 0;
      plain.weekVisitors = 0;
    }

    plain.linkedServices = plain.linkedServiceIds;

    res.status(200).json({ success: true, data: plain });
  }

  static async updateProject(req: Request, res: Response) {
    const project = await ProjectService.updateProject(req.params.id, req.body);
    res.status(200).json({ success: true, data: project });
  }

  static async deleteProject(req: Request, res: Response) {
    await ProjectService.deleteProject(req.params.id);
    res.status(200).json({ success: true, message: 'Project deleted' });
  }

  static async triggerManualCheck(req: Request, res: Response) {
    await ProjectService.triggerManualCheck(req.params.id);
    res.status(200).json({ success: true, message: 'Checks queued' });
  }

  static async getProjectResults(req: Request, res: Response) {
    const { page, limit, urlLabel } = req.query;
    const results = await ProjectService.getProjectResults(
      req.params.id,
      Number(page) || 1,
      Number(limit) || 50,
      urlLabel as string
    );
    res.status(200).json({ success: true, data: results });
  }

  static async getProjectUptime(req: Request, res: Response) {
    const uptime = await ProjectService.getProjectUptime(req.params.id);
    res.status(200).json({ success: true, data: uptime });
  }

  static async getProjectIncidents(req: Request, res: Response) {
    const incidents = await ProjectService.getProjectIncidents(req.params.id);
    res.status(200).json({ success: true, data: incidents });
  }

  static async liveStatusAudit(_req: Request, res: Response) {
    const auditReport = await ProjectService.runLiveDomainAudit();
    res.status(200).json({ success: true, data: auditReport });
  }
}
