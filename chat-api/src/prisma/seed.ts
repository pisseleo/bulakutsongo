import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding roles and permissions...');

  // ---- 1. Define permissions ----
  const permissionsData = [
    { name: 'manage_users', description: 'Create, update, delete any user' },
    { name: 'manage_roles', description: 'Assign or revoke roles' },
    { name: 'manage_conversations', description: 'Delete or moderate any conversation' },
    { name: 'send_messages', description: 'Send messages in conversations' },
    { name: 'read_messages', description: 'Read messages in conversations' },
    { name: 'manage_own_profile', description: 'Edit own profile' },
    { name: 'enable_2fa', description: 'Enable two-factor authentication' },
    { name: 'view_analytics', description: 'Access system analytics' },
  ];

  // Upsert permissions (create if not exists, otherwise update description)
 
   const permissions: Record<string, { id: string }> = {};
  for (const p of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
    permissions[p.name] = { id: perm.id };
  }
  console.log(`✅ ${Object.keys(permissions).length} permissions ready`);

  // ---- 2. Define roles ----
  const rolesData = [
    {
      name: 'SUPER_ADMIN',
      description: 'Full system access',
      permissions: ['manage_users', 'manage_roles', 'manage_conversations', 'view_analytics'],
    },
    {
      name: 'ADMIN',
      description: 'Administrative privileges except role management',
      permissions: ['manage_users', 'manage_conversations', 'view_analytics'],
    },
    {
      name: 'USER',
      description: 'Standard user',
      permissions: ['send_messages', 'read_messages', 'manage_own_profile', 'enable_2fa'],
    },
  ];

  for (const roleData of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: {
        name: roleData.name,
        description: roleData.description,
      },
    });

    // Connect permissions
    const rolePermissions = roleData.permissions.map((permName) => ({
      id: permissions[permName].id,
    }));

    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          set: rolePermissions, // replaces existing associations
        },
      },
    });
    console.log(`✅ Role "${roleData.name}" seeded with ${roleData.permissions.length} permissions`);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });