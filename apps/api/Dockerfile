FROM node:20-alpine AS base
WORKDIR /workspace

COPY package.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN npm install
RUN npm run prisma:generate --workspace @sugarprecision/api
RUN npm run build --workspace @sugarprecision/api

FROM node:20-alpine AS runtime
WORKDIR /workspace

COPY --from=base /workspace/package.json ./package.json
COPY --from=base /workspace/node_modules ./node_modules
COPY --from=base /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=base /workspace/apps/api/dist ./apps/api/dist
COPY --from=base /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=base /workspace/packages/shared-types ./packages/shared-types

ENV NODE_ENV=production
WORKDIR /workspace/apps/api
EXPOSE 3000
CMD ["node", "dist/apps/api/src/main.js"]
