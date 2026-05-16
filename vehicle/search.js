/**
 * SearchManager - Handles filtering and searching through license plate records
 */
class SearchManager {
  /**
   * Search records by owner name with case-insensitive filtering
   * Admin-only feature - returns all records for non-admin users
   * @param {string} query - The search query
   * @param {Array} records - Array of license plate records
   * @param {boolean} isAdmin - Whether the current user is an admin
   * @returns {Array} - Filtered array of matching records
   */
  searchByName(query, records, isAdmin = false) {
    // Non-admin users cannot search by name - return all records
    if (!isAdmin) {
      return records;
    }

    // Handle empty search queries - return all records
    if (!query || query.trim() === "") {
      return records;
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Filter records where owner name contains the search text (case-insensitive)
    return records.filter((record) => {
      return (
        record.ownerName &&
        record.ownerName.toLowerCase().includes(normalizedQuery)
      );
    });
  }

  /**
   * Search records by plate number with case-insensitive filtering
   * @param {string} query - The search query
   * @param {Array} records - Array of license plate records
   * @returns {Array} - Filtered array of matching records
   */
  searchByPlate(query, records) {
    // Handle empty search queries - return all records
    if (!query || query.trim() === "") {
      return records;
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Filter records where plate number contains the search text (case-insensitive)
    return records.filter((record) => {
      return (
        record.plateNumber &&
        record.plateNumber.toLowerCase().includes(normalizedQuery)
      );
    });
  }
}
