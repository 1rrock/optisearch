import { handlers } from "@/auth"

// Re-export the Auth.js GET and POST handlers for the [...nextauth] catch-all
// route. This is the standard App Router integration for Auth.js v5.
export const { GET, POST } = handlers
