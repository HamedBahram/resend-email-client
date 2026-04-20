import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma migrate` always uses a direct (non-pooled) connection.
    // `prisma generate` doesn't need this, so we allow it to be empty.
    url: process.env.DIRECT_URL ?? "",
  },
})
