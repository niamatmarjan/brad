---
id: "1.1"
epic: 1
title: "Implement a configurable in-memory rate limiter"
status: "done"
---

# Story 1.1: Implement a configurable in-memory rate limiter

## Description
As an API gateway or service middleware,
I want to rate-limit incoming client requests using an in-memory tracker,
So that abusive traffic is rejected and services remain stable.

## Acceptance Criteria
1. Configurable request limit and time window
2. Requests are tracked by client key
3. Requests over the threshold are rejected
4. Expired windows reset correctly
5. Tests cover accepted requests, rejected requests, expiration, and isolated clients
6. No unrelated application changes
