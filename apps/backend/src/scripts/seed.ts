import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { User } from '../models/User.model';
import { Project } from '../models/Project.model';
import { Service } from '../models/Service.model';
import { logger } from '../config/logger';

const allProjects = [
  {
    name: 'VCard / Digital Card',
    category: 'SaaS',
    tags: ['production', 'whatsapp', 'vcard'],
    environment: 'production',
    checkIntervalMinutes: 5,
    documentationUrl: 'https://vcard.itfuturz.in',
    ownerNotes: 'Primary VCard and WhatsApp Bot digital card platform.',
    urls: [
      {
        label: 'Frontend',
        url: 'https://vcard.itfuturz.in',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
        customHeaders: {},
      },
      {
        label: 'Admin',
        url: 'https://vcard.itfuturz.in/admin',
        isHealthCheckTarget: true,
        expectedStatusCode: 200,
        customHeaders: {},
      },
    ],
  },
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

const seed = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB for seeding');

    // 1. Create Owner User
    const existingUser = await User.findOne({ email: 'admin@masterdashboard.local' });
    if (!existingUser) {
      const passwordHash = await bcrypt.hash('Admin@1234', 10);
      await User.create({
        email: 'admin@masterdashboard.local',
        passwordHash,
        role: 'owner',
        isActive: true,
      });
      logger.info('Owner user created');
    } else {
      logger.info('Owner user already exists');
    }

    // 2. Create All Projects
    let vcardProject: any = null;
    for (const projData of allProjects) {
      let p = await Project.findOne({ name: projData.name });
      if (!p) {
        p = await Project.create({
          ...projData,
          isActive: true,
          currentStatus: 'up',
        });
        logger.info(`Project ${p.name} created`);
      } else {
        Object.assign(p, projData);
        await p.save();
        logger.info(`Project ${p.name} updated`);
      }
      if (p.name.includes('VCard')) vcardProject = p;
    }

    // 3. Create Service
    const existingService = await Service.findOne({ name: 'MagicQR WhatsApp Bot' });
    if (!existingService && vcardProject) {
      await Service.create({
        name: 'MagicQR WhatsApp Bot',
        provider: 'Meta Cloud API',
        type: 'whatsapp',
        checkMethod: 'http',
        statusEndpoint: 'https://vcard.itfuturz.in/api/whatsapp/status',
        expectedStatusCode: 200,
        linkedProjectIds: [vcardProject._id],
        checkIntervalMinutes: 5,
        currentStatus: 'up',
      });
      logger.info('Service MagicQR WhatsApp Bot created');
    }

    logger.info('Seed completed successfully with all 7 projects');
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
