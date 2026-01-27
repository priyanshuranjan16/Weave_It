/**
 * Workflow Router
 * 
 * tRPC router for workflow CRUD operations.
 * All procedures require authentication.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';

// ============================================================================
// Input Schemas (migrated from server/src/schemas/workflow.ts)
// ============================================================================

// Use z.any() for nodes and edges since they're stored as JSON in the database
// and React Flow has its own comprehensive types
const createWorkflowSchema = z.object({
    name: z.string().min(1).max(200).default('untitled'),
    folderId: z.string().cuid().optional().nullable(),
    nodes: z.array(z.any()).optional().default([]),
    edges: z.array(z.any()).optional().default([]),
});

const updateWorkflowSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    folderId: z.string().cuid().optional().nullable(),
    nodes: z.array(z.any()).optional(),
    edges: z.array(z.any()).optional(),
    thumbnail: z.string().optional(),
});

// ============================================================================
// Workflow Router
// ============================================================================

export const workflowRouter = router({
    /**
     * List workflows for the current user
     * Optionally filter by folderId
     */
    list: protectedProcedure
        .input(
            z
                .object({
                    folderId: z.string().cuid().optional().nullable(),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            const where: { userId: string; folderId?: string | null } = {
                userId: ctx.user.id,
            };

            // Handle folder filtering
            if (input?.folderId !== undefined) {
                where.folderId = input.folderId;
            }

            const workflows = await ctx.prisma.workflow.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    thumbnail: true,
                    folderId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            return { workflows };
        }),

    /**
     * Get a single workflow by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.string().cuid() }))
        .query(async ({ ctx, input }) => {
            const workflow = await ctx.prisma.workflow.findFirst({
                where: {
                    id: input.id,
                    userId: ctx.user.id,
                },
            });

            if (!workflow) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Workflow not found',
                });
            }

            return { workflow };
        }),

    /**
     * Create a new workflow
     */
    create: protectedProcedure
        .input(createWorkflowSchema)
        .mutation(async ({ ctx, input }) => {
            const workflow = await ctx.prisma.workflow.create({
                data: {
                    name: input.name,
                    nodes: input.nodes,
                    edges: input.edges,
                    folderId: input.folderId || null,
                    userId: ctx.user.id,
                },
            });

            console.log('✅ Workflow created:', workflow.id);

            return { workflow };
        }),

    /**
     * Update an existing workflow
     */
    update: protectedProcedure
        .input(
            z.object({ id: z.string().cuid() }).merge(updateWorkflowSchema)
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;

            // Check ownership
            const existing = await ctx.prisma.workflow.findFirst({
                where: { id, userId: ctx.user.id },
            });

            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Workflow not found',
                });
            }

            const workflow = await ctx.prisma.workflow.update({
                where: { id },
                data,
            });

            return { workflow };
        }),

    /**
     * Delete a workflow
     */
    delete: protectedProcedure
        .input(z.object({ id: z.string().cuid() }))
        .mutation(async ({ ctx, input }) => {
            // Check ownership
            const existing = await ctx.prisma.workflow.findFirst({
                where: { id: input.id, userId: ctx.user.id },
            });

            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Workflow not found',
                });
            }

            await ctx.prisma.workflow.delete({
                where: { id: input.id },
            });

            return { message: 'Workflow deleted successfully' };
        }),
});
