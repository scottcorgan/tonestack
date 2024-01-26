import type { Model, Profile } from "@prisma/client";
import { db } from "~/utils/db.server";
import type { SortDirection } from "~/types/custom";

interface getFavoritesType {
  limit?: number;
  next?: number;
  profileId: string;
  sortDirection?: SortDirection;
  categoryId?: number | null;
  tags?: string[];
  sortBy?: keyof Model;
}

export const getFavorites = async (params: getFavoritesType) => {
  const categoryFilter = params.categoryId
    ? {
        model: {
          category: {
            id: +params.categoryId,
          },
        },
      }
    : undefined;

  const pagination = {
    skip: params.next ?? 0,
    take: params.limit ?? 10,
  };

  const where = {
    deleted: false,
    profileId: params.profileId,
    model: {
      active: true,
      deleted: false,
    },
    ...categoryFilter,
    ...params.tags && params.tags.length > 0 && {
      model: {
        tags: {
          hasSome: params.tags
        }
      }
    },
  };

  const favorites = await db.$transaction([
    db.favorite.count({
      where,
    }),
    db.favorite.findMany({
      where,
      select: {
        id: true,
        model: {
          select: {
            id: true,
            title: true,
            description: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
            filename: true,
            profile: {
              select: {
                id: true,
                username: true,
              },
            },
            category: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
            _count: {
              select: {
                favorites: true,
                downloads: true,
              },
            },
            favorites: {
              select: {
                id: true,
              },
              where: {
                profileId: params.profileId,
                deleted: false,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: params.sortDirection ?? "desc",
      },
      ...pagination,
    }),
  ]);

  return {
    total: favorites[0] ?? 0,
    data: favorites[1],
  };
};

export const createModelFavorite = async (profile: Profile, modelId: string) => {
  const currentFav = await db.favorite.findFirst({
    where: {
      modelId,
      profileId: profile.id,
    },
  });

  if (currentFav) {
    return await db.favorite.delete({
      where: {
        id: currentFav.id,
      },
    });
  } else {
    return await db.favorite.create({
      data: {
        modelId,
        profileId: profile.id,
      },
    });
  }
};
