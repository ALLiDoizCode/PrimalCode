export type WeatherCondition = 
  | 'sunny'
  | 'rainy'
  | 'cloudy'
  | 'stormy'
  | 'foggy'
  | 'snowy';

export type ResourceType = 
  | 'food'
  | 'water'
  | 'shelter'
  | 'nesting_material'
  | 'territory_marker';

export interface EnvironmentalStructure {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  properties: Record<string, unknown>;
  influence_radius: number;
  last_modified: Date;
}

export interface ResourcePool {
  id: string;
  type: ResourceType;
  position: {
    x: number;
    y: number;
  };
  quantity: number; // 0-100
  quality: number; // 0-1 scale
  regeneration_rate: number; // units per time interval
  last_accessed: Date;
}

export interface PrimalTokenPoint {
  id: string;
  position: {
    x: number;
    y: number;
  };
  strength: number; // 0-1 scale
  type: string;
  owner_id?: string;
  created_at: Date;
  expires_at?: Date;
}

export interface WeatherState {
  current_condition: WeatherCondition;
  temperature: number; // Celsius
  humidity: number; // 0-100 percentage
  wind_speed: number; // km/h
  visibility: number; // 0-1 scale
  last_updated: Date;
}

export interface Environment {
  route_id: string;
  structures: EnvironmentalStructure[];
  resources: ResourcePool[];
  weather_state: WeatherState;
  influence_points: PrimalTokenPoint[];
  ecosystem_balance: number; // 0-1 scale
  last_modified: Date;
}

export interface EnvironmentUpdate {
  route_id: string;
  changes: {
    structures?: Partial<EnvironmentalStructure>[];
    resources?: Partial<ResourcePool>[];
    weather?: Partial<WeatherState>;
    influence_points?: Partial<PrimalTokenPoint>[];
    ecosystem_balance?: number;
  };
  timestamp: Date;
}