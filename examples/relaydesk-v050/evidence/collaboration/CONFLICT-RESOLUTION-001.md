# Collaboration Exercise 5: Controlled Conflicting Edit & Safe Resolution

**Date:** 2026-10-20  
**Branches Involved:** `feature-intake-manifest` (Dev A) vs `feature-fulfillment-manifest` (Dev B)  
**Target:** `main`  
**Conflicting File:** `coordination/integration_manifest.json`  

### Sequence of Events
1. Base commit `d534465` established `integration_manifest.json`.
2. Developer A in `worktrees/dev-intake` branched `feature-intake-manifest` and added `"module-a-intake-v1.0"`. (Commit `b98738a`)
3. Developer B in `worktrees/dev-fulfillment` branched `feature-fulfillment-manifest` and concurrently added `"module-b-fulfillment-v1.0"` at the identical array index. (Commit `e0ca353`)
4. Fast-forward merge of `feature-intake-manifest` succeeded into `main`.
5. Merging `feature-fulfillment-manifest` into `main` resulted in:
   ```text
   CONFLICT (content): Merge conflict in coordination/integration_manifest.json
   Automatic merge failed; fix conflicts and then commit the result.
   ```
6. **Technical Lead Resolution:** Both modules were integrated into the JSON array:
   ```json
   {
     "project": "RelayDesk",
     "version": "0.5.0",
     "modules": [
       "foundation",
       "module-a-intake-v1.0",
       "module-b-fulfillment-v1.0"
     ]
   }
   ```
7. Resolved commit recorded at `a8a757d`.
