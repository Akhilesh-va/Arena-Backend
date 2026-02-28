/**
 * Seed dummy users for testing.
 * Run: npx ts-node src/scripts/seedUsers.ts
 * All users have password: password123
 */
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { UserModel } from '../models/User';

const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'password123';

const DUMMY_USERS = [
  { email: 'alice@arena.test', displayName: 'Alice', bio: 'Gamer & streamer' },
  { email: 'bob@arena.test', displayName: 'Bob', bio: 'Esports fan' },
  { email: 'carol@arena.test', displayName: 'Carol', bio: 'Casual player' },
  { email: 'dave@arena.test', displayName: 'Dave', bio: 'Pro viewer' },
  { email: 'eve@arena.test', displayName: 'Eve', bio: 'Arena tester' },
];

async function seed(): Promise<void> {
  await connectDatabase();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  for (const u of DUMMY_USERS) {
    const existing = await UserModel.findOne({ email: u.email });
    if (existing) {
      console.log(`Skip (exists): ${u.email}`);
      continue;
    }
    await UserModel.create({
      email: u.email,
      passwordHash,
      displayName: u.displayName,
      bio: u.bio,
      isEmailVerified: true,
    });
    console.log(`Created: ${u.email} (${u.displayName})`);
  }

  console.log('\nDone. All seed users have password:', DEFAULT_PASSWORD);
  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
