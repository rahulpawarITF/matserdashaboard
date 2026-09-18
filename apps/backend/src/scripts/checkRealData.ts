import mongoose from 'mongoose';

async function run() {
  const conn = await mongoose.createConnection(
    'mongodb://itfuturz01:!tfuturz!-!sanvi!2022!@147.79.70.177:27017/biz360?authSource=admin'
  ).asPromise();
  const coll = conn.db!.collection('analyticslogs');
  const total = await coll.countDocuments();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await coll.countDocuments({ timestamp: { $gte: today } });
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekCount = await coll.countDocuments({ timestamp: { $gte: weekAgo } });
  console.log('biz360 real logs: Total:', total, 'Today:', todayCount, 'Past 7d:', weekCount);

  // Check unique users in past 7 days
  const uniqueUsers = await coll.distinct('userId', { timestamp: { $gte: weekAgo } });
  console.log('Past 7d unique users in biz360:', uniqueUsers.length);

  // Check unique users today
  const uniqueToday = await coll.distinct('userId', { timestamp: { $gte: today } });
  console.log('Today unique users in biz360:', uniqueToday.length);

  // Check recent platforms and devices
  const recent = await coll.find({}).sort({ timestamp: -1 }).limit(5).toArray();
  console.log('Latest 3 actions:', recent.slice(0, 3).map(r => ({ action: r.action, ip: r.ip, time: r.timestamp, device: r.deviceInfo?.substring(0, 40) })));

  await conn.close();
}

run().catch(console.error);
