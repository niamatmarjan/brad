import { RiskLevels, ChangeCategories } from './types.mjs';

export class BusinessHoursCalculator {
  static getRequiredHours(riskLevel, category) {
    if (category === ChangeCategories.EMERGENCY || riskLevel === RiskLevels.EMERGENCY) {
      return 2;
    }
    switch (riskLevel) {
      case RiskLevels.CRITICAL:
        return 4;
      case RiskLevels.HIGH:
        return 8;
      case RiskLevels.MEDIUM:
        return 24;
      case RiskLevels.LOW:
      default:
        return 48;
    }
  }

  static isBusinessDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6; // Sunday=0, Saturday=6
  }

  static computeDeadline(startDate = new Date(), riskLevel = RiskLevels.LOW, category = ChangeCategories.APPLICATION) {
    const requiredHours = this.getRequiredHours(riskLevel, category);

    // Emergency changes count continuously 24/7
    if (category === ChangeCategories.EMERGENCY || riskLevel === RiskLevels.EMERGENCY) {
      return new Date(startDate.getTime() + requiredHours * 3600 * 1000);
    }

    // Standard business hours logic: 09:00 to 17:00 (8 hrs per business day)
    let current = new Date(startDate.getTime());
    let remainingHours = requiredHours;

    while (remainingHours > 0) {
      // Advance to next hour
      current.setTime(current.getTime() + 3600 * 1000);

      // Check if current is in business hours (Mon-Fri, 9am - 5pm)
      const hour = current.getHours();
      if (this.isBusinessDay(current) && hour >= 9 && hour < 17) {
        remainingHours -= 1;
      }
    }

    return current;
  }

  static isBreached(deadline, referenceTime = new Date()) {
    if (!deadline) return false;
    const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
    const refDate = typeof referenceTime === 'string' ? new Date(referenceTime) : referenceTime;
    return refDate.getTime() > deadlineDate.getTime();
  }
}
