import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(
  () => import("../build/server/index.js"),
  import.meta.env?.MODE ?? "production",
);

export default {
  fetch(request: Request) {
    return requestHandler(request);
  },
} satisfies ExportedHandler;
