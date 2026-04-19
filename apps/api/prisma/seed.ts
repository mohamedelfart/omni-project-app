import { PrismaClient, ProviderType, RoleCode, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

/** Same format as `AuthService` (`salt:scryptHex`); local-only password `QuickRentDev1!` for seeded users. */
const DEV_SEED_PASSWORD_HASH =
  '646485196fdf211e8e71c5830557333b:5035a42e802ed43e3c29b3ba02f04a2f833a6b5aa10df57da2a04be0e3b37b1ad7ed5196af03545d72fa34f24f384a0232c2e78cdef242f3e8f5feb957ecd494';

async function main(): Promise<void> {
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();

  const roles = await Promise.all(
    [
      { code: RoleCode.TENANT, name: 'Tenant' },
      { code: RoleCode.LANDLORD, name: 'Landlord' },
      { code: RoleCode.ADMIN, name: 'Admin' },
      { code: RoleCode.PROVIDER, name: 'Provider' },
      { code: RoleCode.COMMAND_CENTER, name: 'Command Center' },
    ].map((role) =>
      prisma.role.upsert({
        where: { code: role.code },
        update: { name: role.name },
        create: role,
      }),
    ),
  );

  await prisma.countryConfig.upsert({
    where: { code: 'QA' },
    update: {},
    create: {
      code: 'QA',
      name: 'Qatar',
      defaultCurrency: 'QAR',
      timezone: 'Asia/Qatar',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'ar'],
      taxPercent: 0,
      maintenanceSlaHours: 24,
      freeMoveInCapMinor: 50000,
      googleRegionCode: 'QA',
    },
  });

  const landlordUser = await prisma.user.upsert({
    where: { email: 'landlord@quickrent.com' },
    update: { isVerified: true, isProfileCompleted: true, passwordHash: DEV_SEED_PASSWORD_HASH },
    create: {
      email: 'landlord@quickrent.com',
      phoneNumber: '+97450000010',
      fullName: 'Global Landlord',
      locale: 'en',
      countryCode: 'QA',
      status: UserStatus.ACTIVE,
      isVerified: true,
      isProfileCompleted: true,
      passwordHash: DEV_SEED_PASSWORD_HASH,
    },
  });

  const tenantUser = await prisma.user.upsert({
    where: { email: 'tenant@quickrent.com' },
    update: { isVerified: true, isProfileCompleted: true, passwordHash: DEV_SEED_PASSWORD_HASH },
    create: {
      email: 'tenant@quickrent.com',
      phoneNumber: '+97450000020',
      fullName: 'Nora Tenant',
      locale: 'en',
      countryCode: 'QA',
      status: UserStatus.ACTIVE,
      isVerified: true,
      isProfileCompleted: true,
      passwordHash: DEV_SEED_PASSWORD_HASH,
    },
  });

  const commandCenterUser = await prisma.user.upsert({
    where: { email: 'ops@quickrent.com' },
    update: { isVerified: true, isProfileCompleted: true, passwordHash: DEV_SEED_PASSWORD_HASH },
    create: {
      email: 'ops@quickrent.com',
      phoneNumber: '+97450000030',
      fullName: 'Operations Lead',
      locale: 'en',
      countryCode: 'QA',
      status: UserStatus.ACTIVE,
      isVerified: true,
      isProfileCompleted: true,
      passwordHash: DEV_SEED_PASSWORD_HASH,
    },
  });

  const providerUser = await prisma.user.upsert({
    where: { email: 'dispatch@quickrent-move.com' },
    update: { isVerified: true, isProfileCompleted: true, passwordHash: DEV_SEED_PASSWORD_HASH },
    create: {
      email: 'dispatch@quickrent-move.com',
      phoneNumber: '+97450000040',
      fullName: 'Provider Dispatcher',
      locale: 'en',
      countryCode: 'QA',
      status: UserStatus.ACTIVE,
      isVerified: true,
      isProfileCompleted: true,
      passwordHash: DEV_SEED_PASSWORD_HASH,
    },
  });

  /** Matches `sub` in admin-web `DEV_ACCESS_TOKEN_FALLBACK` so local JWT maps to a real User row. */
  const seedAdminJwtUser = await prisma.user.upsert({
    where: { id: 'seed-admin' },
    update: { isVerified: true, isProfileCompleted: true, passwordHash: DEV_SEED_PASSWORD_HASH },
    create: {
      id: 'seed-admin',
      email: 'seed-admin@quickrent.local',
      phoneNumber: '+97459999001',
      fullName: 'Seed Admin (local JWT)',
      locale: 'en',
      countryCode: 'QA',
      status: UserStatus.ACTIVE,
      isVerified: true,
      isProfileCompleted: true,
      passwordHash: DEV_SEED_PASSWORD_HASH,
    },
  });

  const roleByCode = Object.fromEntries(roles.map((role) => [role.code, role.id]));
  const getRoleId = (code: RoleCode): string => {
    const roleId = roleByCode[code];
    if (!roleId) {
      throw new Error(`Missing role id for ${code}`);
    }
    return roleId;
  };

  await prisma.userRole.createMany({
    data: [
      { userId: landlordUser.id, roleId: getRoleId(RoleCode.LANDLORD) },
      { userId: tenantUser.id, roleId: getRoleId(RoleCode.TENANT) },
      { userId: commandCenterUser.id, roleId: getRoleId(RoleCode.ADMIN) },
      { userId: commandCenterUser.id, roleId: getRoleId(RoleCode.COMMAND_CENTER) },
      { userId: providerUser.id, roleId: getRoleId(RoleCode.PROVIDER) },
      { userId: seedAdminJwtUser.id, roleId: getRoleId(RoleCode.ADMIN) },
      { userId: seedAdminJwtUser.id, roleId: getRoleId(RoleCode.COMMAND_CENTER) },
    ],
    skipDuplicates: true,
  });

  const landlordProfile = await prisma.landlordProfile.upsert({
    where: { userId: landlordUser.id },
    update: {},
    create: {
      userId: landlordUser.id,
      companyName: 'QuickRent Asset Holdings',
      portfolioSize: 2,
      verificationStatus: 'verified',
      payoutPreference: 'bank-transfer',
      supportEmail: 'portfolio@quickrent.com',
    },
  });

  const tenantProfile = await prisma.tenantProfile.upsert({
    where: { userId: tenantUser.id },
    update: {},
    create: {
      userId: tenantUser.id,
      preferredLanguage: 'en',
      occupation: 'Product Director',
      monthlyBudgetMinor: 950000,
      preferredCity: 'Doha',
      preferredDistricts: ['West Bay', 'Lusail'],
      currentLat: 25.2854,
      currentLng: 51.531,
      currentAddress: 'West Bay, Doha',
      emergencyContactName: 'Adam Tenant',
      emergencyContactPhone: '+97455551234',
    },
  });

  const movingProvider = await prisma.provider.upsert({
    where: { id: 'provider_moving_qr' },
    update: {},
    create: {
      id: 'provider_moving_qr',
      name: 'QuickMove Logistics',
      legalName: 'QuickMove Logistics WLL',
      countryCode: 'QA',
      city: 'Doha',
      providerType: ProviderType.MOVING,
      serviceTypes: ['move-in', 'viewing-transport'],
      supportEmail: 'ops@quickmove.qa',
      supportPhone: '+97440001111',
    },
  });

  await prisma.providerProfile.upsert({
    where: { userId_providerId: { userId: providerUser.id, providerId: movingProvider.id } },
    update: {},
    create: {
      userId: providerUser.id,
      providerId: movingProvider.id,
      title: 'Dispatch Manager',
      isPrimaryContact: true,
      availabilityStatus: 'online',
      currentLat: 25.2865,
      currentLng: 51.533,
    },
  });

  const properties = await Promise.all([
    prisma.property.upsert({
      where: { slug: 'doha-marina-residence' },
      update: {},
      create: {
        landlordProfileId: landlordProfile.id,
        ownerUserId: landlordUser.id,
        countryCode: 'QA',
        city: 'Doha',
        district: 'West Bay',
        title: 'Doha Marina Residence',
        slug: 'doha-marina-residence',
        description: 'Premium marina-facing residence with concierge and gym access.',
        propertyType: 'apartment',
        addressLine1: 'Marina District Tower 3',
        lat: 25.3251,
        lng: 51.5338,
        monthlyRentMinor: 850000,
        securityDepositMinor: 850000,
        serviceFeeMinor: 25000,
        currency: 'QAR',
        bedrooms: 2,
        bathrooms: 2,
        areaSqm: 132,
        furnished: true,
        petFriendly: true,
        parkingSpaces: 1,
        status: 'PUBLISHED',
        amenities: ['pool', 'gym', 'concierge', 'parking'],
        media: {
          create: [{ mediaType: 'image', url: 'https://images.quickrent.com/doha-marina.jpg', isPrimary: true }],
        },
      },
    }),
    prisma.property.upsert({
      where: { slug: 'lusail-skyline-loft' },
      update: {},
      create: {
        landlordProfileId: landlordProfile.id,
        ownerUserId: landlordUser.id,
        countryCode: 'QA',
        city: 'Lusail',
        district: 'Fox Hills',
        title: 'Lusail Skyline Loft',
        slug: 'lusail-skyline-loft',
        description: 'High-rise loft built for international professionals.',
        propertyType: 'loft',
        addressLine1: 'Fox Hills Boulevard',
        lat: 25.4205,
        lng: 51.5081,
        monthlyRentMinor: 920000,
        securityDepositMinor: 920000,
        serviceFeeMinor: 35000,
        currency: 'QAR',
        bedrooms: 3,
        bathrooms: 3,
        areaSqm: 168,
        furnished: true,
        petFriendly: false,
        parkingSpaces: 2,
        status: 'PUBLISHED',
        amenities: ['smart-home', 'gym', 'lounge', 'parking'],
      },
    }),
  ]);

  const shortlist = await prisma.shortlist.create({
    data: {
      userId: tenantUser.id,
      name: 'Move-in shortlist',
      items: {
        create: properties.map((property, index) => ({ propertyId: property.id, position: index + 1 })),
      },
    },
  });

  await prisma.rewardsWallet.upsert({
    where: { userId: tenantUser.id },
    update: { availablePoints: 1250, tier: 'gold' },
    create: {
      userId: tenantUser.id,
      availablePoints: 1250,
      tier: 'gold',
      transactions: {
        create: [{ userId: tenantUser.id, type: 'BONUS', points: 1250, reason: 'Platform onboarding reward' }],
      },
    },
  });

  const insurancePlan = await prisma.insurancePlan.upsert({
    where: { code: 'rent-protect-plus' },
    update: {},
    create: {
      code: 'rent-protect-plus',
      countryCode: 'QA',
      name: 'Rent Protect Plus',
      description: 'Comprehensive move-in and liability protection plan.',
      premiumMinor: 15000,
      currency: 'QAR',
      coverageLimitMinor: 1500000,
      deductibleMinor: 5000,
    },
  });

  await prisma.insuranceSubscription.upsert({
    where: { policyNumber: 'QR-INS-2026-0001' },
    update: {
      tenantProfileId: tenantProfile.id,
      planId: insurancePlan.id,
      status: 'ACTIVE',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.000Z'),
      premiumMinor: 15000,
      currency: 'QAR',
    },
    create: {
      tenantProfileId: tenantProfile.id,
      planId: insurancePlan.id,
      status: 'ACTIVE',
      policyNumber: 'QR-INS-2026-0001',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.000Z'),
      premiumMinor: 15000,
      currency: 'QAR',
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: commandCenterUser.id,
      action: 'SEED_BOOTSTRAP',
      entity: 'Platform',
      entityId: 'quickrent',
      severity: 'INFO',
      countryCode: 'QA',
      metadata: {
        shortlistId: shortlist.id,
        seededPropertyCount: properties.length,
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
