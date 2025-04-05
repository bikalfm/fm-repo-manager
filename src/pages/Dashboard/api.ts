import { checkHealth as checkApiHealth } from '../../api'; // Import the core API function

    // Define an interface for the expected health response shape if needed,
    // or rely on the type from the core api function.
    // For simplicity here, we'll use 'any', but a specific type is better.
    interface DashboardHealthStatus {
      status: 'healthy' | 'unhealthy';
      // Add other potential fields from the health check response if known
    }

    /**
     * Fetches the health status specifically for the Dashboard.
     * This acts as a dedicated service function for this page.
     */
    export const fetchDashboardHealth = async (): Promise<DashboardHealthStatus> => {
      // This function calls the actual API function imported from the central API module.
      // Error handling could also be centralized here or handled in the component.
      // For now, it directly returns the promise from the core API call.
      return checkApiHealth();
    };

    // Add other Dashboard-specific API call functions here if needed in the future.
