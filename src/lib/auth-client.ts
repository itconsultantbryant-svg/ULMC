"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      // Let the login form handle the redirect so it retains the requested
      // workspace destination in its `next` query parameter.
      onTwoFactorRedirect: () => {},
    }),
  ],
});
