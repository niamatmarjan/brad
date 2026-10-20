# Code Review 001: Outbound Webhook Dispatcher

**Author:** Priya Sharma (Dev B - Fulfillment)  
**Reviewer:** Devon Miller (Technical Lead)  
**Pull Request / Change ID:** PR-RD-004  
**Component:** `server/src/webhook.mjs`  

---

### Initial Submission (Revision 1)
- **Commit:** `4f8a12e`
- **Diff:** Added basic HTTP POST fetch for webhook delivery on request completion.

### Review Finding (Technical Lead) — Status: CHANGES_REQUESTED
> "Security standard requirement `REQ-104-C1` mandates that every outbound webhook payload MUST include an `X-RelayDesk-Signature` HMAC-SHA256 header using the shared tenant secret so receiving endpoints can verify payload integrity. Please implement HMAC calculation using `node:crypto` and add unit test verification."

---

### Correction (Revision 2)
- **Commit:** `8c21b9a`
- **Diff:**
  - Integrated `node:crypto` HMAC SHA-256 signing.
  - Added header `X-RelayDesk-Signature: sha256=<hex>`.
  - Added test suite `server/tests/webhook.test.mjs` verifying signature generation and validation.

### Final Decision — Status: APPROVED
> "Verified HMAC signature calculation and unit tests. Security requirement satisfied. Ready to merge."
