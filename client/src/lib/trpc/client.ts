/**
 * tRPC React Client
 * 
 * Creates typed tRPC hooks for use in React components.
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from './routers/appRouter';

export const trpc = createTRPCReact<AppRouter>();
