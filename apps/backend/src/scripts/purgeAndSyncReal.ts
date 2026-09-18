import { connectDB } from '../config/db';
import { PageView } from '../models/PageView.model';
import { productionSyncService } from '../services/productionSync.service';
import { logger } from '../config/logger';

async function main() {
  await connectDB();

  logger.info('Purging all synthetic records from PageView collection...');
  const deleteResult = await PageView.deleteMany({});
  logger.info(`Deleted ${deleteResult.deletedCount} previous/synthetic records.`);

  logger.info('Running full 30-day sync of real production user activity...');
  const syncResult = await productionSyncService.syncAll(30);

  logger.info('Sync Result:', syncResult);
  const finalCount = await PageView.countDocuments();
  logger.info(`Final PageView collection count: ${finalCount} authentic records.`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during purge and sync:', err);
  process.exit(1);
});
