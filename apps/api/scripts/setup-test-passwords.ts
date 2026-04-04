/**
 * One-time script: sets known passwords on seed users for E2E validation testing.
 * Run: npx ts-node --skip-project scripts/setup-test-passwords.ts
 */
import { randomBytes, scryptSync } from 'crypto';
import { PrismaClient, RoleCode } from '@prisma/client';

const prisma = new PrismaClient();

function hashSecret(value: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(value, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  // Set passwords for all seed users
  const updates: [string, string][] = [
    ['ops@quickrent.com', 'Admin@1234'],
    ['landlord@quickrent.com', 'Landlord@1234'],
    ['tenant@quickrent.com', 'Tenant@1234'],
    ['dispatch@quickrent-move.com', 'Provider@1234'],
  ];

  for (const [email, pw] of updates) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashSecret(pw) },
    });
    console.log(`✓ Set password for ${email}`);
  }

  // Ensure ops@quickrent.com has COMMAND_CENTER role
  const ccUser = await prisma.user.findUnique({
    where: { email: 'ops@quickrent.com' },
    include: { userRoles: { include: { role: true } } },
  });

  if (ccUser) {
    const hasCCRole = ccUser.userRoles.some((r) => r.role.code === RoleCode.COMMAND_CENTER);
    if (!hasCCRole) {
      const ccRole = await prisma.role.findUnique({ where: { code: RoleCode.COMMAND_CENTER } });
      if (ccRole) {
        await prisma.userRole.create({ data: { userId: ccUser.id, roleId: ccRole.id } });
        console.log(`✓ Assigned COMMAND_CENTER role to ops@quickrent.com`);
      }
    } else {
      console.log(`✓ ops@quickrent.com already has COMMAND_CENTER role`);
    }
  }

  // Ensure landlord@quickrent.com has LANDLORD role and landlord profile
  const llUser = await prisma.user.findUnique({
    where: { email: 'landlord@quickrent.com' },
    include: { userRoles: { include: { role: true } }, landlordProfile: true },
  });

  if (llUser) {
    const hasLLRole = llUser.userRoles.some((r) => r.role.code === RoleCode.LANDLORD);
    if (!hasLLRole) {
      const llRole = await prisma.role.findUnique({ where: { code: RoleCode.LANDLORD } });
      if (llRole) {
        await prisma.userRole.create({ data: { userId: llUser.id, roleId: llRole.id } });
        console.log(`✓ Assigned LANDLORD role to landlord@quickrent.com`);
      }
    } else {
      console.log(`✓ landlord@quickrent.com already has LANDLORD role`);
    }

    if (!llUser.landlordProfile) {
      await prisma.landlordProfile.create({
        data: {
          userId: llUser.id,
          companyName: 'Test Landlord Co',
          portfolioSize: 0,
          verificationStatus: 'verified',
          payoutPreference: 'bank-transfer',
          supportEmail: 'landlord@quickrent.com',
        },
      });
      console.log(`✓ Created landlord profile for landlord@quickrent.com`);
    }
  }

  // Create a 3rd test property owned by the landlord
  const landlordProfile = await prisma.landlordProfile.findFirst({
    where: { user: { email: 'landlord@quickrent.com' } },
  });

  if (landlordProfile) {
    const existing = await prisma.property.findFirst({ where: { slug: 'test-shortlist-property-3' } });
    if (!existing) {
      await prisma.property.create({
        data: {
          landlordProfileId: landlordProfile.id,
          ownerUserId: landlordProfile.userId,
          countryCode: 'QA',
          city: 'Doha',
          district: 'Al Sadd',
          title: 'Test Shortlist Property 3',
          slug: 'test-shortlist-property-3',
          description: 'Third test property for max-shortlist validation.',
          propertyType: 'apartment',
          addressLine1: 'Al Sadd St',
          lat: 25.2854,
          lng: 51.5310,
          monthlyRentMinor: 500000,
          securityDepositMinor: 500000,
          serviceFeeMinor: 15000,
          currency: 'QAR',
          bedrooms: 1,
          bathrooms: 1,
          areaSqm: 80,
          furnished: false,
          petFriendly: false,
          parkingSpaces: 0,
          status: 'PUBLISHED',
          amenities: [],
        },
      });
      console.log(`✓ Created 3rd test property`);
    } else {
      console.log(`✓ 3rd test property already exists: ${existing.id}`);
      console.log(`  PROP_ID_3=${existing.id}`);
    }
  }

  // Re-read for confirmation
  const final3rdProp = await prisma.property.findFirst({ where: { slug: 'test-shortlist-property-3' } });
  if (final3rdProp) {
    console.log(`PROP_ID_3=${final3rdProp.id}`);
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
