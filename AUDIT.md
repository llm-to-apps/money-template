# Dependency Audit Policy

Money tracks npm audit output as part of routine maintenance, but dependency
fixes must stay deliberate.

## Routine Checks

- Run `npm run audit:check` before dependency update work and release hardening.
- Record unresolved vulnerabilities in the change summary when they remain.
- Do not run `npm audit fix --force` as part of unrelated feature work.

## Fix Policy

- Patch direct dependencies first when a non-breaking update is available.
- Use forced major updates only in a dedicated dependency task with full checks:
  `npm run format:check`, `npm run test:coverage`, `npm run lint`, `npm run
typecheck`, and `npm run build`.
- Review install-script warnings before approving package scripts.
- Prisma, Sharp, and platform binary packages may require install scripts; approve
  them only when the package is already an intentional dependency.

## Severity

- Critical or high vulnerabilities should block release unless they are proven
  unreachable in this app.
- Moderate vulnerabilities should be reviewed and scheduled.
- Low vulnerabilities should be batched into normal dependency maintenance.
