# ADR-005: Pluggable Notification Delivery Adapter

**Status**: ACCEPTED  
**Date**: 2026-10-24  
**Author**: Ethan Brooks (Technical Lead)  

## Context
When change requests require approval, get rejected, or breach SLAs, stakeholders must receive timely notifications. In test and CI environments, live SMTP or webhook services are unavailable or flaky.

## Decision
We define a clean `NotificationAdapter` interface with two implementations:
1. `MockNotificationAdapter`: Stores sent notifications in an in-memory queue with delivery timestamps and failure simulators for unit and integration testing.
2. `WebhookNotificationAdapter`: Issues asynchronous HTTP POST notifications with exponential backoff retries.
All notification dispatches record outcomes in a queryable `NotificationLog`.
