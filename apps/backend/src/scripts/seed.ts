import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { User } from '../models/User.model';
import { Project } from '../models/Project.model';
import { Service } from '../models/Service.model';
import { logger } from '../config/logger';

export const allProjects = [
  {
    "name": "Leark Partner",
    "description": "",
    "category": "Partner Portal",
    "tags": [
      "production",
      "partner",
      "ai-edtech"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "",
    "ownerNotes": "Admin Panel: https://partner.leark.ai/dashboard\nEmail: info@itfuturz.com\nPassword: 123456",
    "urls": [
      {
        "label": "Partner Dashboard",
        "url": "https://partner.leark.ai/dashboard",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Web Portal",
        "url": "https://partner.leark.ai/",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "Rojee",
    "description": "",
    "category": "Services Platform",
    "tags": [
      "production",
      "services",
      "admin-panel"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN",
    "ownerNotes": "Admin Panel: https://rojee.itfuturz.in/signin\nEmail: admin@gmail.com\nPassword: 123456\nPlay Store: https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN\nApp Store: https://apps.apple.com/us/developer/arpit-shah/id1472509526",
    "urls": [
      {
        "label": "Sign In Portal",
        "url": "https://rojee.itfuturz.in/signin",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Web Portal",
        "url": "https://rojee.itfuturz.in/",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "Sai World CRM",
    "description": "",
    "category": "CRM & Real Estate",
    "tags": [
      "production",
      "crm",
      "admin-panel"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN",
    "ownerNotes": "CRM Portal: https://saiworldcrm.itfuturz.in/\nEmail: admin@gmail.com\nPassword: 123456\nPlay Store: https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN\nApp Store: https://apps.apple.com/us/developer/arpit-shah/id1472509526",
    "urls": [
      {
        "label": "CRM Portal",
        "url": "https://saiworldcrm.itfuturz.in/",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "Tramily CRM",
    "description": "",
    "category": "CRM & Sales",
    "tags": [
      "production",
      "crm",
      "admin-panel"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN",
    "ownerNotes": "CRM Portal: https://tramilycrm.itfuturz.in/\nEmail: admin@gmail.com\nPassword: 123456\nPlay Store: https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN\nApp Store: https://apps.apple.com/us/developer/arpit-shah/id1472509526",
    "urls": [
      {
        "label": "CRM Portal",
        "url": "https://tramilycrm.itfuturz.in/",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "Travel Nexus",
    "description": "",
    "category": "Travel & Hospitality",
    "tags": [
      "production",
      "travel",
      "admin-panel"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN",
    "ownerNotes": "Admin Panel: https://travelnexus.itfuturz.in/adminapp/#/adminapp/adminLogin\nEmail: admin@gmail.com\nPassword: 123456\nPlay Store: https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN\nApp Store: https://apps.apple.com/us/developer/arpit-shah/id1472509526",
    "urls": [
      {
        "label": "Admin Panel",
        "url": "https://travelnexus.itfuturz.in/adminapp/#/adminapp/adminLogin",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Web Portal",
        "url": "https://travelnexus.itfuturz.in/",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "Textile Mandee",
    "description": "",
    "category": "B2B Marketplace",
    "tags": [
      "production",
      "marketplace",
      "admin-panel"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN",
    "ownerNotes": "Admin Panel: https://admin.startupweaver.itfuturz.in/auth/login\nEmail: admin@gmail.com\nPassword: 123456\nPlay Store: https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN\nApp Store: https://apps.apple.com/us/developer/arpit-shah/id1472509526",
    "urls": [
      {
        "label": "Admin Panel",
        "url": "https://admin.startupweaver.itfuturz.in/auth/login",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "The Circle",
    "description": "",
    "category": "Community & Social",
    "tags": [
      "production",
      "community",
      "admin-panel"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN",
    "ownerNotes": "Admin Panel: https://thecircle.itfuturz.in/adminapp/#/adminapp/adminLogin\nEmail: admin@gmail.com\nPassword: 123456\nPlay Store: https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN\nApp Store: https://apps.apple.com/us/developer/arpit-shah/id1472509526",
    "urls": [
      {
        "label": "Admin Panel",
        "url": "https://thecircle.itfuturz.in/adminapp/#/adminapp/adminLogin",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Web Portal",
        "url": "https://thecircle.itfuturz.in/",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "GBS Connect",
    "description": "",
    "category": "Networking Platform",
    "tags": [
      "production",
      "community",
      "admin-panel"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN",
    "ownerNotes": "Admin Panel: https://gbs-connect.com/adminapp/#/adminapp/adminLogin\nEmail: admin@gmail.com\nPassword: 123456\nPlay Store: https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN\nApp Store: https://apps.apple.com/us/developer/arpit-shah/id1472509526",
    "urls": [
      {
        "label": "Admin Panel",
        "url": "https://gbs-connect.com/adminapp/#/adminapp/adminLogin",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Web Portal",
        "url": "https://gbs-connect.com/",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "LNG",
    "description": "",
    "category": "Logistics & Energy",
    "tags": [
      "production",
      "mobile-app",
      "admin-panel"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN",
    "ownerNotes": "Admin Panel: https://lng.itfuturz.in/adminLogin\nEmail: admin@gmail.com\nPassword: lng123\nPlay Store: https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN\nApp Store: https://apps.apple.com/us/developer/arpit-shah/id1472509526",
    "urls": [
      {
        "label": "Admin Panel",
        "url": "https://lng.itfuturz.in/adminLogin",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Web Portal",
        "url": "https://lng.itfuturz.in/",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "NDvibe",
    "description": "",
    "category": "Mobile Platform",
    "tags": [
      "production",
      "mobile-app",
      "admin-panel"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN",
    "ownerNotes": "Admin Panel: https://ndvibe.itfuturz.in/#/sign-in\nEmail: admin@gmail.com\nPassword: 123456\nPlay Store: https://play.google.com/store/apps/dev?id=7868149321866005121&hl=en_IN\nApp Store: https://apps.apple.com/us/developer/arpit-shah/id1472509526",
    "urls": [
      {
        "label": "Admin Panel",
        "url": "https://ndvibe.itfuturz.in/#/sign-in",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Web Portal",
        "url": "https://ndvibe.itfuturz.in/",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "AI In Action",
    "description": "AI learning and education platform with user and admin portals.",
    "category": "EdTech",
    "tags": [
      "aiinaction",
      "learning",
      "ai",
      "production"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://learn.aiinaction.co.in/userapp/login",
    "ownerNotes": "🔑 User App:\nURL: https://learn.aiinaction.co.in/userapp/login\nEmail: chandanpolai26@gmail.com\nPassword: 123456\n\n🔑 Admin App:\nURL: https://learn.aiinaction.co.in/adminapp/login\nEmail: aiinaction.in@gmail.com\nPassword: Aiinaction2026@",
    "urls": [
      {
        "label": "User App Login",
        "url": "https://learn.aiinaction.co.in/userapp/login",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Admin App Login",
        "url": "https://learn.aiinaction.co.in/adminapp/login",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "Saarthi",
    "description": "Saarthi administration and operations application.",
    "category": "Operations",
    "tags": [
      "saarthi",
      "operations",
      "production"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://saarthi.itfuturz.in/adminapp/#/adminapp/adminLogin",
    "ownerNotes": "🔑 Admin Login:\nEmail: admin@gmail.com\nPassword: 123456",
    "urls": [
      {
        "label": "Admin Login App",
        "url": "https://saarthi.itfuturz.in/adminapp/#/adminapp/adminLogin",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "Pictik",
    "description": "Multi-portal photography management & customer photo delivery platform.",
    "category": "Photography Platform",
    "tags": [
      "pictik",
      "photography",
      "production",
      "multi-portal"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://pictik-app.itfuturz.in/admin/#/login",
    "ownerNotes": "🔑 Admin Portal:\nURL: https://pictik-app.itfuturz.in/admin/#/login\nEmail: admin@gmail.com\nPassword: 123456\n\n🔑 Photographer Portal:\nURL: https://pictik-app.itfuturz.in/photographer/#/login\nEmail: chandanpolai26@gmail.com\nPassword: 123456\n\n🔑 Customer Portal:\nLogin URL: https://pictik-app.itfuturz.in/customer/#/login\nDashboard URL: https://pictik-app.itfuturz.in/customer/#/dashboard\nPhone: 7567534668 (OTP based login)",
    "urls": [
      {
        "label": "Admin Portal",
        "url": "https://pictik-app.itfuturz.in/admin/#/login",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Photographer Portal",
        "url": "https://pictik-app.itfuturz.in/photographer/#/login",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Customer Login",
        "url": "https://pictik-app.itfuturz.in/customer/#/login",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Customer Dashboard",
        "url": "https://pictik-app.itfuturz.in/customer/#/dashboard",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "Maestros",
    "description": "Maestros enterprise management and operation portal.",
    "category": "Enterprise",
    "tags": [
      "maestros",
      "production"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://maestros.itfuturz.in/#/login",
    "ownerNotes": "🔑 Admin Login:\nEmail: admin@maestros.dev\nPassword: 123456",
    "urls": [
      {
        "label": "Login Portal",
        "url": "https://maestros.itfuturz.in/#/login",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "ZZUP",
    "description": "ZZUP business portal and customer application.",
    "category": "SaaS",
    "tags": [
      "zzup",
      "production"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://zzup.itfuturz.in/#/signin",
    "ownerNotes": "🔑 Admin Login:\nEmail: admin@gmail.com\nPassword: Admin@123",
    "urls": [
      {
        "label": "Sign In Portal",
        "url": "https://zzup.itfuturz.in/#/signin",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "VCard / Digital Card",
    "description": "",
    "category": "SaaS",
    "tags": [
      "production",
      "whatsapp",
      "vcard"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://vcard.itfuturz.in",
    "ownerNotes": "Primary VCard and WhatsApp Bot digital card platform.",
    "urls": [
      {
        "label": "Frontend",
        "url": "https://vcard.itfuturz.in",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      },
      {
        "label": "Admin",
        "url": "https://vcard.itfuturz.in/admin",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  },
  {
    "name": "Biz360",
    "description": "All-in-one business connect & digital card management platform.",
    "category": "SaaS",
    "tags": [
      "biz360",
      "digitalcard",
      "production"
    ],
    "environment": "production",
    "checkIntervalMinutes": 5,
    "documentationUrl": "https://connect.digitalcard.co.in/apps",
    "ownerNotes": "🔑 Admin Login:\nEmail: info@itfuturz.com\nPassword: user@1234\n\n🔑 Editor Login:\nEmail: rahul.pawar@itfuturz.com\nPassword: user@1234",
    "urls": [
      {
        "label": "Apps Portal",
        "url": "https://connect.digitalcard.co.in/apps",
        "isHealthCheckTarget": true,
        "expectedStatusCode": 200
      }
    ]
  }
];

export const allServices = [
  {
    "name": "MagicQR WhatsApp Bot",
    "provider": "Virtual Card WhatsApp Gateway",
    "type": "whatsapp",
    "checkMethod": "http",
    "statusEndpoint": "https://vcard.itfuturz.in/api/external/whatsapp-status",
    "expectedStatusCode": 200,
    "checkIntervalMinutes": 5,
    "linkedProjectNames": [
      "VCard / Digital Card",
      "Biz360"
    ]
  },
  {
    "name": "MADz SMS Gateway",
    "provider": "MADz Mobile ADZ (Surat)",
    "type": "sms",
    "checkMethod": "http",
    "statusEndpoint": "https://sms.madzz.in",
    "expectedStatusCode": 200,
    "checkIntervalMinutes": 5,
    "linkedProjectNames": [
      "Biz360",
      "Saarthi",
      "VCard / Digital Card",
      "Pictik"
    ]
  },
  {
    "name": "Razorpay Payment Gateway",
    "provider": "Razorpay India",
    "type": "payment",
    "checkMethod": "http",
    "statusEndpoint": "https://status.razorpay.com",
    "expectedStatusCode": 200,
    "checkIntervalMinutes": 5,
    "linkedProjectNames": [
      "Biz360",
      "Pictik",
      "Saarthi"
    ]
  },
  {
    "name": "Transactional Email (Gmail SMTP)",
    "provider": "Google Workspace SMTP",
    "type": "email",
    "checkMethod": "http",
    "statusEndpoint": "https://mail.google.com",
    "expectedStatusCode": 200,
    "checkIntervalMinutes": 5,
    "linkedProjectNames": [
      "Biz360",
      "VCard / Digital Card",
      "ZZUP",
      "Maestros",
      "Pictik",
      "Saarthi",
      "AI In Action"
    ]
  }
];

export const seed = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB for seeding');

    // 1. Create Default Owner Admin User
    const existingUser = await User.findOne({ email: 'admin@masterdashboard.com' });
    if (!existingUser) {
      const passwordHash = await bcrypt.hash('Admin@1234', 10);
      await User.create({
        email: 'admin@masterdashboard.com',
        passwordHash,
        role: 'owner',
        isActive: true,
      });
      logger.info('Owner user created: admin@masterdashboard.com');
    } else {
      logger.info('Owner user already exists: admin@masterdashboard.com');
    }

    // 2. Seed / Upsert All 17 Projects
    const projectMap = new Map<string, any>();
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
        p.isActive = true;
        await p.save();
        logger.info(`Project ${p.name} updated`);
      }
      projectMap.set(p.name, p);
    }

    // 3. Seed / Upsert All 4 Services and Link to Projects
    for (const svcData of allServices) {
      const linkedIds = (svcData.linkedProjectNames || [])
        .map((name: string) => projectMap.get(name)?._id)
        .filter(Boolean);

      let s = await Service.findOne({ name: svcData.name });
      if (!s) {
        s = await Service.create({
          name: svcData.name,
          provider: svcData.provider,
          type: svcData.type as any,
          checkMethod: svcData.checkMethod as any,
          statusEndpoint: svcData.statusEndpoint,
          expectedStatusCode: svcData.expectedStatusCode,
          checkIntervalMinutes: svcData.checkIntervalMinutes,
          linkedProjectIds: linkedIds,
          isActive: true,
          currentStatus: 'up',
        });
        logger.info(`Service ${s.name} created (linked to ${linkedIds.length} projects)`);
      } else {
        s.provider = svcData.provider;
        s.type = svcData.type as any;
        s.checkMethod = svcData.checkMethod as any;
        s.statusEndpoint = svcData.statusEndpoint;
        s.expectedStatusCode = svcData.expectedStatusCode;
        s.checkIntervalMinutes = svcData.checkIntervalMinutes;
        s.linkedProjectIds = linkedIds;
        s.isActive = true;
        await s.save();
        logger.info(`Service ${s.name} updated (linked to ${linkedIds.length} projects)`);
      }

      // Also ensure two-way link from Project to Service
      for (const projId of linkedIds) {
        await Project.findByIdAndUpdate(projId, {
          $addToSet: { linkedServiceIds: s._id },
        });
      }
    }

    logger.info(`Seed completed successfully! Total projects: ${allProjects.length}, Total services: ${allServices.length}`);
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();