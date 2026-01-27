/**
 * History Router
 * 
 * Handles workflow run history CRUD operations
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const historyRouter = router({
    // Create a new workflow run
    createRun: protectedProcedure
        .input(z.object({
            workflowId: z.string(),
            runScope: z.enum(['full', 'selected', 'single']),
            nodeCount: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const run = await ctx.prisma.workflowRun.create({
                data: {
                    workflowId: input.workflowId,
                    runScope: input.runScope,
                    status: 'running',
                    nodeCount: input.nodeCount,
                },
            });
            return { run };
        }),

    // Update a workflow run (complete/fail)
    updateRun: protectedProcedure
        .input(z.object({
            runId: z.string(),
            status: z.enum(['running', 'completed', 'failed', 'partial']),
            completedAt: z.date().optional(),
            duration: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const run = await ctx.prisma.workflowRun.update({
                where: { id: input.runId },
                data: {
                    status: input.status,
                    completedAt: input.completedAt || new Date(),
                    duration: input.duration,
                },
            });
            return { run };
        }),

    // Add a node execution to a run
    addNodeRun: protectedProcedure
        .input(z.object({
            workflowRunId: z.string(),
            nodeId: z.string(),
            nodeName: z.string(),
            nodeType: z.string(),
            inputData: z.record(z.string(), z.unknown()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const nodeRun = await ctx.prisma.nodeRun.create({
                data: {
                    workflowRunId: input.workflowRunId,
                    nodeId: input.nodeId,
                    nodeName: input.nodeName,
                    nodeType: input.nodeType,
                    status: 'running',
                    inputData: input.inputData as object || undefined,
                },
            });
            return { nodeRun };
        }),

    // Update a node run (complete/fail)
    updateNodeRun: protectedProcedure
        .input(z.object({
            nodeRunId: z.string(),
            status: z.enum(['running', 'completed', 'failed']),
            completedAt: z.date().optional(),
            duration: z.number().optional(),
            outputData: z.record(z.string(), z.unknown()).optional(),
            error: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const nodeRun = await ctx.prisma.nodeRun.update({
                where: { id: input.nodeRunId },
                data: {
                    status: input.status,
                    completedAt: input.completedAt || new Date(),
                    duration: input.duration,
                    outputData: input.outputData as object || undefined,
                    error: input.error,
                },
            });
            return { nodeRun };
        }),

    // Get all runs for a workflow
    getRunsByWorkflow: protectedProcedure
        .input(z.object({
            workflowId: z.string(),
            limit: z.number().optional().default(50),
        }))
        .query(async ({ ctx, input }) => {
            const runs = await ctx.prisma.workflowRun.findMany({
                where: { workflowId: input.workflowId },
                orderBy: { startedAt: 'desc' },
                take: input.limit,
                include: {
                    nodeRuns: {
                        orderBy: { startedAt: 'asc' },
                    },
                },
            });
            return { runs };
        }),

    // Get a single run with all node executions
    getRunDetails: protectedProcedure
        .input(z.object({
            runId: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const run = await ctx.prisma.workflowRun.findUnique({
                where: { id: input.runId },
                include: {
                    nodeRuns: {
                        orderBy: { startedAt: 'asc' },
                    },
                },
            });
            return { run };
        }),

    // Delete old runs (optional cleanup)
    deleteRun: protectedProcedure
        .input(z.object({
            runId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.workflowRun.delete({
                where: { id: input.runId },
            });
            return { success: true };
        }),

    // Clear all runs for a workflow
    clearWorkflowHistory: protectedProcedure
        .input(z.object({
            workflowId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.workflowRun.deleteMany({
                where: { workflowId: input.workflowId },
            });
            return { success: true };
        }),
});
