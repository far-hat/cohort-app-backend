import { SocketService } from "./socketService";

class ServiceLocator {
    private static instance: ServiceLocator;
    private socketService: SocketService | null = null;
    
    static getInstance(): ServiceLocator {
        if (!ServiceLocator.instance) {
            ServiceLocator.instance = new ServiceLocator();
        }
        return ServiceLocator.instance;
    }
    
    setSocketService(service: SocketService) {
        this.socketService = service;
    }
    
    getSocketService(): SocketService {
        if (!this.socketService) {
            throw new Error("SocketService not set");
        }
        return this.socketService;
    }
}

export default ServiceLocator.getInstance();