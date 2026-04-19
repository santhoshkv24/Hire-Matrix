# Style and conventions
- Backend uses CommonJS (`require`/`module.exports`), double quotes, semicolons, and 2-space indentation.
- Express routes are organized by resource with `authenticate` and `authorize` middlewares.
- Mongoose models use camelCase fields and schema-based enums from config constants.
- Frontend uses ESM imports, JSX, React hooks, and Tailwind utility classes.
- ESLint config is active in frontend with React hooks + react-refresh rules.
- Frontend code typically uses single quotes and no semicolons.