import mongoose from 'mongoose';

async function checkAll() {
  const dbs = ['biz360', 'virtual-card', 'Saarthi', 'ai-in-action', 'maestros'];
  for (const dbName of dbs) {
    try {
      const conn = await mongoose.createConnection(
        `mongodb://itfuturz01:!tfuturz!-!sanvi!2022!@147.79.70.177:27017/${dbName}?authSource=admin`
      ).asPromise();
      const colls = await conn.db!.listCollections().toArray();
      console.log(`\n=== Database: ${dbName} ===`);
      for (const c of colls) {
        const name = c.name;
        if (name.includes('log') || name.includes('analytic') || name.includes('session') || name.includes('user') || name.includes('visit')) {
          const total = await conn.db!.collection(name).countDocuments();
          if (total > 0) {
            const sample = await conn.db!.collection(name).findOne({}, { sort: { _id: -1 } });
            const hasTimestamp = sample?.timestamp || sample?.createdAt || sample?.date;
            console.log(`  - ${name}: ${total} docs (sample date: ${hasTimestamp})`);
          }
        }
      }
      await conn.close();
    } catch (err: any) {
      console.error(`Error checking ${dbName}:`, err.message);
    }
  }
}

checkAll().catch(console.error);
