# API Services Architecture

This directory contains the layered API architecture for the client application.

## Structure

### 1. HTTP Layer (`http.js`)
- **Purpose**: Low-level HTTP communication with the server
- **Responsibilities**: 
  - Axios configuration and HTTP requests
  - Error handling at HTTP level
  - Pure HTTP operations without business logic

### 2. API Layer (`api.js`)
- **Purpose**: High-level business logic and caching
- **Responsibilities**:
  - Business logic and data processing
  - In-memory caching (solutions cache)
  - Error handling with user-friendly messages
  - Future: can switch between HTTP and local storage

### 3. Data Providers (`data_providers.js`)
- **Purpose**: Future implementation for switching data sources
- **Responsibilities**:
  - Provider factory for different data sources
  - Local storage implementation (future)
  - Configuration for offline/online modes

## Usage

### Current Usage (Components)
```javascript
import { worldsAPI } from '../services/api'

// Use the API methods
const worlds = await worldsAPI.getWorlds()
const solutions = await worldsAPI.getWorldSolutions(worldId)
```

### Direct API Service Usage (Alternative)
```javascript
import { apiService } from '../services/api'

// Use the service directly
const worlds = await apiService.getWorlds()
const solutions = await apiService.getWorldSolutions(worldId)

// Clear cache when needed
apiService.clearSolutionsCache(worldId)
```

## Future Enhancements

### Local Storage Integration
When local storage is implemented, you can switch providers:

```javascript
import { getDataProvider } from '../services/data_providers'
import { apiService } from '../services/api'

// Switch to local storage
const localProvider = getDataProvider('local')
apiService.setDataProvider(localProvider)

// Switch back to HTTP
const httpProvider = getDataProvider('http')
apiService.setDataProvider(httpProvider)
```

### Configuration Options
- Offline mode support
- Automatic sync between local and server data
- Cache management strategies
- Request retry logic

## Benefits

1. **Separation of Concerns**: HTTP logic separated from business logic
2. **Future-Proof**: Easy to add local storage without changing components
3. **Testability**: Each layer can be tested independently
4. **Maintainability**: Clear structure for future enhancements
5. **Caching**: Centralized caching logic in the API layer
6. **Backward Compatibility**: Existing components continue to work