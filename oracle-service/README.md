# MSME Oracle Service

Node.js service that acts as an oracle for the MSME Credit Platform, providing off-chain data verification and on-chain attestations.

## Features

- GST revenue verification
- Bank statement verification
- KYC/identity verification
- Credit score attestation
- RESTful API for integration

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start service
npm start

# Development mode with auto-reload
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

### Oracle Information
```
GET /api/oracle/info
```

### Verify GST
```
POST /api/verify/gst
Content-Type: application/json

{
  "msmeId": "0x...",
  "gstNumber": "27AABCU9603R1ZM"
}
```

### Verify Bank Statements
```
POST /api/verify/bank
Content-Type: application/json

{
  "msmeId": "0x...",
  "accountNumber": "1234567890",
  "ifsc": "HDFC0001234"
}
```

### Verify KYC
```
POST /api/verify/kyc
Content-Type: application/json

{
  "msmeId": "0x...",
  "panNumber": "ABCDE1234F",
  "aadhaarNumber": "1234-5678-9012"
}
```

### Get Credit Score
```
POST /api/verify/credit-score
Content-Type: application/json

{
  "msmeId": "0x...",
  "bureauConsent": true
}
```

## Configuration

Environment variables:

- `ORACLE_PORT` - Service port (default: 3001)
- `RPC_URL` - Ethereum RPC endpoint
- `ORACLE_PRIVATE_KEY` - Oracle wallet private key
- `ATTESTATION_REGISTRY` - AttestationRegistry contract address

## Production Deployment

For production, integrate with:

1. **GST APIs**: Use GSP (GST Suvidha Provider) APIs
2. **Account Aggregator**: Integrate RBI-approved AAs
3. **KYC Services**: Use CKYC or eKYC providers
4. **Credit Bureaus**: Integrate CIBIL/Experian APIs

## Security

- Always use HTTPS in production
- Secure private keys with HSM or key management service
- Implement rate limiting
- Add authentication/authorization
- Log all verification requests for audit

## License

MIT
