/**
 * Folder Router
 * 
 * tRPC router for folder CRUD operations with workflow counts.
 * All procedures require authentication.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';

// ============================================================================
// Input Schemas (migrated from server/src/schemas/folder.ts)
// ============================================================================

const createFolderSchema = z.object({
    name: z.string().min(1).max(200),
    parentId: z.string().cuid().optional().nullable(),
});

const updateFolderSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    parentId: z.string().cuid().optional().nullable(),
});

// ============================================================================
// Folder Router
// ============================================================================

export const folderRouter = router({
    /**
     * List folders for the current user
     * Optionally filter by parentId (null for root folders)
     */
    list: protectedProcedure
        .input(
            z
                .object({
                    parentId: z.string().cuid().optional().nullable(),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            const where: { userId: string; parentId?: string | null } = {
                userId: ctx.user.id,
            };

            // If parentId is provided, filter by it; otherwise get root folders (parentId = null)
            if (input?.parentId !== undefined) {
                where.parentId = input.parentId;
            } else {
                where.parentId = null;
            }

            const folders = await ctx.prisma.folder.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: {
                        select: { workflows: true },
                    },
                },
            });

            // Format response with fileCount
            const formattedFolders = folders.map((folder) => ({
                id: folder.id,
                name: folder.name,
                parentId: folder.parentId,
                fileCount: folder._count.workflows,
                createdAt: folder.createdAt,
                updatedAt: folder.updatedAt,
            }));

            return { folders: formattedFolders };
        }),

    /**
     * Get a single folder by ID with workflow count
     */
    getById: protectedProcedure
        .input(z.object({ id: z.string().cuid() }))
        .query(async ({ ctx, input }) => {
            const folder = await ctx.prisma.folder.findFirst({
                where: {
                    id: input.id,
                    userId: ctx.user.id,
                },
                include: {
                    _count: {
                        select: { workflows: true },
                    },
                },
            });

            if (!folder) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Folder not found',
                });
            }

            return {
                folder: {
                    id: folder.id,
                    name: folder.name,
                    parentId: folder.parentId,
                    fileCount: folder._count.workflows,
                    createdAt: folder.createdAt,
                    updatedAt: folder.updatedAt,
                },
            };
        }),

    /**
     * Create a new folder
     */
    create: protectedProcedure
        .input(createFolderSchema)
        .mutation(async ({ ctx, input }) => {
            // If parentId provided, verify it belongs to user
            if (input.parentId) {
                const parentFolder = await ctx.prisma.folder.findFirst({
                    where: { id: input.parentId, userId: ctx.user.id },
                });
                if (!parentFolder) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Parent folder not found',
                    });
                }
            }

            const folder = await ctx.prisma.folder.create({
                data: {
                    name: input.name,
                    parentId: input.parentId || null,
                    userId: ctx.user.id,
                },
            });

            console.log('✅ Folder created:', folder.id);

            return {
                folder: {
                    id: folder.id,
                    name: folder.name,
                    parentId: folder.parentId,
                    fileCount: 0,
                    createdAt: folder.createdAt,
                    updatedAt: folder.updatedAt,
                },
            };
        }),

    /**
     * Update an existing folder
     */
    update: protectedProcedure
        .input(z.object({ id: z.string().cuid() }).merge(updateFolderSchema))
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;

            // Check ownership
            const existing = await ctx.prisma.folder.findFirst({
                where: { id, userId: ctx.user.id },
            });

            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Folder not found',
                });
            }

            const folder = await ctx.prisma.folder.update({
                where: { id },
                data,
                include: {
                    _count: {
                        select: { workflows: true },
                    },
                },
            });

            return {
                folder: {
                    id: folder.id,
                    name: folder.name,
                    parentId: folder.parentId,
                    fileCount: folder._count.workflows,
                    createdAt: folder.createdAt,
                    updatedAt: folder.updatedAt,
                },
            };
        }),

    /**
     * Delete a folder
     * Moves workflows and child folders to root
     */
    delete: protectedProcedure
        .input(z.object({ id: z.string().cuid() }))
        .mutation(async ({ ctx, input }) => {
            // Check ownership
            const existing = await ctx.prisma.folder.findFirst({
                where: { id: input.id, userId: ctx.user.id },
            });

            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Folder not found',
                });
            }

            // Move workflows in this folder to root (null folderId)
            await ctx.prisma.workflow.updateMany({
                where: { userId: ctx.user.id, folderId: input.id },
                data: { folderId: null },
            });

            // Move child folders to root
            await ctx.prisma.folder.updateMany({
                where: { userId: ctx.user.id, parentId: input.id },
                data: { parentId: null },
            });

            // Delete the folder
            await ctx.prisma.folder.delete({
                where: { id: input.id },
            });

            return { message: 'Folder deleted successfully' };
        }),
});
