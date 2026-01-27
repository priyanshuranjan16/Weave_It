/**
 * tRPC Vanilla Client
 * 
 * A standalone tRPC client for use outside of React components.
 * This is used by Zustand stores and other non-React code.
 */

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from './routers/appRouter';

function getBaseUrl() {
    if (typeof window !== 'undefined') {
        // Browser should use relative URL
        return '';
    }
    // SSR should use localhost
    return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Vanilla tRPC client for non-React contexts
 * 
 * Usage:
 * ```ts
 * import { trpcVanilla } from '@/lib/trpc/vanilla';
 * 
 * const workflows = await trpcVanilla.workflow.list.query({ folderId: null });
 * ```
 */
export const trpcVanilla = createTRPCClient<AppRouter>({
    links: [
        httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
            transformer: superjson,
        }),
    ],
});

export default trpcVanilla;
