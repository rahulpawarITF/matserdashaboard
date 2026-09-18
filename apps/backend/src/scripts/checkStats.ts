import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { PageView } from '../models/PageView.model';
import { Project } from '../models/Project.model';

async function main() {
  await connectDB();
  const projects = await Project.find({}, 'name _id');
  console.log('--- PageViews Count Per Project ---');
  for (const p of projects) {
    const count = await PageView.countDocuments({ projectId: p._id });
    console.log(`${p.name} (${p._id}): ${count} views`);
  }
  const total = await PageView.countDocuments();
  console.log(`Total PageViews in DB: ${total}`);
  await mongoose.disconnect();
}

main().catch(console.error);
