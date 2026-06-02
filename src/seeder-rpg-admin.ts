/**
 * Seed: RPG Admin account
 *
 * Creates:
 *   - "RPG" project (idempotent — skipped if already exists)
 *   - User rbg@gmail.com with password 123456 and role rpg_admin
 *     (idempotent — password is reset if the user already exists)
 *
 * Run: npx ts-node -r tsconfig-paths/register src/seeder-rpg-admin.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import * as argon from 'argon2';
import * as crypto from 'crypto';
import { User, UserRole } from 'entities/user.entity';
import { Project } from 'entities/project.entity';
import { FormSubmission } from 'entities/form-submissions.entity';
import { Asset } from 'entities/assets.entity';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

const RPG_ADMIN_EMAIL = 'rpg@gmail.com';
const RPG_ADMIN_PASSWORD = '123456';
const RPG_PROJECT_NAME = 'RPG';

async function seedRpgAdmin() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 5432,
    username: 'postgres.sghvszzxubiyocwhfczj',
    password: 'ahmedshtya-083',
    database: 'EDMS',
    entities: [User, Project, FormSubmission, Asset],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const projectRepo = dataSource.getRepository(Project);
    const userRepo = dataSource.getRepository(User);

    // 1. Ensure the RPG project exists
    let rpgProject = await projectRepo.findOne({ where: { name: RPG_PROJECT_NAME } });
    if (!rpgProject) {
      rpgProject = projectRepo.create({ name: RPG_PROJECT_NAME });
      rpgProject = await projectRepo.save(rpgProject);
      console.log(`✅ Project "${RPG_PROJECT_NAME}" created (id=${rpgProject.id})`);
    } else {
      console.log(`ℹ️  Project "${RPG_PROJECT_NAME}" already exists (id=${rpgProject.id})`);
    }

    // 2. Hash and encrypt the password
    const hashedPassword = await argon.hash(RPG_ADMIN_PASSWORD);
    const encryptedPassword = encrypt(RPG_ADMIN_PASSWORD);

    // 3. Create or update the RPG Admin account
    let rpgAdmin = await userRepo.findOne({ where: { email: RPG_ADMIN_EMAIL } });
    if (!rpgAdmin) {
      rpgAdmin = userRepo.create({
        email: RPG_ADMIN_EMAIL,
        password: hashedPassword,
        encryptedPassword,
        role: UserRole.RPG_ADMIN,
        project: rpgProject,
      });
      rpgAdmin = await userRepo.save(rpgAdmin);
      console.log(`✅ User "${RPG_ADMIN_EMAIL}" created (id=${rpgAdmin.id})`);
    } else {
      // Reset password and ensure correct role + project
      rpgAdmin.password = hashedPassword;
      rpgAdmin.encryptedPassword = encryptedPassword;
      rpgAdmin.role = UserRole.RPG_ADMIN;
      rpgAdmin.project = rpgProject;
      rpgAdmin = await userRepo.save(rpgAdmin);
      console.log(`ℹ️  User "${RPG_ADMIN_EMAIL}" already existed — password reset and role updated (id=${rpgAdmin.id})`);
    }

    console.log('\n🎉 RPG Admin seed completed.');
    console.log(`   Email   : ${RPG_ADMIN_EMAIL}`);
    console.log(`   Password: ${RPG_ADMIN_PASSWORD}`);
    console.log(`   Role    : ${UserRole.RPG_ADMIN}`);
    console.log(`   Project : ${RPG_PROJECT_NAME} (id=${rpgProject.id})`);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seedRpgAdmin();
