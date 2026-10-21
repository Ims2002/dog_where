"use client";

import { createAuthClient } from "better-auth/react";

/** Cliente de Better Auth para componentes de cliente (mismo dominio: sin baseURL). */
export const authClient = createAuthClient();
