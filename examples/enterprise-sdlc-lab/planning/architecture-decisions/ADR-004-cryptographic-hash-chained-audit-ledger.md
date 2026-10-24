# ADR-004: Cryptographic Hash-Chained Tamper-Evident Audit Ledger

**Status**: ACCEPTED  
**Date**: 2026-10-24  
**Author**: Marcus Lee (Solution Architect)  
**Security Sign-Off**: Isabel Torres (Security Engineer)  

## Context
Enterprise compliance (SOC2, ISO 27001) mandates that records of change approvals cannot be altered, reordered, or deleted retroactively by any party, including database administrators.

## Decision
We implement a **SHA-256 Hash-Chained Audit Ledger**:
- Every audit record stores: `id`, `sequence`, `timestamp`, `tenantId`, `actorId`, `action`, `entityId`, `payloadHash`, `previousHash`, `recordHash`.
- Formula:
  $$\text{recordHash} = \text{SHA-256}(\text{sequence} + \text{timestamp} + \text{tenantId} + \text{actorId} + \text{action} + \text{entityId} + \text{payloadHash} + \text{previousHash})$$
- The ledger is append-only.
- A built-in validation procedure `verifyChainIntegrity(tenantId)` validates hashes across all records sequentially. Any out-of-band edit breaks subsequent hashes.
