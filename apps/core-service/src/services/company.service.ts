import { prisma } from '../config/database';

export interface CompanyInput {
  name: string;
  website?: string | null;
  industry?: string | null;
}

const getProfile = (userId: number) =>
  prisma.recruiterProfile.findUnique({ where: { userId } });

export const companyService = {
  async get(userId: number) {
    const profile = await getProfile(userId);
    if (!profile?.companyName) return null;

    return {
      id: profile.id,
      name: profile.companyName,
      website: profile.companyWebsite,
      industry: profile.industry,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  },

  async create(userId: number, input: CompanyInput) {
    const profile = await getProfile(userId);
    if (profile?.companyName) return { conflict: true as const, company: null };

    const companyProfile = profile
      ? await prisma.recruiterProfile.update({
          where: { id: profile.id },
          data: {
            companyName: input.name,
            companyWebsite: input.website ?? null,
            industry: input.industry ?? null,
          },
        })
      : await prisma.recruiterProfile.create({
          data: {
            userId,
            companyName: input.name,
            companyWebsite: input.website ?? null,
            industry: input.industry ?? null,
          },
        });

    return {
      conflict: false as const,
      company: {
        id: companyProfile.id,
        name: companyProfile.companyName!,
        website: companyProfile.companyWebsite,
        industry: companyProfile.industry,
        createdAt: companyProfile.createdAt,
        updatedAt: companyProfile.updatedAt,
      },
    };
  },

  async update(userId: number, input: Partial<CompanyInput>) {
    const profile = await getProfile(userId);
    if (!profile?.companyName) return null;

    const updated = await prisma.recruiterProfile.update({
      where: { id: profile.id },
      data: {
        ...(input.name !== undefined && { companyName: input.name }),
        ...(input.website !== undefined && { companyWebsite: input.website }),
        ...(input.industry !== undefined && { industry: input.industry }),
      },
    });

    return {
      id: updated.id,
      name: updated.companyName!,
      website: updated.companyWebsite,
      industry: updated.industry,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async deleteIfUnused(userId: number) {
    const profile = await prisma.recruiterProfile.findUnique({
      where: { userId },
      include: { _count: { select: { jobs: true } } },
    });

    if (!profile?.companyName) return { deleted: false as const, reason: 'not_found' as const };
    if (profile._count.jobs > 0) return { deleted: false as const, reason: 'in_use' as const };

    await prisma.recruiterProfile.update({
      where: { id: profile.id },
      data: { companyName: null, companyWebsite: null, industry: null },
    });

    return { deleted: true as const };
  },
};
