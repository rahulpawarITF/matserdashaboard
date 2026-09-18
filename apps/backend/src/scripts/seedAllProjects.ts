import { connectDB } from '../config/db';
import { Project } from '../models/Project.model';
import { HealthCheckResult } from '../models/HealthCheckResult.model';
import { performHttpCheck } from '../utils/httpCheck';
import { scheduleTarget } from '../workers/scheduler';
import { logger } from '../config/logger';

interface ProjectSeedDef {
  name: string;
  description: string;
  category: string;
  tags: string[];
  environment: 'production' | 'staging' | 'development';
  checkIntervalMinutes: 1 | 5 | 15 | 30 | 60;
  documentationUrl?: string;
  ownerNotes: string;
  urls: {
    label: string;
    url: string;
    isHealthCheckTarget: boolean;
    expectedStatusCode: number;
    expectedBodyContains?: string;
  }[];
}

const projectsToSeed: ProjectSeedDef[] = [
  {
    name: 'Biz360',
    description: 'All-in-one business connect & digital card management platform.',
    category: 'SaaS',
    tags: ['biz360', 'digitalcard', 'production'],
    environment: 'production',
    checkIntervalMinutes: 5,
    documentationUrl: 'https://connect.digitalcard.co.in/apps',
    ownerNotes: `🔑 Admin Login:
Email: info@itfuturz.com
Password: user@1234

🔑 Editor Login:
Email: rahul.pawar@itfuturz.com
Password: user@1234`,
    urls: [
      {
        label: 'Apps Portal',
        url: 'https://connect.digitalcard.co.in/apps',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
      },
    ],
  },
  {
    name: 'ZZUP',
    description: 'ZZUP business portal and customer application.',
    category: 'SaaS',
    tags: ['zzup', 'production'],
    environment: 'production',
    checkIntervalMinutes: 5,
    documentationUrl: 'https://zzup.itfuturz.in/#/signin',
    ownerNotes: `🔑 Admin Login:
Email: admin@gmail.com
Password: Admin@123`,
    urls: [
      {
        label: 'Sign In Portal',
        url: 'https://zzup.itfuturz.in/#/signin',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
      },
    ],
  },
  {
    name: 'Maestros',
    description: 'Maestros enterprise management and operation portal.',
    category: 'Enterprise',
    tags: ['maestros', 'production'],
    environment: 'production',
    checkIntervalMinutes: 5,
    documentationUrl: 'https://maestros.itfuturz.in/#/login',
    ownerNotes: `🔑 Admin Login:
Email: admin@maestros.dev
Password: 123456`,
    urls: [
      {
        label: 'Login Portal',
        url: 'https://maestros.itfuturz.in/#/login',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
      },
    ],
  },
  {
    name: 'Pictik',
    description: 'Multi-portal photography management & customer photo delivery platform.',
    category: 'Photography Platform',
    tags: ['pictik', 'photography', 'production', 'multi-portal'],
    environment: 'production',
    checkIntervalMinutes: 5,
    documentationUrl: 'https://pictik-app.itfuturz.in/admin/#/login',
    ownerNotes: `🔑 Admin Portal:
URL: https://pictik-app.itfuturz.in/admin/#/login
Email: admin@gmail.com
Password: 123456

🔑 Photographer Portal:
URL: https://pictik-app.itfuturz.in/photographer/#/login
Email: chandanpolai26@gmail.com
Password: 123456

🔑 Customer Portal:
Login URL: https://pictik-app.itfuturz.in/customer/#/login
Dashboard URL: https://pictik-app.itfuturz.in/customer/#/dashboard
Phone: 7567534668 (OTP based login)`,
    urls: [
      {
        label: 'Admin Portal',
        url: 'https://pictik-app.itfuturz.in/admin/#/login',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
      },
      {
        label: 'Photographer Portal',
        url: 'https://pictik-app.itfuturz.in/photographer/#/login',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
      },
      {
        label: 'Customer Login',
        url: 'https://pictik-app.itfuturz.in/customer/#/login',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
      },
      {
        label: 'Customer Dashboard',
        url: 'https://pictik-app.itfuturz.in/customer/#/dashboard',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
      },
    ],
  },
  {
    name: 'Saarthi',
    description: 'Saarthi administration and operations application.',
    category: 'Operations',
    tags: ['saarthi', 'operations', 'production'],
    environment: 'production',
    checkIntervalMinutes: 5,
    documentationUrl: 'https://saarthi.itfuturz.in/adminapp/#/adminapp/adminLogin',
    ownerNotes: `🔑 Admin Login:
Email: admin@gmail.com
Password: 123456`,
    urls: [
      {
        label: 'Admin Login App',
        url: 'https://saarthi.itfuturz.in/adminapp/#/adminapp/adminLogin',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
      },
    ],
  },
  {
    name: 'AI In Action',
    description: 'AI learning and education platform with user and admin portals.',
    category: 'EdTech',
    tags: ['aiinaction', 'learning', 'ai', 'production'],
    environment: 'production',
    checkIntervalMinutes: 5,
    documentationUrl: 'https://learn.aiinaction.co.in/userapp/login',
    ownerNotes: `🔑 User App:
URL: https://learn.aiinaction.co.in/userapp/login
Email: chandanpolai26@gmail.com
Password: 123456

🔑 Admin App:
URL: https://learn.aiinaction.co.in/adminapp/login
Email: aiinaction.in@gmail.com
Password: Aiinaction2026@`,
    urls: [
      {
        label: 'User App Login',
        url: 'https://learn.aiinaction.co.in/userapp/login',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
      },
      {
        label: 'Admin App Login',
        url: 'https://learn.aiinaction.co.in/adminapp/login',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
      },
    ],
  },
];

async function seedAll() {
  await connectDB();
  logger.info('Connected to MongoDB. Seeding projects...');

  for (const def of projectsToSeed) {
    let project = await Project.findOne({ name: def.name });

    if (!project) {
      project = new Project({
        ...def,
        isActive: true,
        currentStatus: 'unknown',
      });
      await project.save();
      logger.info(`Created project: ${project.name} (${project._id})`);
    } else {
      project.description = def.description;
      project.category = def.category;
      project.tags = def.tags;
      project.ownerNotes = def.ownerNotes;
      project.documentationUrl = def.documentationUrl || '';
      project.urls = def.urls as any;
      project.isActive = true;
      await project.save();
      logger.info(`Updated existing project: ${project.name} (${project._id})`);
    }

    // Perform live health check for each endpoint
    let overallStatus: 'up' | 'degraded' | 'down' = 'up';
    for (const u of project.urls) {
      if (u.isHealthCheckTarget) {
        logger.info(`Checking endpoint [${u.label}]: ${u.url}...`);
        const result = await performHttpCheck({
          url: u.url,
          expectedStatusCode: u.expectedStatusCode,
          expectedBodyContains: u.expectedBodyContains,
          timeoutMs: 10000,
        });

        if (result.status === 'down') overallStatus = 'down';
        else if (result.status === 'degraded' && overallStatus !== 'down') overallStatus = 'degraded';

        await HealthCheckResult.create({
          targetId: project._id,
          targetType: 'project',
          urlLabel: u.label,
          status: result.status,
          statusCode: result.statusCode,
          responseTimeMs: result.responseTimeMs,
          errorMessage: result.errorMessage,
          checkedAt: new Date(),
        });

        logger.info(`Result for [${u.label}]: ${result.status} (${result.statusCode}) in ${result.responseTimeMs}ms`);
      }
    }

    project.currentStatus = overallStatus;
    project.lastCheckedAt = new Date();
    await project.save();

    // Register recurring health check in BullMQ scheduler
    try {
      await scheduleTarget(project._id.toString(), 'project', project.checkIntervalMinutes);
      logger.info(`Scheduled BullMQ check every ${project.checkIntervalMinutes}m for ${project.name}`);
    } catch (schedErr: any) {
      logger.warn(`Scheduler warning for ${project.name}: ${schedErr.message}`);
    }
  }

  logger.info('All 6 projects seeded and verified successfully!');
  process.exit(0);
}

seedAll().catch((err) => {
  logger.error('Failed to seed projects:', err);
  process.exit(1);
});
