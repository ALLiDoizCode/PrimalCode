# Deployment Architecture

## Deployment Strategy

**MCP Server Deployment:**
- **Platform:** AWS Lambda + API Gateway (serverless)
- **Build Command:** `npm run build:mcp`
- **Output Directory:** `dist/`
- **CDN/Edge:** CloudFront for global distribution

**AO Process Deployment:**
- **Platform:** Arweave Network via AO CLI
- **Build Command:** `npm run build:ao`
- **Deployment Method:** Automated via CI/CD pipeline

## CI/CD Pipeline
```yaml
name: Deploy PrimalCode

on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  deploy-mcp:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy MCP Server
        run: |
          npm run build:mcp
          aws lambda update-function-code \
            --function-name primalcode-mcp \
            --zip-file fileb://dist/mcp-server.zip

  deploy-ao:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy AO Processes
        run: |
          npm run deploy:ao:${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
```

## Environments

| Environment | MCP Server URL | AO Network | Purpose |
|-------------|---------------|------------|---------|
| Development | http://localhost:3000 | AO Testnet | Local development |
| Staging | https://staging-mcp.primalcode.ai | AO Testnet | Pre-production testing |
| Production | https://mcp.primalcode.ai | AO Mainnet | Live environment |
