/**
 * tRPC Server Initialization
 * 
 * Sets up tRPC with context containing userId from Clerk and Prisma client.
 * Provides public and protected procedures.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { auth } from '@clerk/nextjs/server';
import superjson from 'superjson';
import prisma from '@/lib/db';

// User type matching Prisma schema
interface User {
    id: string;
    clerkUserId: string;
    email: string;
    name: string;
    avatar: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Context type for tRPC procedures
 */
export interface Context {
    userId: string | null;
    prisma: typeof prisma;
    user?: User;
}

/**
 * Create tRPC context from request
 * Extracts userId from Clerk session
 */
export const createTRPCContext = async (): Promise<Context> => {
    const { userId } = await auth();
    return {
        userId,
        prisma,
    };
};

/**
 * Initialize tRPC with context and superjson transformer
 */
const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape }) {
        return shape;
    },
});

/**
 * Router factory
 */
export const router = t.router;

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authenticated user
 * 
 * Checks for Clerk userId and fetches User from database.
 * Auto-creates user if not found (for development without webhooks).
 * Adds user to context for downstream procedures.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.userId) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
        });
    }

    // Find user by Clerk ID
    let user = await ctx.prisma.user.findUnique({
        where: { clerkUserId: ctx.userId },
    });

    // Auto-create user if not found (handles case when webhooks aren't set up)
    if (!user) {
        // Import Clerk to get user details
        const { clerkClient } = await import('@clerk/nextjs/server');
        
        try {
            const clerk = await clerkClient();
            const clerkUser = await clerk.users.getUser(ctx.userId);
            const primaryEmail = clerkUser.emailAddresses.find(
                e => e.id === clerkUser.primaryEmailAddressId
            );
            const email = primaryEmail?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;
            
            if (!email) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'No email found for user',
                });
            }

            const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0];

            // Create user in database
            user = await ctx.prisma.user.create({
                data: {
                    clerkUserId: ctx.userId,
                    email,
                    name,
                    avatar: clerkUser.imageUrl || null,
                },
            });

            console.log('✅ Auto-created user:', email);
        } catch (error) {
            console.error('❌ Failed to auto-create user:', error);
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'User not found in database. Please sign out and sign in again.',
            });
        }
    }

    return next({
        ctx: {
            ...ctx,
            user,
        },
    });
});

export type { User };
