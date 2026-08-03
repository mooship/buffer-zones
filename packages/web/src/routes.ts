import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("./routes/home.tsx"),
  route("api/ask", "./routes/api.ask.ts"),
] satisfies RouteConfig;
