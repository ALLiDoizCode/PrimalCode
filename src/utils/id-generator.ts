/**
 * Utility for generating consistent, unique IDs across the application
 */
export class IdGenerator {
  /**
   * Generate a unique ID with a prefix and timestamp
   * @param prefix - The prefix for the ID (e.g., 'food', 'weather', 'shelter')
   * @returns A unique ID string
   */
  public static generateId(prefix: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${randomSuffix}`;
  }

  /**
   * Generate a transaction ID for token operations
   * @returns A unique transaction ID
   */
  public static generateTransactionId(): string {
    return this.generateId('tx');
  }

  /**
   * Generate a modification ID for environmental changes
   * @param modificationType - The type of modification
   * @returns A unique modification ID
   */
  public static generateModificationId(modificationType: string): string {
    return this.generateId(modificationType);
  }
}