# Security Policy

## Reporting a vulnerability
Please do not publish secrets, personal data, or exploitable vulnerability details in a public issue. Contact the repository owner privately through GitHub's available security reporting channel.

## Supported deployment
Only the currently maintained deployment should be treated as supported. Keep Node.js on a supported LTS release and apply reviewed dependency updates promptly.

## Before production
- Enable GitHub secret scanning and push protection where available.
- Enable Dependabot alerts and security updates.
- Require review for changes to authentication, payments, order totals, inventory, and admin authorization.
- Store production secrets only in the hosting provider's secret manager.
- Never commit .env files, API keys, database URLs, payment secrets, or customer data.
- Do not run production migrations until the generated SQL has been reviewed and a backup/rollback plan exists.
- Do not accept real orders or payments until the security review and end-to-end tests pass.
