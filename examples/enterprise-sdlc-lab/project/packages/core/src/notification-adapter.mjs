import { randomUUID } from 'node:crypto';

export class MockNotificationAdapter {
  constructor() {
    this.sentLog = [];
    this.failureRate = 0; // 0 to 1 for fault injection
  }

  setFailureRate(rate) {
    this.failureRate = rate;
  }

  async send({ tenantId, recipientId, subject, message, eventType }) {
    if (!tenantId || !recipientId || !subject) {
      throw new Error('NOTIFICATION_PARAM_ERROR: tenantId, recipientId, and subject are required');
    }

    const notificationId = randomUUID();
    const timestamp = new Date().toISOString();

    // Simulated failure for fault injection
    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      const failedRecord = {
        id: notificationId,
        tenantId,
        recipientId,
        subject,
        message,
        eventType,
        status: 'FAILED',
        error: 'SIMULATED_DELIVERY_FAILURE',
        attempts: 1,
        timestamp
      };
      this.sentLog.push(failedRecord);
      throw new Error('SIMULATED_DELIVERY_FAILURE: Delivery endpoint unreachable');
    }

    const record = {
      id: notificationId,
      tenantId,
      recipientId,
      subject,
      message,
      eventType,
      status: 'DELIVERED',
      attempts: 1,
      timestamp
    };

    this.sentLog.push(record);
    return record;
  }

  async sendWithRetry(payload, maxRetries = 3) {
    let attempts = 0;
    while (attempts < maxRetries) {
      attempts++;
      try {
        return await this.send(payload);
      } catch (err) {
        if (attempts >= maxRetries) {
          throw new Error(`NOTIFICATION_RETRY_EXHAUSTED: Failed after ${maxRetries} attempts (${err.message})`);
        }
      }
    }
  }

  getDeliveries(tenantId) {
    return this.sentLog.filter(x => x.tenantId === tenantId);
  }

  clear() {
    this.sentLog = [];
  }
}
