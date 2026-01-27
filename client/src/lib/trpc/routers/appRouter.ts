/**
 * App Router
 * 
 * Main tRPC router that combines all sub-routers.
 */

import { router } from '../trpc';
import { workflowRouter } from './workflowRouter';
import { folderRouter } from './folderRouter';
import { llmRouter } from './llmRouter';
import { historyRouter } from './historyRouter';

export const appRouter = router({
    workflow: workflowRouter,
    folder: folderRouter,
    llm: llmRouter,
    history: historyRouter,
});

export type AppRouter = typeof appRouter;

