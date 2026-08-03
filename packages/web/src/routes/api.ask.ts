import type { ActionFunctionArgs } from "react-router";
import { handleAskAiRequest } from "../server/askAi.server";
import { envContext } from "../server/envContext";

/** Resource route backing `@stratum/react`'s `useAskAi` hook: `POST /api/ask`. */
export async function action({ request, context }: ActionFunctionArgs) {
  return handleAskAiRequest(request, context.get(envContext));
}
